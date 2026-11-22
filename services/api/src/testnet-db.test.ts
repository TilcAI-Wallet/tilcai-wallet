import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { createInterface } from "node:readline";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createApi } from "./app.js";
import { processFixtureOnce } from "../../worker/src/fixture-worker.js";
import { processDemoDeliveryOnce } from "../../worker/src/demo-delivery-worker.js";
import { DemoReportProvider, type DeliveryProvider } from "../../worker/src/demo-report-provider.js";
import { storeTestnetEnvelope } from "../../worker/src/postgres-envelope-vault.js";
import { makeTestEnvelope } from "../../worker/src/test-envelope.fixture.js";
import { fakeTestnetRpc, simulatedReadRpc, type RpcOutcome } from "../../worker/src/test-rpc.fixture.js";
import { processTestnetPaymentOnce } from "../../worker/src/testnet-worker.js";
import { fetchReceipt } from "../../../apps/web/src/lib/wallet-api.ts";

const url = process.env.WALLET_TEST_DATABASE_URL;
const usdc = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const recipient = "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
const otherContract = "CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6";
const otherAccount = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest();
const newToken = () => `tok_${randomUUID().replaceAll("-", "")}`;

async function startMcp(context: TestContext, env: NodeJS.ProcessEnv) {
  const script = fileURLToPath(new URL("../../../apps/mcp/src/server.ts", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", script], { stdio: ["pipe", "pipe", "inherit"], env: { ...process.env, ...env } });
  const lines = createInterface({ input: child.stdout });
  context.after(() => { lines.close(); child.kill(); });
  const responses = lines[Symbol.asyncIterator]();
  let id = 0;
  const send = (message: object) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  async function request(method: string, params: object = {}) {
    const requestId = ++id;
    send({ id: requestId, method, params });
    const message = JSON.parse((await responses.next()).value as string);
    assert.equal(message.id, requestId);
    return message.result;
  }
  await request("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "receipt-consistency", version: "1" } });
  send({ method: "notifications/initialized" });
  return { call: (name: string, args: object = {}) => request("tools/call", { name, arguments: args }) };
}

test("PostgreSQL: Testnet orders confirm only with verified evidence, deliver once and read the same receipt everywhere", { skip: !url, timeout: 120_000 }, async (t) => {
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  const apiPool = new pg.Pool({ connectionString: url, options: "-c role=wallet_api", max: 5 });
  let worker = new pg.Pool({ connectionString: url, options: "-c role=wallet_worker", max: 4 });
  const app = createApi({ pool: apiPool });
  t.after(async () => { await app.close(); await worker.end(); await apiPool.end(); await admin.end(); });

  const s = randomUUID();
  const A = `tn-a-${s}`, B = `tn-b-${s}`, sessA = `sa-${s}`, sessF = `sf-${s}`, sessB = `sb-${s}`, cardA = `ca-${s}`, cardF = `cf-${s}`, cardB = `cb-${s}`;
  const tokA = newToken(), tokF = newToken(), tokB = newToken();
  const sample = makeTestEnvelope(), key = randomBytes(32), keyId = "ci-ephemeral-key";
  const scopes = ["sessions:read", "cards:read", "orders:write", "orders:read", "receipts:read"];
  await admin.query("INSERT INTO wallet_private.tenants(tenant_id) VALUES($1),($2)", [A, B]);
  await admin.query("INSERT INTO wallet_private.sessions(tenant_id,network,session_id,actor_id,expires_at) VALUES ($1,'testnet',$2,'actor',now()+interval '1 hour'),($1,'testnet',$3,'actor',now()+interval '1 hour'),($4,'testnet',$5,'actor',now()+interval '1 hour')", [A, sessA, sessF, B, sessB]);
  await admin.query("INSERT INTO wallet_private.credentials(tenant_id,network,session_id,token_hash,scopes,expires_at) VALUES ($1,'testnet',$2,$3,$9,now()+interval '1 hour'),($1,'testnet',$4,$5,$9,now()+interval '1 hour'),($6,'testnet',$7,$8,$9,now()+interval '1 hour')", [A, sessA, sha(tokA), sessF, sha(tokF), B, sessB, sha(tokB), scopes]);
  // Testnet cards carry the WalletFoundation v2 policy revision an administrator reviewed.
  const insertCard = (tenant: string, card: string, session: string, mode: string, contract: string, agent: string, revision: string | null = mode === "testnet" ? "0" : null) =>
    admin.query("INSERT INTO wallet_private.cards(tenant_id,network,card_id,session_id,contract_id,asset_id,recipient,agent,balance_minor,payment_limit_minor,total_limit_minor,spent_minor,mode,policy_revision) VALUES ($1,'testnet',$2,$3,$4,$5,$6,$7,200000000,5000000,5000000,0,$8,$9)", [tenant, card, session, contract, usdc, recipient, agent, mode, revision]);
  await insertCard(A, cardA, sessA, "testnet", sample.contractId, sample.agent);
  await insertCard(A, cardF, sessF, "fixture", "fixture-contract", "fixture-agent");
  await insertCard(B, cardB, sessB, "testnet", sample.contractId, sample.agent);
  const cardUnreviewed = `cu-${s}`;
  await insertCard(A, cardUnreviewed, sessA, "testnet", sample.contractId, sample.agent, null);

  const auth = (token: string, idempotencyKey?: string) => ({ authorization: `Bearer ${token}`, ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) });
  const purchase = { offerId: "test-report", maxAmountMinor: "5000000" };
  const buy = (token: string, cardId: string, idempotencyKey: string) => app.inject({ method: "POST", url: "/v1/orders", headers: auth(token, idempotencyKey), payload: { cardId, ...purchase } });

  // API Testnet: a concurrent replay creates one order, one hold and one attempt.
  const [first, second] = await Promise.all([buy(tokA, cardA, "tn-1"), buy(tokA, cardA, "tn-1")]);
  assert.deepEqual([first.statusCode, second.statusCode].sort(), [200, 202]);
  const order = first.json();
  assert.equal(order.mode, "testnet"); assert.equal(order.status, "payment_pending"); assert.equal(second.json().orderId, order.orderId);
  const readReceipt = (token = tokA, receiptId = order.receiptId as string) => app.inject({ method: "GET", url: `/v1/receipts/${receiptId}`, headers: auth(token) });
  assert.deepEqual((await readReceipt()).json().payment, { status: "not_submitted" });
  const card = (await app.inject({ method: "GET", url: `/v1/cards/${cardA}`, headers: auth(tokA) })).json();
  assert.deepEqual([card.mode, card.accountAddress, card.availableMinor, card.spentMinor], ["testnet", sample.contractId, "0", "0"]);
  const fixtureOrder = (await buy(tokF, cardF, "fx-1")).json();
  // A Testnet card without a reviewed v2 policy revision takes no order and no hold.
  assert.equal((await buy(tokA, cardUnreviewed, "tn-unreviewed")).statusCode, 503);
  assert.equal((await admin.query("SELECT count(*)::int AS n FROM wallet_private.orders WHERE tenant_id=$1 AND card_id=$2", [A, cardUnreviewed])).rows[0].n, 0);
  assert.equal(fixtureOrder.mode, "fixture");

  // Tenant isolation and client-supplied tenants.
  assert.equal((await readReceipt(tokB)).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: `/v1/orders/${order.orderId}`, headers: auth(tokB) })).statusCode, 404);
  assert.equal((await app.inject({ method: "POST", url: "/v1/orders", headers: { ...auth(tokB, "x-1"), "x-tenant-id": A }, payload: { cardId: cardA, ...purchase } })).statusCode, 404);
  assert.equal((await app.inject({ method: "POST", url: "/v1/orders", headers: auth(tokB, "x-2"), payload: { cardId: cardB, ...purchase, tenantId: A } })).statusCode, 400);
  assert.equal((await app.inject({ method: "GET", url: `/v1/cards/${cardF}`, headers: auth(tokA) })).statusCode, 404);

  await admin.query("INSERT INTO wallet_private.worker_assignments(login_name,tenant_id) SELECT session_user,$1", [A]);
  const expire = () => admin.query("UPDATE wallet_private.outbox SET lease_until=now()-interval '1 second' WHERE tenant_id=$1 AND lease_until IS NOT NULL AND completed_at IS NULL", [A]);

  // Fixture and Testnet work queues never mix.
  assert.equal(await processFixtureOnce(worker, 30), true);
  assert.equal(await processFixtureOnce(worker, 30), false);
  assert.equal((await readReceipt(tokF, fixtureOrder.receiptId)).json().mode, "fixture");
  assert.equal((await admin.query("SELECT payment_state FROM wallet_private.orders WHERE tenant_id=$1 AND order_id=$2", [A, order.orderId])).rows[0].payment_state, "pending");

  // A worker persists the signed envelope and crashes before broadcast.
  const claimed = (await worker.query("SELECT * FROM wallet_private.claim_testnet(30)")).rows[0];
  assert.equal(claimed.order_id, order.orderId);
  const attempt = (await admin.query("SELECT attempt_id FROM wallet_private.attempts WHERE tenant_id=$1 AND order_id=$2", [A, order.orderId])).rows[0].attempt_id as string;
  const contextFor = (tenantId: string, orderId: string, attemptId: string) => ({ keyId, tenantId, orderId, attemptId, contractId: sample.contractId, agent: sample.agent, transactionHash: sample.hash, validThroughLedger: 123, policyRevision: sample.policyRevision });
  assert.equal(await storeTestnetEnvelope(worker, { tenantId: A, eventId: claimed.event_id, token: claimed.lease_token }, contextFor(A, order.orderId, attempt), key, sample.bytes), true);
  await expire();
  await worker.end(); worker = new pg.Pool({ connectionString: url, options: "-c role=wallet_worker", max: 4 });

  const run = (outcome: RpcOutcome, ledger?: number) => processTestnetPaymentOnce({
    pool: worker, rpc: simulatedReadRpc(sample, outcome, ledger), keyId, leaseSeconds: 30,
    signer: { publicKey: sample.agent, signHash: async () => { throw new Error("must not sign again"); } },
    keyForId: async (id) => { assert.equal(id, keyId); return key; },
  });
  // Restart + timeout/NOT_FOUND/wrong evidence: same envelope, no new charge, hold retained, nothing failed.
  for (const [outcome, ledger] of [["not_found"], ["timeout"], ["wrong_recipient"], ["wrong_amount"], ["verified", 123]] as Array<[RpcOutcome, number?]>) {
    assert.equal(await run(outcome, ledger), "awaiting_broadcast", outcome);
    await expire();
  }
  const state = async () => (await admin.query(`SELECT o.payment_state, a.state AS attempt_state, a.tx_hash,
      (SELECT count(*) FROM wallet_private.attempts x WHERE x.tenant_id=o.tenant_id AND x.order_id=o.order_id)::int AS attempts,
      (SELECT count(*) FROM wallet_private.holds h WHERE h.tenant_id=o.tenant_id AND h.order_id=o.order_id AND h.released_at IS NULL)::int AS held,
      (SELECT count(*) FROM wallet_private.payment_evidence e WHERE e.tenant_id=o.tenant_id)::int AS evidence,
      (SELECT spent_minor::text FROM wallet_private.cards c WHERE c.tenant_id=o.tenant_id AND c.card_id=o.card_id) AS spent
    FROM wallet_private.orders o JOIN wallet_private.attempts a ON a.tenant_id=o.tenant_id AND a.order_id=o.order_id WHERE o.tenant_id=$1 AND o.order_id=$2`, [A, order.orderId])).rows[0];
  assert.deepEqual(await state(), { payment_state: "pending", attempt_state: "prepared", tx_hash: sample.hash, attempts: 1, held: 1, evidence: 0, spent: "0" });

  // Direct transitions with a live lease reject every mismatched field.
  const lease = (await worker.query("SELECT * FROM wallet_private.claim_testnet(30)")).rows[0];
  const good: unknown[] = [A, lease.event_id, lease.lease_token, attempt, sample.hash, "Test SDF Network ; September 2015", 110, 0, usdc, sample.contractId, recipient, "5000000", sha(sample.bytes)];
  const confirm = async (args: unknown[], pool: pg.Pool = worker) => (await pool.query("SELECT wallet_private.confirm_testnet_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS ok", args)).rows[0].ok;
  const wrong: Array<[number, unknown]> = [[0, B], [2, randomUUID()], [3, "other-attempt"], [4, "c".repeat(64)], [5, "Public Global Stellar Network ; September 2015"],
    [6, 123], [8, otherContract], [9, otherContract], [10, otherAccount], [11, "5000001"], [12, randomBytes(32)]];
  for (const [index, value] of wrong) { const args = [...good]; args[index] = value; assert.equal(await confirm(args), false, `field ${index}`); }
  await assert.rejects(() => confirm(good, apiPool), /permission denied/);
  await assert.rejects(() => apiPool.query("SELECT * FROM wallet_private.claim_testnet(30)"), /permission denied/);
  await assert.rejects(() => worker.query("INSERT INTO wallet_private.payment_evidence(tenant_id,network,order_id,attempt_id,network_passphrase,tx_hash,ledger,event_index,asset_contract_id,source_address,recipient_address,amount,envelope_digest) VALUES ($1,'testnet',$2,$3,'Test SDF Network ; September 2015',$4,110,0,$5,$6,$7,5000000,$8)", [A, order.orderId, attempt, sample.hash, usdc, sample.contractId, recipient, sha(sample.bytes)]), /permission denied/);
  const spoofed = await apiPool.connect();
  try {
    await spoofed.query("BEGIN");
    await spoofed.query("SELECT set_config('wallet.tenant_id',$1,true)", [A]);
    await assert.rejects(() => spoofed.query("INSERT INTO wallet_private.outbox(tenant_id,network,event_id,order_id,kind) VALUES ($1,'testnet',$2,$3,'delivery')", [A, randomUUID(), order.orderId]), /row-level security/);
    await spoofed.query("ROLLBACK"); await spoofed.query("BEGIN");
    await assert.rejects(() => spoofed.query("UPDATE wallet_private.orders SET payment_state='confirmed' WHERE tenant_id=$1", [A]), /permission denied/);
    // Without a verified credential the GUC alone exposes nothing (before migration 008 it did).
    await spoofed.query("ROLLBACK"); await spoofed.query("BEGIN");
    await spoofed.query("SELECT set_config('wallet.tenant_id',$1,true)", [A]);
    for (const table of ["orders", "cards", "receipts", "attempts", "holds", "outbox", "payment_evidence"])
      assert.equal((await spoofed.query(`SELECT count(*)::int AS n FROM wallet_private.${table}`)).rows[0].n, 0, table);
    assert.equal((await spoofed.query("SELECT * FROM wallet_private.lock_card('testnet',$1,$2)", [cardA, sessA])).rowCount, 0);
    // Bound to tenant B by its credential: switching the GUC to A cannot read, lock or enqueue A's work.
    await spoofed.query("ROLLBACK"); await spoofed.query("BEGIN");
    assert.equal((await spoofed.query("SELECT * FROM wallet_private.verify_credential($1)", [sha(tokB)])).rows[0].tenant_id, B);
    await spoofed.query("SELECT set_config('wallet.tenant_id',$1,true)", [A]);
    assert.equal((await spoofed.query("SELECT count(*)::int AS n FROM wallet_private.orders")).rows[0].n, 0);
    assert.equal((await spoofed.query("SELECT * FROM wallet_private.lock_card('testnet',$1,$2)", [cardA, sessA])).rowCount, 0);
    await assert.rejects(() => spoofed.query("INSERT INTO wallet_private.outbox(tenant_id,network,event_id,order_id,kind) VALUES ($1,'testnet',$2,$3,'payment')", [A, randomUUID(), order.orderId]), /row-level security/);
    await spoofed.query("ROLLBACK"); await spoofed.query("BEGIN");
    await spoofed.query("SELECT * FROM wallet_private.verify_credential($1)", [sha(tokB)]);
    await assert.rejects(() => spoofed.query("SELECT * FROM wallet_private.verify_credential($1)", [sha(tokA)]), /already bound to another tenant/);
  } finally { await spoofed.query("ROLLBACK"); spoofed.release(); }
  assert.equal((await state()).payment_state, "pending");

  // Concurrency after lease expiry: exactly one worker confirms with verified evidence.
  await expire();
  const raced = await Promise.all([run("verified"), run("verified")]);
  assert.deepEqual(raced.sort(), ["confirmed", "idle"]);
  assert.deepEqual(await state(), { payment_state: "confirmed", attempt_state: "confirmed", tx_hash: sample.hash, attempts: 1, held: 0, evidence: 1, spent: "5000000" });
  assert.equal(await confirm(good), false, "stale token");
  const current = (await admin.query("SELECT event_id,lease_token FROM wallet_private.outbox WHERE tenant_id=$1 AND order_id=$2 AND kind='payment'", [A, order.orderId])).rows[0];
  const replay = [...good]; replay[1] = current.event_id; replay[2] = current.lease_token;
  assert.equal(await confirm(replay), true, "identical replay is idempotent");
  const altered = [...replay]; altered[6] = 111;
  assert.equal(await confirm(altered), false);
  assert.equal((await state()).spent, "5000000");
  const paid = (await readReceipt()).json();
  assert.deepEqual([paid.mode, paid.payment, paid.delivery, paid.sourceAddress], ["testnet", { status: "confirmed", txHash: sample.hash, ledger: 110 }, { status: "pending" }, sample.contractId]);

  // Delivery: a tampered artifact is never recorded; the verified one is recorded once.
  const honest = new DemoReportProvider();
  const tampering: DeliveryProvider = { id: honest.id, deliver: async (request) => ({ ...(await honest.deliver(request)), digest: "0".repeat(64) }) };
  await assert.rejects(() => processDemoDeliveryOnce({ pool: worker, provider: tampering, leaseSeconds: 30 }), /digest mismatch/);
  await expire();
  assert.equal(await processDemoDeliveryOnce({ pool: worker, provider: honest, leaseSeconds: 30 }), "delivered");
  assert.equal(await processDemoDeliveryOnce({ pool: worker, provider: honest, leaseSeconds: 30 }), "idle");
  const delivered = (await admin.query("SELECT evidence_id,digest,payment_tx_hash FROM wallet_private.delivery_evidence WHERE tenant_id=$1", [A])).rows;
  assert.equal(delivered.length, 1); assert.equal(delivered[0].payment_tx_hash, sample.hash);
  assert.equal((await admin.query("SELECT count(*)::int AS n FROM wallet_private.outbox WHERE tenant_id=$1 AND order_id=$2 AND kind='delivery'", [A, fixtureOrder.orderId])).rows[0].n, 0);
  const apiReceipt = (await readReceipt()).json();
  assert.deepEqual(apiReceipt.delivery, { status: "delivered", providerId: "demo-report-provider", evidenceId: delivered[0].evidence_id, digest: delivered[0].digest });
  assert.equal((await app.inject({ method: "GET", url: `/v1/orders/${order.orderId}`, headers: auth(tokA) })).json().status, "delivered");

  // Replay after completion returns the same order; a new key cannot charge again.
  const again = await buy(tokA, cardA, "tn-1");
  assert.deepEqual([again.statusCode, again.json().orderId, again.json().status], [200, order.orderId, "delivered"]);
  assert.equal((await buy(tokA, cardA, "tn-2")).statusCode, 409);

  // The same tx hash cannot settle an order of another tenant.
  await admin.query("INSERT INTO wallet_private.worker_assignments(login_name,tenant_id) SELECT session_user,$1", [B]);
  const orderB = (await buy(tokB, cardB, "b-1")).json();
  const claimB = (await worker.query("SELECT * FROM wallet_private.claim_testnet(30)")).rows[0];
  assert.equal(claimB.order_id, orderB.orderId);
  const attemptB = (await admin.query("SELECT attempt_id FROM wallet_private.attempts WHERE tenant_id=$1", [B])).rows[0].attempt_id as string;
  await assert.rejects(() => storeTestnetEnvelope(worker, { tenantId: B, eventId: claimB.event_id, token: claimB.lease_token }, contextFor(B, orderB.orderId, attemptB), key, sample.bytes), /duplicate key/);

  // API, SDK/MCP and PWA read the same receiptId consistently through a test server.
  await app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const mcp = await startMcp(t, { WALLET_API_URL: base, WALLET_MCP_TOKEN: tokA, WALLET_MCP_CARD_ID: cardA });
  const viaMcp = await mcp.call("get_receipt", { receiptId: order.receiptId });
  assert.notEqual(viaMcp.isError, true);
  assert.deepEqual(viaMcp.structuredContent, apiReceipt);
  const viaPwa = await fetchReceipt(base, tokA, order.receiptId);
  assert.deepEqual([viaPwa.id, viaPwa.orderId, viaPwa.state, viaPwa.simulated, viaPwa.payment.txHash, viaPwa.payment.ledger, viaPwa.delivery.deliveryId, viaPwa.delivery.digest],
    [apiReceipt.receiptId, apiReceipt.orderId, "delivered", false, apiReceipt.payment.txHash, apiReceipt.payment.ledger, apiReceipt.delivery.evidenceId, apiReceipt.delivery.digest]);
  assert.equal((await fetchReceipt(base, tokF, fixtureOrder.receiptId)).simulated, true);
});

