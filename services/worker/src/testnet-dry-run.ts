import { Account, Address, Contract, Keypair, Networks, TransactionBuilder, nativeToScVal, rpc, scValToNative } from "@stellar/stellar-sdk";
import { assertPaymentPolicy, type PaymentPolicy } from "./payment-safety.js";

const asset = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const recipient = "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
const exhaustedDemo = "CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6";
type ReadRpc = Pick<rpc.Server, "getNetwork" | "getLatestLedger" | "getAccount" | "simulateTransaction">;
export interface AgentSigner { publicKey: string; signHash(hash: Uint8Array): Promise<Uint8Array> }

/** Builds, simulates and signs only. This module has no broadcast method. */
export async function prepareTestnetDryRun(server: ReadRpc, signer: AgentSigner, contractId: string): Promise<{ envelope: Buffer; hash: string; validThroughLedger: number }> {
  if (contractId === exhaustedDemo) throw new Error("historical contract is exhausted");
  const contract = new Contract(contractId);
  const agent = Keypair.fromPublicKey(signer.publicKey);
  const network = await server.getNetwork();
  if (network.passphrase !== Networks.TESTNET) throw new Error("network mismatch");
  const latest = (await server.getLatestLedger()).sequence;
  if (!Number.isSafeInteger(latest) || latest < 1 || latest > 0xffffffff - 20) throw new Error("invalid ledger");
  const validThroughLedger = latest + 20;
  const source = await server.getAccount(signer.publicKey);
  if (source.accountId() !== signer.publicKey) throw new Error("source account mismatch");
  const build = (operation: ReturnType<Contract["call"]>) => new TransactionBuilder(new Account(signer.publicKey,source.sequenceNumber()),{fee:"100",networkPassphrase:Networks.TESTNET})
    .addOperation(operation).setTimeout(120).setLedgerbounds(latest,validThroughLedger).build();
  async function simulate(tx: ReturnType<typeof build>) {
    const sim = await server.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || rpc.Api.isSimulationRestore(sim) || !sim.result || sim.latestLedger < latest || sim.latestLedger > latest + 5) throw new Error("simulation unavailable or stale");
    return sim;
  }
  const policyResult = await simulate(build(contract.call("policy")));
  const raw = scValToNative(policyResult.result!.retval) as Record<string, unknown>;
  if (typeof raw !== "object" || raw === null || typeof raw.agent !== "string" || typeof raw.asset !== "string" || typeof raw.recipient !== "string" || typeof raw.frozen !== "boolean" || typeof raw.max_per_payment !== "bigint" || typeof raw.limit !== "bigint" || typeof raw.spent !== "bigint") throw new Error("invalid on-chain policy");
  const policy: PaymentPolicy = {contract:contractId,agent:raw.agent,asset:raw.asset,recipient:raw.recipient,frozen:raw.frozen,maxPerPayment:raw.max_per_payment,limit:raw.limit,spent:raw.spent};
  assertPaymentPolicy(policy,{contract:contractId,agent:signer.publicKey,asset,recipient,amount:5_000_000n});
  const balanceResult = await simulate(build(new Contract(asset).call("balance",new Address(contractId).toScVal())));
  const balance = scValToNative(balanceResult.result!.retval);
  if (typeof balance !== "bigint" || balance < 5_000_000n) throw new Error("insufficient on-chain balance");
  const rawTx = build(contract.call("spend",nativeToScVal(5_000_000n,{type:"i128"})));
  const simulation = await simulate(rawTx);
  const auth = simulation.result!.auth;
  // Only a single source-account agent authorization is supported. Separate Soroban
  // address signatures and delegated auth fail closed until explicitly implemented.
  if (auth.length !== 1 || auth[0]!.credentials.type !== "sorobanCredentialsSourceAccount") throw new Error("unsupported Soroban authorization");
  const invocation = auth[0]!.rootInvocation;
  if (invocation.function.type !== "sorobanAuthorizedFunctionTypeContractFn" || invocation.subInvocations.length !== 0) throw new Error("unexpected authorization tree");
  const call = invocation.function.contractFn;
  if (Address.fromScAddress(call.contractAddress).toString() !== contractId || call.functionName.toString() !== "spend" || call.args.length !== 1 || scValToNative(call.args[0]!) !== 5_000_000n) throw new Error("unexpected authorized invocation");
  const transaction = rpc.assembleTransaction(rawTx,simulation).build();
  if (BigInt(transaction.fee) > 2_000_000n) throw new Error("simulation fee exceeds limit");
  const signature = await signer.signHash(transaction.hash());
  if (signature.length !== 64 || !agent.verify(transaction.hash(),signature)) throw new Error("invalid agent signature");
  transaction.addSignature(signer.publicKey,Buffer.from(signature).toString("base64"));
  return { envelope:Buffer.from(transaction.toEnvelope().toXDR()),hash:Buffer.from(transaction.hash()).toString("hex"),validThroughLedger };
}
