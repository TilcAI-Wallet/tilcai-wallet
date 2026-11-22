import { randomBytes } from "node:crypto";
import { Account, Address, Contract, Keypair, Networks, Operation, StrKey, TransactionBuilder, nativeToScVal, xdr } from "@stellar/stellar-sdk";

/** Ephemeral test XDR. Never broadcast; no seed or private key is returned. */
export function makeTestEnvelope(network=Networks.TESTNET,signed=true) {
  const signer=Keypair.random(), contractId=StrKey.encodeContract(randomBytes(32));
  const args=[nativeToScVal(5_000_000n,{type:"i128"})];
  const invocation=new xdr.SorobanAuthorizedInvocation({function:xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(new xdr.InvokeContractArgs({contractAddress:new Address(contractId).toScAddress(),functionName:"spend",args})),subInvocations:[]});
  const auth=new xdr.SorobanAuthorizationEntry({credentials:xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),rootInvocation:invocation});
  const makeBuilder=()=>new TransactionBuilder(new Account(signer.publicKey(),"1"),{fee:"100",networkPassphrase:network});
  const raw=makeBuilder().addOperation(new Contract(contractId).call("spend",...args)).setTimeout(30).setLedgerbounds(100,123).build();
  const op=raw.operations[0]!;
  if (op.type!=="invokeHostFunction") throw new Error("unexpected test operation");
  const tx=makeBuilder().addOperation(Operation.invokeHostFunction({func:op.func,auth:[auth]})).setTimeout(30).setLedgerbounds(100,123).build();
  if (signed) tx.sign(signer);
  return {bytes:Buffer.from(tx.toEnvelope().toXDR()),hash:Buffer.from(tx.hash()).toString("hex"),agent:signer.publicKey(),contractId};
}
