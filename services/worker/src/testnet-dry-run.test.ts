import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Account, Address, Keypair, Networks, SorobanDataBuilder, StrKey, TransactionBuilder, nativeToScVal, xdr, type rpc } from "@stellar/stellar-sdk";
import { prepareTestnetDryRun } from "./testnet-dry-run.js";

const asset="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const recipient="GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
function setup(overrides: Record<string,unknown> = {}) {
  const signer=Keypair.random(); const contract=StrKey.encodeContract(randomBytes(32));
  const policy={agent:signer.publicKey(),asset,recipient,frozen:false,max_per_payment:5_000_000n,limit:5_000_000n,spent:0n,...overrides};
  const invocation=new xdr.SorobanAuthorizedInvocation({function:xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(new xdr.InvokeContractArgs({contractAddress:new Address(contract).toScAddress(),functionName:"spend",args:[nativeToScVal(5_000_000n,{type:"i128"})]})),subInvocations:[]});
  const auth=new xdr.SorobanAuthorizationEntry({credentials:xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),rootInvocation:invocation});
  const policyVal=nativeToScVal(policy,{type:{max_per_payment:["symbol","i128"],limit:["symbol","i128"],spent:["symbol","i128"]}});
  let calls=0;
  const server={async getNetwork(){return {passphrase:Networks.TESTNET,protocolVersion:"1"};},async getLatestLedger(){return {sequence:100};},async getAccount(){return new Account(signer.publicKey(),"42");},async simulateTransaction(){calls++;return {id:"mock",latestLedger:100,events:[],_parsed:true,transactionData:new SorobanDataBuilder().setResourceFee("1000"),minResourceFee:"1000",result:{retval:calls===1?policyVal:calls===2?nativeToScVal(200_000_000n,{type:"i128"}):nativeToScVal(null),auth:calls===3?[auth]:[]}};}} as unknown as Pick<rpc.Server,"getNetwork"|"getLatestLedger"|"getAccount"|"simulateTransaction">;
  return {server,signer,contract};
}
test("dry run constructs and signs a bounded Soroban transaction without broadcasting",async()=>{
  const {server,signer,contract}=setup();
  const result=await prepareTestnetDryRun(server,{publicKey:signer.publicKey(),signHash:async(hash)=>signer.sign(hash)},contract);
  const decoded=TransactionBuilder.fromXDR(result.envelope.toString("base64"),Networks.TESTNET);
  assert.equal(Buffer.from(decoded.hash()).toString("hex"),result.hash);
  assert.equal(result.validThroughLedger,120);
  assert.equal(decoded.signatures.length,1);
});
test("dry run rejects incorrect policy and absent fee payer signature",async()=>{
  for (const policy of [{frozen:true},{spent:5_000_000n},{asset:"incorrect"},{recipient:"incorrect"},{agent:Keypair.random().publicKey()}]) {
    const {server,signer,contract}=setup(policy);
    await assert.rejects(()=>prepareTestnetDryRun(server,{publicKey:signer.publicKey(),signHash:async(hash)=>signer.sign(hash)},contract));
  }
  const {server,signer,contract}=setup();
  await assert.rejects(()=>prepareTestnetDryRun(server,{publicKey:signer.publicKey(),signHash:async()=>new Uint8Array(64)},contract),/invalid agent signature/);
});

test("dry run fails closed on wrong network and missing Soroban authorization",async()=>{
  const wrong=setup();
  wrong.server.getNetwork=async()=>({passphrase:Networks.PUBLIC,protocolVersion:"1"});
  await assert.rejects(()=>prepareTestnetDryRun(wrong.server,{publicKey:wrong.signer.publicKey(),signHash:async(hash)=>wrong.signer.sign(hash)},wrong.contract),/network mismatch/);
  const missing=setup(); const original=missing.server.simulateTransaction.bind(missing.server); let count=0;
  missing.server.simulateTransaction=async (...args) => {
    const response=await original(...args); count++;
    if (count===3 && "result" in response && response.result) return {...response,result:{...response.result,auth:[]}};
    return response;
  };
  await assert.rejects(()=>prepareTestnetDryRun(missing.server,{publicKey:missing.signer.publicKey(),signHash:async(hash)=>missing.signer.sign(hash)},missing.contract),/unsupported Soroban authorization/);
});

test("preflight seals the signed bytes before returning and fails if the lease is lost",async()=>{
  const { prepareAndPersistTestnet } = await import("./testnet-preflight.js");
  const { openEnvelope } = await import("./envelope-vault.js");
  const key=randomBytes(32), resource={orderId:"order",attemptId:"attempt",contractId:"",keyId:"test-key"};
  const lease={tenantId:"tenant",eventId:"event",token:"lease"};
  const run=setup(); resource.contractId=run.contract;
  let parameters: unknown[] = [];
  const pool={query:async(_sql:string,args:unknown[])=>{parameters=args;return {rows:[{stored:true}]};}} as unknown as import("pg").Pool;
  const result=await prepareAndPersistTestnet(pool,run.server,{publicKey:run.signer.publicKey(),signHash:async(hash)=>run.signer.sign(hash)},lease,resource,key);
  const restored=openEnvelope(key,{...resource,agent:run.signer.publicKey(),tenantId:lease.tenantId,transactionHash:result.hash,validThroughLedger:result.validThroughLedger},{nonce:parameters[10] as Buffer,ciphertext:parameters[11] as Buffer,tag:parameters[12] as Buffer,xdrDigest:parameters[13] as Buffer});
  assert.equal(Buffer.from(TransactionBuilder.fromXDR(restored.toString("base64"),Networks.TESTNET).hash()).toString("hex"),result.hash);
  const again=setup();
  const rejected={query:async()=>({rows:[{stored:false}]})} as unknown as import("pg").Pool;
  await assert.rejects(()=>prepareAndPersistTestnet(rejected,again.server,{publicKey:again.signer.publicKey(),signHash:async(hash)=>again.signer.sign(hash)},lease,{...resource,contractId:again.contract},key),/not persisted/);
});
