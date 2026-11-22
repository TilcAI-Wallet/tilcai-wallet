import { Networks, Transaction, TransactionBuilder, type rpc } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { loadTestnetEnvelope, type EnvelopeLease } from "./postgres-envelope-vault.js";

type BroadcastRpc = Pick<rpc.Server,"getNetwork"|"getLatestLedger"|"sendTransaction">;
export type BroadcastResult = {status:"disabled"|"lease_lost"|"expired"|"uncertain"};
/** Explicit opt-in only. The caller must inject a trusted RPC; this function is not wired into the running worker. */
export async function broadcastStoredTestnet(options:{
  pool:Pool; rpc:BroadcastRpc; lease:EnvelopeLease; attemptId:string;
  keyForId:(id:string)=>Promise<Buffer>; verifyFreshPolicy:(context: import("./envelope-vault.js").EnvelopeContext)=>Promise<boolean>; broadcastEnabled?:boolean; nowSeconds:()=>number;
}):Promise<BroadcastResult> {
  if (options.broadcastEnabled !== true) return {status:"disabled"};
  const loaded=await loadTestnetEnvelope(options.pool,options.lease,options.attemptId,options.keyForId);
  if (!loaded) return {status:"lease_lost"};
  const network=await options.rpc.getNetwork();
  if (network.passphrase!==Networks.TESTNET) throw new Error("network mismatch");
  const ledger=(await options.rpc.getLatestLedger()).sequence;
  const tx=TransactionBuilder.fromXDR(loaded.envelope.toString("base64"),Networks.TESTNET);
  if (!(tx instanceof Transaction) || !tx.timeBounds || !tx.ledgerBounds) throw new Error("invalid stored transaction");
  const now=options.nowSeconds();
  if (!Number.isSafeInteger(now) || now<1 || !Number.isSafeInteger(ledger) || ledger<1) throw new Error("invalid current time or ledger");
  const maxTime=Number(tx.timeBounds.maxTime);
  if (!Number.isSafeInteger(maxTime) || maxTime<1) throw new Error("invalid transaction expiry");
  if (now>=maxTime || ledger>=tx.ledgerBounds.maxLedger) return {status:"expired"};
  if (!await options.verifyFreshPolicy(loaded.context)) throw new Error("fresh policy verification failed");
  const renewed=await options.pool.query("SELECT wallet_private.renew_fixture($1,$2,$3,30) AS owned",[options.lease.tenantId,options.lease.eventId,options.lease.token]);
  if (!renewed.rows[0].owned) return {status:"lease_lost"};
  const marked=await options.pool.query("SELECT wallet_private.mark_testnet_uncertain($1,$2,$3,$4,$5) AS changed",[options.lease.tenantId,options.lease.eventId,options.lease.token,options.attemptId,loaded.context.transactionHash]);
  if (!marked.rows[0].changed) return {status:"lease_lost"};
  // Fencing protects DB writes, not this external effect. All claimants recover the
  // same immutable XDR; even a stale process can only submit that same transaction.
  try { await options.rpc.sendTransaction(tx); } catch { /* lost response remains uncertain */ }
  return {status:"uncertain"};
}
