import { createHash } from "node:crypto";
import { Networks, type rpc } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { loadTestnetEnvelope } from "./postgres-envelope-vault.js";
import type { AgentSigner } from "./testnet-dry-run.js";
import { prepareAndPersistTestnet } from "./testnet-preflight.js";
import { withRpcDeadline } from "./rpc-deadline.js";
import { LegacyEnvelopeError } from "./spend-interface.js";
import { verifyTestnetTransfer } from "./testnet-transfer.js";
import { broadcastAuthorizedTestnet, type SendRpc } from "./testnet-broadcast.js";
import { testReportAmount, testReportRecipient, testnetUsdcContract } from "./testnet-constants.js";

/** Read-only RPC surface. It has no sendTransaction; sending needs an explicit BroadcastActivation. */
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
  /** Absent by default: nothing is ever sent. See BroadcastActivation. */
  broadcast?: BroadcastActivation;
}
/** Explicit single-order activation (TESTNET_BROADCAST=single-authorized). A send additionally needs a
 * human authorization stored in PostgreSQL for the exact hash of that order's signed envelope. */
export interface BroadcastActivation {
  orderId: string;
  rpc: SendRpc;
  nowSeconds?: () => number;
}
export type PaymentStep = "idle" | "lease_lost" | "awaiting_broadcast" | "awaiting_evidence" | "evidence_rejected" | "confirmed" | "legacy_envelope"
  | "submitted" | "awaiting_authorization" | "envelope_expired" | "broadcast_blocked";

/** Claim one Testnet payment, recover or create its single signed envelope and reconcile by hash.
 * Timeout, NOT_FOUND or unverified events keep the hold and the attempt; nothing is marked failed.
 * With an explicit activation, a NOT_FOUND may send the same stored bytes (see broadcastAuthorizedTestnet).
 * An envelope signed for WalletFoundation v1 is reported as legacy_envelope and never re-signed. */
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
    if (snapshot.policy_revision === null || snapshot.policy_revision === undefined) throw new Error("card has no reviewed WalletFoundation policy revision");
    await prepareAndPersistTestnet(pool, readRpc, options.signer, lease,
      { orderId: task.order_id, attemptId: snapshot.attempt_id, contractId: snapshot.contract_id, keyId: options.keyId, policyRevision: BigInt(snapshot.policy_revision) },
      await options.keyForId(options.keyId));
    attemptState = "prepared";
  }
  // Every restart resolves the same encrypted bytes and hash; nothing is signed again.
  let loaded: Awaited<ReturnType<typeof loadTestnetEnvelope>>;
  try { loaded = await loadTestnetEnvelope(pool, lease, snapshot.attempt_id, options.keyForId); }
  catch (error) { if (error instanceof LegacyEnvelopeError) return "legacy_envelope"; throw error; }
  if (!loaded) return "lease_lost";
  // Reconcile by the stored hash first: a transaction already on chain is never sent again.
  const observed = await verifyTestnetTransfer(readRpc, loaded.context, loaded.envelope);
  if (observed.status !== "verified") {
    const waiting: PaymentStep = attemptState === "uncertain" ? "awaiting_evidence" : "awaiting_broadcast";
    // Only a definite NOT_FOUND for the single activated order may lead to sending the same bytes.
    // RPC errors, FAILED (e.g. PolicyChanged) or unverified results never send and never re-sign.
    if (!options.broadcast || observed.reason !== "not_found" || task.order_id !== options.broadcast.orderId) return waiting;
    const outcome = await broadcastAuthorizedTestnet({ pool, freshRpc: readRpc, sendRpc: withRpcDeadline(options.broadcast.rpc, options.rpcTimeoutMs ?? 10_000),
      lease, attemptId: snapshot.attempt_id, context: loaded.context, envelope: loaded.envelope, leaseSeconds: options.leaseSeconds,
      nowSeconds: options.broadcast.nowSeconds ?? (() => Math.floor(Date.now() / 1000)) });
    if (outcome === "submitted") return "submitted";
    if (outcome === "not_authorized") return "awaiting_authorization";
    if (outcome === "envelope_expired") return "envelope_expired";
    if (outcome === "lease_lost") return "lease_lost";
    return "broadcast_blocked";
  }
  const renewed = await pool.query("SELECT wallet_private.renew_fixture($1,$2,$3,$4) AS owned", [lease.tenantId, lease.eventId, lease.token, options.leaseSeconds]);
  if (!renewed.rows[0]?.owned) return "lease_lost";
  const confirmed = await pool.query(
    "SELECT wallet_private.confirm_testnet_payment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS confirmed",
    [lease.tenantId, lease.eventId, lease.token, snapshot.attempt_id, observed.hash, Networks.TESTNET, observed.ledger, observed.eventIndex,
      testnetUsdcContract, loaded.context.contractId, testReportRecipient, testReportAmount.toString(), createHash("sha256").update(loaded.envelope).digest()],
  );
  return confirmed.rows[0]?.confirmed === true ? "confirmed" : "evidence_rejected";
}