test("PostgreSQL: one human-authorized Testnet send is fenced, bounded and reconciled by the same hash (FAKE RPC, nothing transmitted)", { skip: !url, timeout: 120_000 }, async (t) => {
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  const apiPool = new pg.Pool({ connectionString: url, options: "-c role=wallet_api", max: 2 });
  let worker = new pg.Pool({ connectionString: url, options: "-c role=wallet_worker", max: 4 });
  const app = createApi({ pool: apiPool });
  t.after(async () => { await app.close(); await worker.end(); await apiPool.end(); await admin.end(); });
  const s = randomUUID(), T = `bc-${s}`, session = `bs-${s}`, card = `bk-${s}`, token = newToken();
  const sample = makeTestEnvelope(), key = randomBytes(32), keyId = "ci-broadcast-key";
  await admin.query("INSERT INTO wallet_private.tenants(tenant_id) VALUES($1)", [T]);
  await admin.query("INSERT INTO wallet_private.sessions(tenant_id,network,session_id,actor_id,expires_at) VALUES ($1,'testnet',$2,'actor',now()+interval '1 hour')", [T, session]);
  await admin.query("INSERT INTO wallet_private.credentials(tenant_id,network,session_id,token_hash,scopes,expires_at) VALUES ($1,'testnet',$2,$3,$4,now()+interval '1 hour')", [T, session, sha(token), ["orders:write", "orders:read", "receipts:read"]]);
  await admin.query("INSERT INTO wallet_private.cards(tenant_id,network,card_id,session_id,contract_id,asset_id,recipient,agent,balance_minor,payment_limit_minor,total_limit_minor,spent_minor,mode,policy_revision) VALUES ($1,'testnet',$2,$3,$4,$5,$6,$7,200000000,5000000,5000000,0,'testnet',0)", [T, card, session, sample.contractId, usdc, recipient, sample.agent]);
  const created = await app.inject({ method: "POST", url: "/v1/orders", headers: { authorization: `Bearer ${token}`, "idempotency-key": "bc-1" }, payload: { cardId: card, offerId: "test-report", maxAmountMinor: "5000000" } });
  assert.equal(created.statusCode, 202);
  const order = created.json();
  // Only this tenant is assigned to the worker login for the rest of the test.
  await admin.query("DELETE FROM wallet_private.worker_assignments WHERE login_name=session_user");
  await admin.query("INSERT INTO wallet_private.worker_assignments(login_name,tenant_id) SELECT session_user,$1", [T]);
  const expire = () => admin.query("UPDATE wallet_private.outbox SET lease_until=now()-interval '1 second' WHERE tenant_id=$1 AND lease_until IS NOT NULL AND completed_at IS NULL", [T]);

  // The signed v2 envelope is stored before any send can be considered.
  const claimed = (await worker.query("SELECT * FROM wallet_private.claim_testnet(30)")).rows[0];
  const attempt = (await admin.query("SELECT attempt_id FROM wallet_private.attempts WHERE tenant_id=$1", [T])).rows[0].attempt_id as string;
  assert.equal(await storeTestnetEnvelope(worker, { tenantId: T, eventId: claimed.event_id, token: claimed.lease_token },
    { keyId, tenantId: T, orderId: order.orderId, attemptId: attempt, contractId: sample.contractId, agent: sample.agent, transactionHash: sample.hash, validThroughLedger: 123, policyRevision: 0n }, key, sample.bytes), true);
  await expire();

  const fake = fakeTestnetRpc(sample);
  const run = (activated: boolean) => processTestnetPaymentOnce({ pool: worker, rpc: fake.read, keyId, keyForId: async () => key, leaseSeconds: 30,
    signer: { publicKey: sample.agent, signHash: async () => { throw new Error("must not sign again"); } },
    broadcast: activated ? { orderId: order.orderId, rpc: fake.send, nowSeconds: () => 1 } : undefined });
  const step = async (activated: boolean) => { const result = await run(activated); await expire(); return result; };
  const state = async () => (await admin.query(`SELECT o.payment_state, a.state AS attempt_state,
      (SELECT count(*) FROM wallet_private.attempts x WHERE x.tenant_id=o.tenant_id AND x.order_id=o.order_id)::int AS attempts,
      (SELECT count(*) FROM wallet_private.holds h WHERE h.tenant_id=o.tenant_id AND h.order_id=o.order_id AND h.released_at IS NULL)::int AS held,
      (SELECT b.send_count FROM wallet_private.broadcast_authorizations b WHERE b.tenant_id=o.tenant_id AND b.order_id=o.order_id) AS sends
    FROM wallet_private.orders o JOIN wallet_private.attempts a ON a.tenant_id=o.tenant_id AND a.order_id=o.order_id WHERE o.tenant_id=$1 AND o.order_id=$2`, [T, order.orderId])).rows[0];

  // Disabled by default, and activation alone is not enough without a stored authorization.
  assert.equal(await step(false), "awaiting_broadcast");
  assert.equal(await step(true), "awaiting_authorization");
  assert.deepEqual(await state(), { payment_state: "pending", attempt_state: "prepared", attempts: 1, held: 1, sends: null });

  // Only an administrator can authorize, and only the exact stored v2 hash of this pending order.
  const authorizeSql = "SELECT wallet_private.authorize_testnet_broadcast($1,$2,$3,'ci-operator','single Testnet purchase',$4)";
  for (const pool of [worker, apiPool]) await assert.rejects(() => pool.query(authorizeSql, [T, order.orderId, sample.hash, 30]), /permission denied/);
  for (const pool of [worker, apiPool]) await assert.rejects(() => pool.query("SELECT * FROM wallet_private.broadcast_authorizations"), /permission denied/);
  await assert.rejects(() => apiPool.query("SELECT wallet_private.begin_testnet_broadcast($1,$2,$3,$4,$5)", [T, "e", "t", attempt, sample.hash]), /permission denied/);
  await assert.rejects(() => admin.query(authorizeSql, [T, order.orderId, "f".repeat(64), 30]), /no stored v2 envelope/);
  await assert.rejects(() => admin.query(authorizeSql, [T, order.orderId, sample.hash, 1441]), /1-1440 minutes/);
  await admin.query(authorizeSql, [T, order.orderId, sample.hash, 30]);
  await assert.rejects(() => admin.query(authorizeSql, [T, order.orderId, sample.hash, 30]), /duplicate key/);

  // Policy change since signing, or bytes about to expire: no send and no authorization consumed.
  fake.chain.revision = 1n; assert.equal(await step(true), "broadcast_blocked"); fake.chain.revision = 0n;
  fake.chain.latestLedger = 122; assert.equal(await step(true), "envelope_expired"); fake.chain.latestLedger = 105;
  assert.equal(fake.sent.length, 0); assert.equal((await state()).sends, 0);

  // Two concurrent workers: one claims, persists uncertain and sends; the other is idle.
  assert.deepEqual((await Promise.all([run(true), run(true)])).sort(), ["idle", "submitted"]);
  assert.equal(await run(true), "idle", "the live lease prevents a second sender");
  await expire();
  assert.deepEqual(fake.sent, [sample.bytes]);
  assert.deepEqual(await state(), { payment_state: "uncertain", attempt_state: "uncertain", attempts: 1, held: 1, sends: 1 });

  // Lost response and restart: NOT_FOUND re-sends only the same bytes; RPC errors and FAILED never send.
  fake.chain.send = "timeout";
  await worker.end(); worker = new pg.Pool({ connectionString: url, options: "-c role=wallet_worker", max: 4 });
  assert.equal(await step(true), "submitted");
  fake.chain.transaction = "timeout"; assert.equal(await step(true), "awaiting_evidence");
  fake.chain.transaction = "failed"; assert.equal(await step(true), "awaiting_evidence");
  fake.chain.transaction = "not_found";
  await admin.query("UPDATE wallet_private.broadcast_authorizations SET revoked_at=now() WHERE tenant_id=$1", [T]);
  assert.equal(await step(true), "awaiting_authorization", "revoked");
  await admin.query("UPDATE wallet_private.broadcast_authorizations SET revoked_at=NULL WHERE tenant_id=$1", [T]);
  assert.equal(await step(true), "submitted");
  assert.equal(await step(true), "awaiting_authorization", "max_sends reached");
  assert.deepEqual(fake.sent, [sample.bytes, sample.bytes, sample.bytes]);
  assert.deepEqual(await state(), { payment_state: "uncertain", attempt_state: "uncertain", attempts: 1, held: 1, sends: 3 });

  // Verified evidence for the same hash confirms once and releases the hold; nothing else is sent.
  fake.chain.transaction = "verified";
  assert.equal(await step(true), "confirmed");
  assert.equal(await step(true), "idle");
  assert.deepEqual(await state(), { payment_state: "confirmed", attempt_state: "confirmed", attempts: 1, held: 0, sends: 3 });
  assert.equal(fake.sent.length, 3);
  const receipt = (await app.inject({ method: "GET", url: `/v1/receipts/${order.receiptId}`, headers: { authorization: `Bearer ${token}` } })).json();
  assert.deepEqual(receipt.payment, { status: "confirmed", txHash: sample.hash, ledger: 110 });
});
