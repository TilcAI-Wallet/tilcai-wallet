import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Address, Keypair, Networks, Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { assertPolicyRevision, isExpectedSpendCall } from "./spend-interface.js";

/** All fields in this metadata are authenticated by AES-GCM. Never put a key or XDR in logs. */
export interface EnvelopeContext {
  keyId: string;
  tenantId: string;
  orderId: string;
  attemptId: string;
  contractId: string;
  agent: string;
  transactionHash: string;
  validThroughLedger: number;
  /** WalletFoundation policy revision signed into spend(amount, recipient, expected_policy_revision). */
  policyRevision: bigint;
}
export interface EncryptedEnvelope { nonce: Buffer; ciphertext: Buffer; tag: Buffer; xdrDigest: Buffer }

function associatedData(context: EnvelopeContext): Buffer {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(context.keyId) || ![context.tenantId,context.orderId,context.attemptId,context.contractId,context.agent].every((x) => typeof x === "string" && x.length > 0 && x.length <= 256) ||
      !/^[0-9a-f]{64}$/.test(context.transactionHash) || !Number.isSafeInteger(context.validThroughLedger) || context.validThroughLedger < 1)
    throw new Error("invalid envelope context");
  assertPolicyRevision(context.policyRevision);
  // v2 binds the signed policy revision; v1 ciphertexts cannot authenticate under this format.
  return Buffer.from(JSON.stringify(["tilcai-envelope-v2",Networks.TESTNET,context.keyId,context.tenantId,context.orderId,context.attemptId,context.contractId,context.agent,context.transactionHash,context.validThroughLedger,context.policyRevision.toString()]),"utf8");
}
/** Accepts only a signed WalletFoundation v2 spend(amount, recipient, expected_policy_revision)
 * whose operation and Soroban authorization carry exactly the expected three arguments. */
export function verifySignedSpendEnvelope(envelope: Buffer, context: EnvelopeContext): Buffer {
  assertPolicyRevision(context.policyRevision);
  if (envelope.length < 1 || envelope.length > 1048576) throw new Error("invalid envelope length");
  let transaction: ReturnType<typeof TransactionBuilder.fromXDR>;
  try { transaction = TransactionBuilder.fromXDR(envelope.toString("base64"), Networks.TESTNET); }
  catch { throw new Error("invalid Stellar envelope"); }
  if (!(transaction instanceof Transaction)) throw new Error("fee bump is not supported");
  const canonical = Buffer.from(transaction.toEnvelope().toXDR());
  if (!canonical.equals(envelope) || Buffer.from(transaction.hash()).toString("hex") !== context.transactionHash) throw new Error("envelope hash mismatch");
  let signer: Keypair;
  try { signer = Keypair.fromPublicKey(context.agent); } catch { throw new Error("invalid agent"); }
  if (transaction.source !== context.agent || transaction.signatures.length !== 1 || !signer.verify(transaction.hash(),transaction.signatures[0]!.signature)) throw new Error("invalid agent envelope signature");
  if (!transaction.timeBounds || BigInt(transaction.timeBounds.maxTime) <= 0n || !transaction.ledgerBounds || transaction.ledgerBounds.maxLedger !== context.validThroughLedger || BigInt(transaction.fee) > 2_000_000n || transaction.operations.length !== 1) throw new Error("invalid transaction bounds");
  const operation=transaction.operations[0]!;
  if (operation.type !== "invokeHostFunction" || operation.source || operation.func.type !== "hostFunctionTypeInvokeContract") throw new Error("unsupported envelope operation");
  const call=operation.func.invokeContract;
  if (!isExpectedSpendCall(Address.fromScAddress(call.contractAddress).toString(),call.functionName.toString(),call.args,context.contractId,context.policyRevision)) throw new Error("unexpected envelope invocation");
  if (!operation.auth || operation.auth.length !== 1 || operation.auth[0]!.credentials.type !== "sorobanCredentialsSourceAccount") throw new Error("unsupported envelope authorization");
  const invocation=operation.auth[0]!.rootInvocation;
  if (invocation.function.type !== "sorobanAuthorizedFunctionTypeContractFn" || invocation.subInvocations.length !== 0) throw new Error("unsupported envelope authorization tree");
  const authorized=invocation.function.contractFn;
  if (!isExpectedSpendCall(Address.fromScAddress(authorized.contractAddress).toString(),authorized.functionName.toString(),authorized.args,context.contractId,context.policyRevision)) throw new Error("unexpected envelope authorization");
  return createHash("sha256").update(envelope).digest();
}
export function sealEnvelope(key: Buffer, context: EnvelopeContext, envelope: Buffer): EncryptedEnvelope {
  if (key.length !== 32) throw new Error("envelope key must be 32 bytes");
  const aad = associatedData(context);
  const xdrDigest = verifySignedSpendEnvelope(envelope, context);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm",key,nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(envelope),cipher.final()]);
  return { nonce,ciphertext,tag:cipher.getAuthTag(),xdrDigest };
}
export function openEnvelope(key: Buffer, context: EnvelopeContext, sealed: EncryptedEnvelope): Buffer {
  if (key.length !== 32 || sealed.nonce.length !== 12 || sealed.tag.length !== 16 || sealed.xdrDigest.length !== 32 || sealed.ciphertext.length > 1048576) throw new Error("invalid encrypted envelope");
  const aad = associatedData(context);
  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm",key,sealed.nonce);
    decipher.setAAD(aad); decipher.setAuthTag(sealed.tag);
    plaintext = Buffer.concat([decipher.update(sealed.ciphertext),decipher.final()]);
  } catch { throw new Error("encrypted envelope authentication failed"); }
  const digest = verifySignedSpendEnvelope(plaintext,context);
  if (!timingSafeEqual(digest,sealed.xdrDigest)) throw new Error("envelope digest mismatch");
  return plaintext;
}
