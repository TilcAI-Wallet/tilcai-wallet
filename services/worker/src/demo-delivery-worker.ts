import type { Pool } from "pg";
import { verifyDeliveredArtifact, type DeliveryProvider } from "./demo-report-provider.js";

export type DeliveryStep = "idle" | "lease_lost" | "delivered" | "rejected";
/** Delivery runs only for orders with persisted, verified payment evidence (enforced in SQL). */
export async function processDemoDeliveryOnce(options: { pool: Pool; provider: DeliveryProvider; leaseSeconds: number }): Promise<DeliveryStep> {
  const { pool } = options;
  const task = (await pool.query("SELECT * FROM wallet_private.claim_testnet_delivery($1)", [options.leaseSeconds])).rows[0];
  if (!task) return "idle";
  const snapshot = (await pool.query("SELECT * FROM wallet_private.read_testnet_delivery($1,$2,$3)", [task.tenant_id, task.event_id, task.lease_token])).rows[0];
  if (!snapshot || snapshot.order_id !== task.order_id) return "lease_lost";
  const request = { orderId: snapshot.order_id as string, offerId: snapshot.offer_id as string, paymentTxHash: snapshot.tx_hash as string, ledger: Number(snapshot.ledger) };
  const verified = verifyDeliveredArtifact(request, await options.provider.deliver(request));
  const renewed = await pool.query("SELECT wallet_private.renew_fixture($1,$2,$3,$4) AS owned", [task.tenant_id, task.event_id, task.lease_token, options.leaseSeconds]);
  if (!renewed.rows[0]?.owned) return "lease_lost";
  const recorded = await pool.query("SELECT wallet_private.record_demo_delivery($1,$2,$3,$4,$5,$6,$7,$8) AS recorded",
    [task.tenant_id, task.event_id, task.lease_token, options.provider.id, verified.evidenceId, verified.digest, verified.bytes, request.paymentTxHash]);
  return recorded.rows[0]?.recorded === true ? "delivered" : "rejected";
}
