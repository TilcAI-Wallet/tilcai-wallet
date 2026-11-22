import { createHash } from "node:crypto";
import { Networks, type rpc } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { loadTestnetEnvelope } from "./postgres-envelope-vault.js";
import type { AgentSigner } from "./testnet-dry-run.js";
import { prepareAndPersistTestnet } from "./testnet-preflight.js";
import { withRpcDeadline } from "./rpc-deadline.js";
import { verifyTestnetTransfer } from "./testnet-transfer.js";
import { testReportAmount, testReportRecipient, testnetUsdcContract } from "./testnet-constants.js";

/** Read-only RPC surface. It has no sendTransaction: this loop cannot broadcast. */
export type TestnetReadRpc = Pick<rpc.Server, "getNetwork" | "getLatestLedger" | "getAccount" | "simulateTransaction" | "getTransaction">;
export interface TestnetWorkerOptions {
  pool: Pool;
  rpc: TestnetReadRpc;
  /** Absent signer: existing envelopes are reconciled, new attempts fail closed. */
  signer?: AgentSigner;
  keyId: string;
  keyForId: (keyId: string) => Promise<Buffer>;
  leaseSeconds: number;
  /** Per-call RPC deadline; a stalled RPC must not hold the worker forever. Default 10 s. */
  rpcTimeoutMs?: number;
}
export type PaymentStep = "idle" | "lease_lost" | "awaiting_broadcast" | "awaiting_evidence" | "evidence_rejected" | "confirmed";

/** Claim one Testnet payment, recover or create its single signed envelope and reconcile by hash.
 * Timeout, NOT_FOUND or unverified events keep the hold and the attempt; nothing is marked failed. */
export async function processTestnetPaymentOnce(options: TestnetWorkerOptions): Promise<PaymentStep> {
  const { pool } = options;
  const readRpc = withRpcDeadline(options.rpc, options.rpcTimeoutMs ?? 10_000);
  const task = (await pool.query("SELECT * FROM wallet_private.claim_testnet($1)", [options.leaseSeconds])).rows[0];
  if (!task) return "idle";
  const lease = { tenantId: task.tenant_id as string, eventId: task.event_id as string, token: task.lease_token as string };
  const snapshot = (await pool.query("SELECT * FROM wallet_private.read_testnet_task($1,$2,$3)", [lease.tenantId, lease.eventId, lease.token])).rows[0];
  if (!snapshot) return "lease_lost";
  if (snapshot.order_id !== task.order_id || snapshot.asset_id !== testnetUsdcContract || snapshot.recipient !== testReportRecipient || BigInt(snapshot.amount) !== testReportAmount)
    throw new Error("unauthorized Testnet resource");
  let attemptState: string = snapshot.attempt_state;
  if (attemptState === "created") {
    if (!options.signer || options.signer.publicKey !== snapshot.agent) throw new Error("no authorized signer for this card");
    await prepareAndPersistTestnet(pool, readRpc, options.signer, lease,
      { orderId: task.order_id, attemptId: snapshot.attempt_id, contractId: snapshot.contract_id, keyId: options.keyId }, await options.keyForId(options.keyId));
    attemptState = "prepared";
  }
  // Every restart resolves the same encrypted bytes and hash; nothing is signed again.
  const loaded = await loadTestnetEnvelope(pool, lease, snapshot.attempt_id, options.keyForId);
  if (!loaded) return "lease_lost";
  // Broadcast is intentionally absent (see testnet-constants.ts broadcastBlocker).
  const observed = await verifyTestnetTransfer(readRpc, loaded.context, loaded.envelope);
  if (observed.status !== "verified") return attemptState === "uncertain" ? "awaiting_evidence" : "awaiting_broadcast";
  const renewed = await pool.query("SELECT wallet_private.renew_fixture($1,$2,$3,$4) AS owned", [lease.tenantId, lease.eventId, lease.token, options.leaseSeconds]);
  if (!renewed.rows[0]?.owned) return "lease_lost";
  const confirmed = await pool.query(
    "SELECT wallet_private.confirm_testnet_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS confirmed",
    [lease.tenantId, lease.eventId, lease.token, snapshot.attempt_id, observed.hash, Networks.TESTNET, observed.ledger, observed.eventIndex,
      testnetUsdcContract, loaded.context.contractId, testReportRecipient, testReportAmount.toString(), createHash("sha256").update(loaded.envelope).digest()],
  );
  return confirmed.rows[0]?.confirmed === true ? "confirmed" : "evidence_rejected";
}
