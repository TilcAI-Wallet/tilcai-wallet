import { Networks, Transaction, TransactionBuilder, type rpc } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { verifySignedSpendEnvelope, type EnvelopeContext } from "./envelope-vault.js";
import { assertPaymentPolicy } from "./payment-safety.js";
import type { EnvelopeLease } from "./postgres-envelope-vault.js";
import { testReportAmount, testReportRecipient, testnetUsdcContract } from "./testnet-constants.js";
import { foundationReader } from "./wallet-foundation-state.js";

export type FreshStateRpc = Pick<rpc.Server, "getNetwork" | "getLatestLedger" | "getAccount" | "simulateTransaction">;
export type SendRpc = Pick<rpc.Server, "sendTransaction">;
export type BroadcastOutcome = "submitted" | "envelope_expired" | "sequence_unavailable" | "preconditions_failed" | "lease_lost" | "not_authorized";
/** Minimum validity left before a send, so the bytes cannot expire in flight unnoticed. */
export const broadcastLedgerMargin = 2;
export const broadcastSecondsMargin = 15;

/** Sends the stored, signed WalletFoundation v2 envelope at most once per call, and only after:
 * the exact bytes verify (spend(amount, recipient, revision), agent signature, hash, Testnet);
 * the network, ledger and time bounds leave margin; the agent sequence still admits these bytes;
 * the contract is v2 with the same revision, recipient, agent, asset, limits and balance; the lease
 * is renewed; and begin_testnet_broadcast consumed a human authorization for this exact hash and
 * persisted the uncertain state. Any send error stays uncertain; nothing is released or re-signed. */
export async function broadcastAuthorizedTestnet(options: {
  pool: Pool; freshRpc: FreshStateRpc; sendRpc: SendRpc; lease: EnvelopeLease; attemptId: string;
  context: EnvelopeContext; envelope: Buffer; leaseSeconds: number; nowSeconds: () => number;
}): Promise<BroadcastOutcome> {
  const { context, envelope, lease } = options;
  verifySignedSpendEnvelope(envelope, context);
  const tx = TransactionBuilder.fromXDR(envelope.toString("base64"), Networks.TESTNET);
  if (!(tx instanceof Transaction) || !tx.timeBounds || !tx.ledgerBounds) throw new Error("invalid stored transaction");
  if ((await options.freshRpc.getNetwork()).passphrase !== Networks.TESTNET) throw new Error("network mismatch");
  const latest = (await options.freshRpc.getLatestLedger()).sequence;
  const now = options.nowSeconds(), maxTime = Number(tx.timeBounds.maxTime);
  if (!Number.isSafeInteger(latest) || latest < 1 || latest > 0xffffffff - 20 || !Number.isSafeInteger(now) || now < 1 || !Number.isSafeInteger(maxTime) || maxTime < 1)
    throw new Error("invalid current time or ledger");
  if (latest + broadcastLedgerMargin >= tx.ledgerBounds.maxLedger || now + broadcastSecondsMargin >= maxTime) return "envelope_expired";
  const account = await options.freshRpc.getAccount(context.agent);
  // Only the next agent sequence can still include these bytes; a consumed sequence is left to reconciliation.
  if (account.accountId() !== context.agent || BigInt(account.sequenceNumber()) + 1n !== BigInt(tx.sequence)) return "sequence_unavailable";
  try {
    const { readState } = foundationReader(options.freshRpc, { accountId: context.agent, sequence: account.sequenceNumber() }, latest, latest + 20);
    const state = await readState(context.contractId);
    if (state.revision !== context.policyRevision || state.balance < testReportAmount) return "preconditions_failed";
    assertPaymentPolicy(state.policy, { contract: context.contractId, agent: context.agent, asset: testnetUsdcContract, recipient: testReportRecipient, amount: testReportAmount });
  } catch { return "preconditions_failed"; }
  const renewed = await options.pool.query("SELECT wallet_private.renew_fixture($1,$2,$3,$4) AS owned", [lease.tenantId, lease.eventId, lease.token, options.leaseSeconds]);
  if (!renewed.rows[0]?.owned) return "lease_lost";
  const begun = await options.pool.query("SELECT wallet_private.begin_testnet_broadcast($1,$2,$3,$4,$5) AS begun",
    [lease.tenantId, lease.eventId, lease.token, options.attemptId, context.transactionHash]);
  if (begun.rows[0]?.begun !== true) return "not_authorized";
  // Fencing protects the database, not this external effect: every claimant can only send these same
  // immutable bytes (same hash and sequence), which Stellar includes at most once.
  try { await options.sendRpc.sendTransaction(tx); } catch { /* a lost response stays uncertain */ }
  return "submitted";
}
