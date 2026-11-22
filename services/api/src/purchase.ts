import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Pool, PoolClient } from "pg";
import { cardSchema, createOrderSchema, idempotencyKeySchema, orderSchema, receiptSchema, sessionSchema, stellarTestnetUsdc, walletIdSchema } from "@tilcai-wallet/api-contracts";
import { orderRequestDigest } from "./order-digest.js";

class ApiFailure extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}
type Identity = { tenant_id: string; network: string; session_id: string; actor_id: string; scopes: string[] };
type Handler = (db: PoolClient, identity: Identity, request: FastifyRequest) => Promise<{ status?: number; body: unknown }>;
const price = 5_000_000n;
const recipient = "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
const notFound = () => { throw new ApiFailure(404, "not_found"); };
const parseId = (value: unknown) => { const id = walletIdSchema.safeParse(value); if (!id.success) throw new ApiFailure(400, "invalid_request"); return id.data; };
function param(request: FastifyRequest, key: string) { return parseId((request.params as Record<string, unknown>)[key]); }

export function registerPurchase(app: FastifyInstance, pool?: Pool) {
  function route(method: "GET" | "POST", url: string, scope: string, handler: Handler) {
    app.route({ method, url, handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(request.headers.authorization ?? "");
      if (!match) return reply.code(401).send({ error: { code: "unauthenticated" } });
      if (!pool) return reply.code(503).send({ error: { code: "service_unavailable" } });
      let db: PoolClient | undefined;
      try {
        db = await pool.connect();
        await db.query("BEGIN");
        const auth = await db.query<Identity>("SELECT * FROM wallet_private.verify_credential($1)", [createHash("sha256").update(match[1]!).digest()]);
        const identity = auth.rows[0];
        if (!identity) throw new ApiFailure(401, "unauthenticated");
        if (!identity.scopes.includes(scope)) throw new ApiFailure(403, "forbidden");
        // verify_credential sets this locally; repeat explicitly in the same transaction.
        await db.query("SELECT set_config('wallet.tenant_id', $1, true)", [identity.tenant_id]);
        const result = await handler(db, identity, request);
        await db.query("COMMIT");
        return reply.code(result.status ?? 200).send(result.body);
      } catch (error) {
        if (db) await db.query("ROLLBACK").catch(() => undefined);
        const failure = error instanceof ApiFailure ? error : new ApiFailure(503, "service_unavailable");
        return reply.code(failure.status).send({ error: { code: failure.code } });
      } finally { db?.release(); }
    }});
  }
  route("GET", "/v1/sessions/:sessionId", "sessions:read", async (db, id, request) => {
    if (param(request, "sessionId") !== id.session_id) notFound();
    const result = await db.query("SELECT s.session_id,s.agent_name,s.display_name,c.card_id FROM wallet_private.sessions s JOIN wallet_private.cards c USING (tenant_id,network,session_id) WHERE s.tenant_id=$1 AND s.network=$2 AND s.session_id=$3 ORDER BY c.card_id LIMIT 1", [id.tenant_id,id.network,id.session_id]);
    const row = result.rows[0]; if (!row) notFound();
    return { body: sessionSchema.parse({ mode:"fixture", sessionId:row.session_id, cardId:row.card_id, agentName:row.agent_name, name:row.display_name, status:"active" }) };
  });
  route("GET", "/v1/cards/:cardId", "cards:read", async (db,id,request) => {
    const card = await getCard(db,id,param(request,"cardId"),false);
    const held = await db.query("SELECT COALESCE(sum(h.amount),0)::text AS amount FROM wallet_private.holds h JOIN wallet_private.orders o USING(tenant_id,network,order_id) WHERE o.tenant_id=$1 AND o.network=$2 AND o.card_id=$3 AND h.released_at IS NULL", [id.tenant_id,id.network,card.card_id]);
    return { body: cardView(card, BigInt(held.rows[0].amount)) };
  });
  route("POST", "/v1/orders", "orders:write", async (db,id,request) => {
    const parsed = createOrderSchema.safeParse(request.body); const key = idempotencyKeySchema.safeParse(request.headers["idempotency-key"]);
    if (!parsed.success || !key.success) throw new ApiFailure(400,"invalid_request");
    const order = parsed.data; const { digest } = orderRequestDigest(order);
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [JSON.stringify([id.tenant_id,id.network,id.session_id,key.data])]);
    const prior = await db.query("SELECT i.request_hash, o.*, r.receipt_id FROM wallet_private.idempotency i JOIN wallet_private.orders o USING(tenant_id, network, order_id) LEFT JOIN wallet_private.receipts r USING(tenant_id, network, order_id) WHERE i.tenant_id=$1 AND i.network=$2 AND i.session_id=$3 AND i.operation='create_order' AND i.key=$4", [id.tenant_id,id.network,id.session_id,key.data]);
    if (prior.rows[0]) {
      const previous = prior.rows[0];
      if (!timingSafeEqual(previous.request_hash, digest)) throw new ApiFailure(409,"idempotency_conflict");
      return { body: orderView(previous) };
    }
    if (order.offerId !== "test-report" || BigInt(order.maxAmountMinor) < price) throw new ApiFailure(409,"limit_exceeded");
    const card = await getCard(db,id,order.cardId,true);
    if (card.asset_id !== stellarTestnetUsdc.contractId || card.recipient !== recipient) throw new ApiFailure(503,"service_unavailable");
    const held = await db.query("SELECT COALESCE(sum(h.amount),0)::text AS amount FROM wallet_private.holds h JOIN wallet_private.orders o USING(tenant_id,network,order_id) WHERE o.tenant_id=$1 AND o.network=$2 AND o.card_id=$3 AND h.released_at IS NULL", [id.tenant_id,id.network,card.card_id]);
    const capacity = BigInt(card.total_limit_minor) - BigInt(card.spent_minor) - BigInt(held.rows[0].amount);
    const balance = BigInt(card.balance_minor) - BigInt(held.rows[0].amount);
    if (price > BigInt(card.payment_limit_minor) || price > capacity || price > balance) throw new ApiFailure(409,"limit_exceeded");
    const orderId = randomUUID(), attemptId = randomUUID(), eventId = randomUUID(), receiptId = randomUUID();
    const args = [id.tenant_id,id.network,orderId,order.cardId,id.session_id,order.offerId,price.toString()];
    const created = await db.query("INSERT INTO wallet_private.orders (tenant_id,network,order_id,card_id,session_id,offer_id,amount) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",args);
    await db.query("INSERT INTO wallet_private.holds (tenant_id,network,order_id,amount) VALUES ($1,$2,$3,$4)",[id.tenant_id,id.network,orderId,price.toString()]);
    await db.query("INSERT INTO wallet_private.attempts (tenant_id,network,order_id,attempt_id) VALUES ($1,$2,$3,$4)",[id.tenant_id,id.network,orderId,attemptId]);
    await db.query("INSERT INTO wallet_private.outbox (tenant_id,network,event_id,order_id,kind) VALUES ($1,$2,$3,$4,'payment')",[id.tenant_id,id.network,eventId,orderId]);
    await db.query("INSERT INTO wallet_private.receipts (tenant_id,network,receipt_id,order_id) VALUES ($1,$2,$3,$4)",[id.tenant_id,id.network,receiptId,orderId]);
    await db.query("INSERT INTO wallet_private.idempotency (tenant_id,network,session_id,operation,key,request_hash,order_id) VALUES ($1,$2,$3,'create_order',$4,$5,$6)",[id.tenant_id,id.network,id.session_id,key.data,digest,orderId]);
    return { status:202, body:orderView({ ...created.rows[0], receipt_id: receiptId }) };
  });
  route("GET", "/v1/orders/:orderId", "orders:read", async (db,id,request) => {
    const result = await db.query("SELECT o.*, r.receipt_id FROM wallet_private.orders o LEFT JOIN wallet_private.receipts r USING(tenant_id,network,order_id) WHERE o.tenant_id=$1 AND o.network=$2 AND o.session_id=$3 AND o.order_id=$4",[id.tenant_id,id.network,id.session_id,param(request,"orderId")]);
    if (!result.rows[0]) notFound(); return {body:orderView(result.rows[0])};
  });
  route("GET", "/v1/receipts/:receiptId", "receipts:read", async (db,id,request) => {
    const result = await db.query("SELECT r.receipt_id,r.tx_hash,r.ledger,o.* FROM wallet_private.receipts r JOIN wallet_private.orders o USING(tenant_id,network,order_id) WHERE r.tenant_id=$1 AND r.network=$2 AND o.session_id=$3 AND r.receipt_id=$4",[id.tenant_id,id.network,id.session_id,param(request,"receiptId")]);
    const row = result.rows[0]; if (!row) notFound();
    if (!["pending", "uncertain", "confirmed", "failed"].includes(row.payment_state) || row.delivery_state !== "pending") throw new ApiFailure(503,"service_unavailable");
    const payment = row.payment_state === "confirmed" ? {status:"confirmed",txHash:row.tx_hash,ledger:Number(row.ledger)} : row.payment_state === "failed" ? {status:"failed"} : {status:"pending"};
    return { body: receiptSchema.parse({mode:"fixture",receiptId:row.receipt_id,orderId:row.order_id,sessionId:row.session_id,cardId:row.card_id,network:"testnet",assetContractId:stellarTestnetUsdc.contractId,sourceAddress:null,recipientAddress:recipient,amountMinor:row.amount,payment,delivery:{status:"pending"},refundStatus:row.refund_state}) };
  });
}
async function getCard(db: PoolClient,id: Identity,cardId: string,lock: boolean) {
  const result = lock ? await db.query("SELECT * FROM wallet_private.lock_card($1,$2,$3)",[id.network,cardId,id.session_id]) : await db.query("SELECT * FROM wallet_private.cards WHERE tenant_id=$1 AND network=$2 AND card_id=$3 AND session_id=$4",[id.tenant_id,id.network,cardId,id.session_id]);
  const card=result.rows[0]; if (!card) notFound();
  if (card.mode !== "fixture" || card.asset_id !== stellarTestnetUsdc.contractId || [card.balance_minor,card.payment_limit_minor,card.total_limit_minor,card.spent_minor].some((v) => v === null)) throw new ApiFailure(503,"service_unavailable");
  return card;
}
function cardView(card: any, held: bigint) {
  const budget = BigInt(card.total_limit_minor) - BigInt(card.spent_minor) - held;
  const balance = BigInt(card.balance_minor) - held;
  const available = budget < balance ? budget : balance;
  return cardSchema.parse({mode:"fixture",cardId:card.card_id,sessionId:card.session_id,name:card.display_name,status:"active",asset:stellarTestnetUsdc,accountAddress:null,balanceMinor:card.balance_minor,perPaymentLimitMinor:card.payment_limit_minor,totalLimitMinor:card.total_limit_minor,spentMinor:card.spent_minor,availableMinor:(available > 0n ? available : 0n).toString()});
}
function orderView(order: any) {
  if (!["pending", "uncertain", "confirmed", "failed"].includes(order.payment_state) || order.delivery_state !== "pending") throw new ApiFailure(503, "service_unavailable");
  const status = order.payment_state === "failed" ? "failed" : order.payment_state === "confirmed" ? "paid" : "payment_pending";
  return orderSchema.parse({mode:"fixture",orderId:order.order_id,cardId:order.card_id,sessionId:order.session_id,offerId:order.offer_id,amountMinor:order.amount,status,receiptId:order.receipt_id ?? null});
}
