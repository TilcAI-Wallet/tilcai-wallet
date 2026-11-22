import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Address, Keypair, Networks, StrKey, TransactionBuilder, nativeToScVal, rpc, xdr, type rpc as Rpc } from "@stellar/stellar-sdk";
import { makeTestEnvelope } from "./test-envelope.fixture.js";
import { verifyTestnetTransfer } from "./testnet-transfer.js";

const asset="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const recipient="GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
function event(source:string, options:{asset?:string; recipient?:string; amount?:bigint; map?:boolean}={}) {
  const data=options.map ? nativeToScVal({amount:options.amount ?? 5_000_000n},{type:{amount:["symbol","i128"]}}) : nativeToScVal(options.amount ?? 5_000_000n,{type:"i128"});
  return new xdr.ContractEvent({ext:xdr.ExtensionPoint.v0(),contractId:new xdr.ContractId(StrKey.decodeContract(options.asset ?? asset)),type:xdr.ContractEventType.contract,body:xdr.ContractEventBody.v0(new xdr.ContractEventV0({topics:[nativeToScVal("transfer",{type:"symbol"}),new Address(source).toScVal(),new Address(options.recipient ?? recipient).toScVal()],data}))});
}
function setup(events:xdr.ContractEvent[], sample:ReturnType<typeof makeTestEnvelope>) {
  const context={keyId:"test",tenantId:"tenant",orderId:"order",attemptId:"attempt",agent:sample.agent,contractId:sample.contractId,transactionHash:sample.hash,validThroughLedger:123};
  const decoded=TransactionBuilder.fromXDR(sample.bytes.toString("base64"),Networks.TESTNET);
  const server={getNetwork:async()=>({passphrase:Networks.TESTNET}),getTransaction:async()=>({status:rpc.Api.GetTransactionStatus.SUCCESS,txHash:sample.hash,ledger:110,envelopeXdr:decoded.toEnvelope(),events:{contractEventsXdr:[events]}})} as unknown as Pick<Rpc.Server,"getNetwork"|"getTransaction">;
  return {server,context};
}
test("SIMULATED: verified matching SEP-41 transfer is attributed to the exact signed invocation",async()=>{
  const sample=makeTestEnvelope();
  for (const map of [false,true]) {
    const {server,context}=setup([event(sample.contractId,{map})],sample);
    assert.deepEqual(await verifyTestnetTransfer(server,context,sample.bytes),{status:"verified",hash:sample.hash,ledger:110,eventIndex:0});
  }
});
test("SIMULATED: wrong asset, source, recipient, amount, missing or duplicate events never confirm",async()=>{
  const sample=makeTestEnvelope(), other=StrKey.encodeContract(randomBytes(32)), otherRecipient=Keypair.random().publicKey();
  for (const events of [[],[event(sample.contractId,{asset:other})],[event(other)],[event(sample.contractId,{recipient:otherRecipient})],[event(sample.contractId,{amount:5_000_001n})],[event(sample.contractId),event(sample.contractId)]]) {
    const {server,context}=setup(events,sample);
    assert.deepEqual(await verifyTestnetTransfer(server,context,sample.bytes),{status:"uncertain",reason:"unverified"});
  }
});
test("SIMULATED: missing transaction and timeout remain uncertain",async()=>{
  const sample=makeTestEnvelope(), {server,context}=setup([],sample);
  server.getTransaction=async()=>({status:rpc.Api.GetTransactionStatus.NOT_FOUND,txHash:sample.hash} as Rpc.Api.GetMissingTransactionResponse);
  assert.deepEqual(await verifyTestnetTransfer(server,context,sample.bytes),{status:"uncertain",reason:"not_found"});
  server.getTransaction=async()=>{throw new Error("timeout");};
  assert.deepEqual(await verifyTestnetTransfer(server,context,sample.bytes),{status:"uncertain",reason:"rpc_error"});
});
