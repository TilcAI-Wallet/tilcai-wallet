import { Networks, Transaction, TransactionBuilder, rpc } from "@stellar/stellar-sdk";

type ReadRpc = Pick<rpc.Server,"getNetwork"|"getTransaction">;
export type LookupObservation =
  | { status:"uncertain"; reason:"not_found"|"rpc_error" }
  | { status:"unverified"; rpcStatus:"SUCCESS"|"FAILED"; ledger:number };

/** Read-only observation: even SUCCESS requires separate transfer-event verification. */
export async function observeTestnetHash(server: ReadRpc, hash: string): Promise<LookupObservation> {
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error("invalid transaction hash");
  const network = await server.getNetwork();
  if (network.passphrase !== Networks.TESTNET) throw new Error("network mismatch");
  let result: rpc.Api.GetTransactionResponse;
  try { result = await server.getTransaction(hash); }
  catch { return {status:"uncertain",reason:"rpc_error"}; }
  if (result.txHash.toLowerCase() !== hash) throw new Error("RPC transaction hash mismatch");
  if (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) return {status:"uncertain",reason:"not_found"};
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS && result.status !== rpc.Api.GetTransactionStatus.FAILED) throw new Error("unknown RPC status");
  if (!Number.isSafeInteger(result.ledger) || result.ledger < 1) throw new Error("invalid ledger");
  const tx = TransactionBuilder.fromXDR(Buffer.from(result.envelopeXdr.toXDR()).toString("base64"),Networks.TESTNET);
  if (!(tx instanceof Transaction) || Buffer.from(tx.hash()).toString("hex") !== hash) throw new Error("RPC envelope mismatch");
  return {status:"unverified",rpcStatus:result.status,ledger:result.ledger};
}
