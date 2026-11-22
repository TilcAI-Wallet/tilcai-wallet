import { Address, Contract, Keypair, Networks, nativeToScVal, rpc } from "@stellar/stellar-sdk";
import { assertPaymentPolicy } from "./payment-safety.js";
import { assertPolicyRevision, isExpectedSpendCall } from "./spend-interface.js";
import { envelopeValidityLedgers, foundationReader } from "./wallet-foundation-state.js";
import { testReportAmount, testReportRecipient, testnetUsdcContract } from "./testnet-constants.js";

const exhaustedDemo = "CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6";
type ReadRpc = Pick<rpc.Server, "getNetwork" | "getLatestLedger" | "getAccount" | "simulateTransaction">;
export interface AgentSigner { publicKey: string; signHash(hash: Uint8Array): Promise<Uint8Array> }
export interface PreparedSpend { envelope: Buffer; hash: string; validThroughLedger: number; policyRevision: bigint }

/** Builds, simulates and signs only. This module has no broadcast method.
 * Requires WalletFoundation v2 and the reviewed policy revision; signs exactly
 * spend(0.50 USDC, test recipient, expected_policy_revision). */
export async function prepareTestnetDryRun(server: ReadRpc, signer: AgentSigner, contractId: string, expectedPolicyRevision: bigint): Promise<PreparedSpend> {
  assertPolicyRevision(expectedPolicyRevision);
  if (contractId === exhaustedDemo) throw new Error("historical contract is exhausted");
  const contract = new Contract(contractId);
  const agent = Keypair.fromPublicKey(signer.publicKey);
  const network = await server.getNetwork();
  if (network.passphrase !== Networks.TESTNET) throw new Error("network mismatch");
  const latest = (await server.getLatestLedger()).sequence;
  if (!Number.isSafeInteger(latest) || latest < 1 || latest > 0xffffffff - envelopeValidityLedgers) throw new Error("invalid ledger");
  const validThroughLedger = latest + envelopeValidityLedgers;
  const source = await server.getAccount(signer.publicKey);
  if (source.accountId() !== signer.publicKey) throw new Error("source account mismatch");
  const { build, simulate, readState } = foundationReader(server, { accountId: signer.publicKey, sequence: source.sequenceNumber() }, latest, validThroughLedger);
  const { policy, revision, balance } = await readState(contractId);
  if (revision !== expectedPolicyRevision) throw new Error("policy revision differs from the reviewed revision");
  assertPaymentPolicy(policy,{contract:contractId,agent:signer.publicKey,asset:testnetUsdcContract,recipient:testReportRecipient,amount:testReportAmount});
  if (balance < testReportAmount) throw new Error("insufficient on-chain balance");
  const rawTx = build(contract.call("spend",nativeToScVal(testReportAmount,{type:"i128"}),new Address(testReportRecipient).toScVal(),nativeToScVal(revision,{type:"u64"})));
  // A policy change after policy_state makes this simulation fail with PolicyChanged.
  const simulation = await simulate(rawTx);
  const auth = simulation.result!.auth;
  // Only a single source-account agent authorization is supported. Separate Soroban
  // address signatures and delegated auth fail closed until explicitly implemented.
  if (auth.length !== 1 || auth[0]!.credentials.type !== "sorobanCredentialsSourceAccount") throw new Error("unsupported Soroban authorization");
  const invocation = auth[0]!.rootInvocation;
  if (invocation.function.type !== "sorobanAuthorizedFunctionTypeContractFn" || invocation.subInvocations.length !== 0) throw new Error("unexpected authorization tree");
  const call = invocation.function.contractFn;
  if (!isExpectedSpendCall(Address.fromScAddress(call.contractAddress).toString(),call.functionName.toString(),call.args,contractId,revision)) throw new Error("unexpected authorized invocation");
  const transaction = rpc.assembleTransaction(rawTx,simulation).build();
  if (BigInt(transaction.fee) > 2_000_000n) throw new Error("simulation fee exceeds limit");
  const signature = await signer.signHash(transaction.hash());
  if (signature.length !== 64 || !agent.verify(transaction.hash(),signature)) throw new Error("invalid agent signature");
  transaction.addSignature(signer.publicKey,Buffer.from(signature).toString("base64"));
  return { envelope:Buffer.from(transaction.toEnvelope().toXDR()),hash:Buffer.from(transaction.hash()).toString("hex"),validThroughLedger,policyRevision:revision };
}
