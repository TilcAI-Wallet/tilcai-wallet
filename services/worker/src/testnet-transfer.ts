import { Networks, StrKey, Transaction, TransactionBuilder, rpc, scValToNative, type xdr } from "@stellar/stellar-sdk";
import { verifySignedSpendEnvelope, type EnvelopeContext } from "./envelope-vault.js";

const usdc = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const recipient = "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
type ReadRpc = Pick<rpc.Server,"getNetwork"|"getTransaction">;
export type TransferObservation =
  | { status:"uncertain"; reason:"not_found"|"rpc_error"|"unverified" }
  | { status:"verified"; hash:string; ledger:number; eventIndex:number };

/** Verify one SEP-41 transfer in the single operation's RPC transaction events.
 * The RPC endpoint itself must be trusted. No state is changed here. */
export async function verifyTestnetTransfer(server: ReadRpc, context: EnvelopeContext, signedEnvelope: Buffer): Promise<TransferObservation> {
  verifySignedSpendEnvelope(signedEnvelope,context);
  if ((await server.getNetwork()).passphrase !== Networks.TESTNET) throw new Error("network mismatch");
  let result: rpc.Api.GetTransactionResponse;
  try { result = await server.getTransaction(context.transactionHash); }
  catch { return {status:"uncertain",reason:"rpc_error"}; }
  if (result.txHash.toLowerCase() !== context.transactionHash) return {status:"uncertain",reason:"unverified"};
  if (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) return {status:"uncertain",reason:"not_found"};
  if (result.status !== rpc.Api.GetTransactionStatus.SUCCESS || !Number.isSafeInteger(result.ledger) || result.ledger < 1 || !Buffer.from(result.envelopeXdr.toXDR()).equals(signedEnvelope)) return {status:"uncertain",reason:"unverified"};
  const transaction = TransactionBuilder.fromXDR(signedEnvelope.toString("base64"),Networks.TESTNET);
  if (!(transaction instanceof Transaction) || !transaction.ledgerBounds || result.ledger < transaction.ledgerBounds.minLedger || result.ledger >= transaction.ledgerBounds.maxLedger) return {status:"uncertain",reason:"unverified"};
  const groups = result.events?.contractEventsXdr;
  if (!Array.isArray(groups) || groups.length !== 1 || !Array.isArray(groups[0])) return {status:"uncertain",reason:"unverified"};
  const matches: number[] = [];
  for (const [index,event] of groups[0].entries()) if (isTransfer(event,context.contractId)) matches.push(index);
  if (matches.length !== 1) return {status:"uncertain",reason:"unverified"};
  return {status:"verified",hash:context.transactionHash,ledger:result.ledger,eventIndex:matches[0]!};
}
function isTransfer(event: xdr.ContractEvent,source: string): boolean {
  try {
    if (!event.contractId || StrKey.encodeContract(event.contractId.toBytes()) !== usdc || event.type.name !== "contract" || event.body.type !== "v0") return false;
    const { topics,data } = event.body.v0;
    if (topics.length !== 3 || topics[0]!.type !== "scvSymbol" || topics[1]!.type !== "scvAddress" || topics[2]!.type !== "scvAddress") return false;
    if (scValToNative(topics[0]!) !== "transfer" || scValToNative(topics[1]!) !== source || scValToNative(topics[2]!) !== recipient) return false;
    if (data.type === "scvI128") return scValToNative(data) === 5_000_000n;
    if (data.type !== "scvMap") return false;
    const map = scValToNative(data) as Record<string,unknown>;
    return map.amount === 5_000_000n && (map.to_muxed_id === undefined || map.to_muxed_id === null);
  } catch { return false; }
}
