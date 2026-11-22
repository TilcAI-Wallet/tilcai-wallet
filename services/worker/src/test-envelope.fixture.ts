import { randomBytes } from "node:crypto";
import { Account, Address, Contract, Keypair, Networks, Operation, StrKey, TransactionBuilder, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { testReportAmount, testReportRecipient } from "./testnet-constants.js";

export interface TestSpendArgs { amount?: bigint; recipient?: string; revision?: bigint; legacy?: boolean }
const spendArgs = (args: TestSpendArgs, revision: bigint) => args.legacy
  ? [nativeToScVal(args.amount ?? testReportAmount, { type: "i128" })]
  : [nativeToScVal(args.amount ?? testReportAmount, { type: "i128" }), new Address(args.recipient ?? testReportRecipient).toScVal(), nativeToScVal(args.revision ?? revision, { type: "u64" })];

/** Ephemeral test XDR. Never broadcast; no seed or private key is returned.
 * Default: WalletFoundation v2 spend(0.50, test recipient, revision). `operation` and `authorization`
 * override the arguments of each part independently to build mismatched or v1 envelopes. */
export function makeTestEnvelope(network = Networks.TESTNET, signed = true, options: { policyRevision?: bigint; operation?: TestSpendArgs; authorization?: TestSpendArgs } = {}) {
  const policyRevision = options.policyRevision ?? 0n;
  const signer = Keypair.random(), contractId = StrKey.encodeContract(randomBytes(32));
  const operationArgs = spendArgs(options.operation ?? {}, policyRevision);
  const authorizedArgs = spendArgs(options.authorization ?? options.operation ?? {}, policyRevision);
  const invocation = new xdr.SorobanAuthorizedInvocation({ function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(new xdr.InvokeContractArgs({ contractAddress: new Address(contractId).toScAddress(), functionName: "spend", args: authorizedArgs })), subInvocations: [] });
  const auth = new xdr.SorobanAuthorizationEntry({ credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(), rootInvocation: invocation });
  const makeBuilder = () => new TransactionBuilder(new Account(signer.publicKey(), "1"), { fee: "100", networkPassphrase: network });
  const raw = makeBuilder().addOperation(new Contract(contractId).call("spend", ...operationArgs)).setTimeout(30).setLedgerbounds(100, 123).build();
  const op = raw.operations[0]!;
  if (op.type !== "invokeHostFunction") throw new Error("unexpected test operation");
  const tx = makeBuilder().addOperation(Operation.invokeHostFunction({ func: op.func, auth: [auth] })).setTimeout(30).setLedgerbounds(100, 123).build();
  if (signed) tx.sign(signer);
  return { bytes: Buffer.from(tx.toEnvelope().toXDR()), hash: Buffer.from(tx.hash()).toString("hex"), agent: signer.publicKey(), contractId, policyRevision };
}
