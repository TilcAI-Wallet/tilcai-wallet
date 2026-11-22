import type { Pool } from "pg";
import { openEnvelope, sealEnvelope, type EnvelopeContext } from "./envelope-vault.js";
import { LegacyEnvelopeError } from "./spend-interface.js";

export interface EnvelopeLease { tenantId: string; eventId: string; token: string }
/** The SQL function commits the ciphertext and prepared attempt in one statement. */
export async function storeTestnetEnvelope(pool: Pool, lease: EnvelopeLease, context: EnvelopeContext, key: Buffer, envelope: Buffer): Promise<boolean> {
  if (lease.tenantId !== context.tenantId) throw new Error("tenant mismatch");
  const sealed = sealEnvelope(key,context,envelope);
  const result = await pool.query("SELECT wallet_private.store_testnet_envelope($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) AS stored",[
    lease.tenantId,lease.eventId,lease.token,context.attemptId,context.orderId,context.contractId,context.agent,
    context.transactionHash,context.validThroughLedger,context.keyId,sealed.nonce,sealed.ciphertext,sealed.tag,sealed.xdrDigest,
    context.policyRevision.toString(),
  ]);
  return result.rows[0].stored === true;
}
/** Only a currently fenced lease can resolve encrypted bytes; keys remain external.
 * A v1 envelope throws LegacyEnvelopeError before decryption: it is never re-signed automatically. */
export async function loadTestnetEnvelope(pool: Pool, lease: EnvelopeLease, attemptId: string, keyForId: (keyId: string) => Promise<Buffer>): Promise<{ context: EnvelopeContext; envelope: Buffer } | null> {
  const result = await pool.query("SELECT * FROM wallet_private.load_testnet_envelope($1,$2,$3,$4)",[lease.tenantId,lease.eventId,lease.token,attemptId]);
  const row = result.rows[0]; if (!row) return null;
  if (Number(row.spend_interface) !== 2 || row.policy_revision === null || row.policy_revision === undefined) throw new LegacyEnvelopeError();
  const context: EnvelopeContext = {keyId:row.key_id,tenantId:lease.tenantId,orderId:row.order_id,attemptId,contractId:row.contract_id,agent:row.agent,transactionHash:row.tx_hash,validThroughLedger:Number(row.valid_through_ledger),policyRevision:BigInt(row.policy_revision)};
  const key = await keyForId(context.keyId);
  const envelope = openEnvelope(key,context,{nonce:row.nonce,ciphertext:row.ciphertext,tag:row.tag,xdrDigest:row.xdr_digest});
  return { context,envelope };
}
