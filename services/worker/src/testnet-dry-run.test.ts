import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Account, Address, Keypair, Networks, SorobanDataBuilder, StrKey, TransactionBuilder, nativeToScVal, scValToNative, xdr, type rpc } from "@stellar/stellar-sdk";
import { verifySignedSpendEnvelope } from "./envelope-vault.js";
import { prepareTestnetDryRun } from "./testnet-dry-run.js";

const asset="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const recipient="GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
const otherAccount="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
type ReadRpc = Pick<rpc.Server,"getNetwork"|"getLatestLedger"|"getAccount"|"simulateTransaction">;
type InvokedCall = { func: { invokeContract: { functionName: { toString(): string }; args: xdr.ScVal[] } } };
interface Chain { version: number; revision: bigint; policy: Record<string,unknown>; balance: bigint; authArgs?: xdr.ScVal[]; afterPolicyState?: (chain: Chain) => void }

/** SIMULATED Soroban RPC: answers by invoked function and enforces spend's revision check like the v2 contract. */
function setup(policyOverrides: Record<string,unknown> = {}, chainOverrides: Partial<Chain> = {}) {
  const signer=Keypair.random(); const contract=StrKey.encodeContract(randomBytes(32));
  const chain: Chain={version:2,revision:0n,balance:200_000_000n,policy:{agent:signer.publicKey(),asset,recipient,frozen:false,max_per_payment:5_000_000n,limit:5_000_000n,spent:0n,...policyOverrides},...chainOverrides};
  const calls: string[]=[]; let signatures=0;
  const ok=(retval: xdr.ScVal, auth: xdr.SorobanAuthorizationEntry[] = [])=>({id:"mock",latestLedger:100,events:[],_parsed:true,transactionData:new SorobanDataBuilder().setResourceFee("1000"),minResourceFee:"1000",result:{retval,auth}});
  const server={
    async getNetwork(){return {passphrase:Networks.TESTNET,protocolVersion:"1"};},
    async getLatestLedger(){return {sequence:100};},
    async getAccount(){return new Account(signer.publicKey(),"42");},
    async simulateTransaction(tx: { operations: unknown[] }){
      const call=(tx.operations[0] as InvokedCall).func.invokeContract; const name=call.functionName.toString(); calls.push(name);
      if (name==="version") return ok(nativeToScVal(chain.version,{type:"u32"}));
      if (name==="policy_state") {
        const policyVal=nativeToScVal(chain.policy,{type:{max_per_payment:["symbol","i128"],limit:["symbol","i128"],spent:["symbol","i128"]}});
        const result=ok(xdr.ScVal.scvVec([policyVal,nativeToScVal(chain.revision,{type:"u64"})]));
        chain.afterPolicyState?.(chain);
        return result;
      }
      if (name==="balance") return ok(nativeToScVal(chain.balance,{type:"i128"}));
      if (name==="spend") {
        if (call.args.length!==3 || scValToNative(call.args[2]!)!==chain.revision || scValToNative(call.args[1]!)!==chain.policy.recipient)
          return {id:"mock",latestLedger:100,events:[],_parsed:true,error:"HostError: Error(Contract, #5)"};
        const invocation=new xdr.SorobanAuthorizedInvocation({function:xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(new xdr.InvokeContractArgs({contractAddress:new Address(contract).toScAddress(),functionName:"spend",args:chain.authArgs ?? call.args})),subInvocations:[]});
        return ok(nativeToScVal(null),[new xdr.SorobanAuthorizationEntry({credentials:xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),rootInvocation:invocation})]);
      }
      throw new Error(`unexpected simulated call ${name}`);
    },
  } as unknown as ReadRpc;
  const agentSigner={publicKey:signer.publicKey(),signHash:async(hash: Uint8Array)=>{signatures++;return signer.sign(Buffer.from(hash));}};
  return {server,signer,agentSigner,contract,chain,calls,signatures:()=>signatures};
}
const spendArgs=(revision: bigint, to=recipient)=>[nativeToScVal(5_000_000n,{type:"i128"}),new Address(to).toScVal(),nativeToScVal(revision,{type:"u64"})];

test("v2 preflight signs exactly spend(amount, recipient, expected_policy_revision) without broadcasting",async()=>{
  for (const revision of [0n,7n]) {
    const s=setup({}, {revision});
    const result=await prepareTestnetDryRun(s.server,s.agentSigner,s.contract,revision);
    assert.deepEqual(s.calls,["version","policy_state","balance","spend"]);
    assert.equal(result.policyRevision,revision);
    assert.equal(result.validThroughLedger,220);
    const decoded=TransactionBuilder.fromXDR(result.envelope.toString("base64"),Networks.TESTNET);
    assert.equal(Buffer.from(decoded.hash()).toString("hex"),result.hash);
    assert.equal(decoded.signatures.length,1);
    // The independent envelope verifier accepts the same bytes for the same revision only.
    const context={keyId:"k",tenantId:"t",orderId:"o",attemptId:"a",contractId:s.contract,agent:s.signer.publicKey(),transactionHash:result.hash,validThroughLedger:result.validThroughLedger,policyRevision:revision};
    assert.equal(verifySignedSpendEnvelope(result.envelope,context).length,32);
    assert.throws(()=>verifySignedSpendEnvelope(result.envelope,{...context,policyRevision:revision+1n}),/unexpected envelope invocation/);
  }
});

test("v1 contracts and unreviewed or changed policy revisions are rejected before signing",async()=>{
  const v1=setup({}, {version:1});
  await assert.rejects(()=>prepareTestnetDryRun(v1.server,v1.agentSigner,v1.contract,0n),/v2 required/);
  assert.deepEqual(v1.calls,["version"]); assert.equal(v1.signatures(),0);
  // set_policy happened after the card was reviewed: on-chain revision 1, reviewed 0.
  const changed=setup({}, {revision:1n});
  await assert.rejects(()=>prepareTestnetDryRun(changed.server,changed.agentSigner,changed.contract,0n),/reviewed revision/);
  assert.equal(changed.calls.includes("spend"),false); assert.equal(changed.signatures(),0);
  const invalid=setup();
  await assert.rejects(()=>prepareTestnetDryRun(invalid.server,invalid.agentSigner,invalid.contract,-1n),/invalid policy revision/);
  assert.equal(invalid.calls.length,0);
});

test("a policy change between policy_state and the spend simulation is never signed",async()=>{
  const raced=setup({}, {afterPolicyState:(chain)=>{ chain.revision=1n; }});
  await assert.rejects(()=>prepareTestnetDryRun(raced.server,raced.agentSigner,raced.contract,0n),/simulation unavailable/);
  assert.equal(raced.signatures(),0);
  const redirected=setup({}, {afterPolicyState:(chain)=>{ chain.policy={...chain.policy,recipient:otherAccount}; }});
  await assert.rejects(()=>prepareTestnetDryRun(redirected.server,redirected.agentSigner,redirected.contract,0n),/simulation unavailable/);
  assert.equal(redirected.signatures(),0);
});

test("authorization entries with altered recipient, revision or v1 arguments are rejected",async()=>{
  for (const authArgs of [spendArgs(0n,otherAccount),spendArgs(1n),[nativeToScVal(5_000_000n,{type:"i128"})],[...spendArgs(0n).slice(0,2),nativeToScVal(0n,{type:"i128"})]]) {
    const s=setup({}, {authArgs});
    await assert.rejects(()=>prepareTestnetDryRun(s.server,s.agentSigner,s.contract,0n),/unexpected authorized invocation/);
    assert.equal(s.signatures(),0);
  }
});

test("dry run rejects incorrect policy, insufficient balance and absent fee payer signature",async()=>{
  for (const policy of [{frozen:true},{spent:5_000_000n},{asset:"incorrect"},{recipient:"incorrect"},{agent:Keypair.random().publicKey()}]) {
    const s=setup(policy);
    await assert.rejects(()=>prepareTestnetDryRun(s.server,s.agentSigner,s.contract,0n));
    assert.equal(s.signatures(),0);
  }
  const poor=setup({}, {balance:4_999_999n});
  await assert.rejects(()=>prepareTestnetDryRun(poor.server,poor.agentSigner,poor.contract,0n),/insufficient on-chain balance/);
  const s=setup();
  await assert.rejects(()=>prepareTestnetDryRun(s.server,{publicKey:s.signer.publicKey(),signHash:async()=>new Uint8Array(64)},s.contract,0n),/invalid agent signature/);
});

test("dry run fails closed on wrong network and missing Soroban authorization",async()=>{
  const wrong=setup();
  wrong.server.getNetwork=async()=>({passphrase:Networks.PUBLIC,protocolVersion:"1"} as unknown as rpc.Api.GetNetworkResponse);
  await assert.rejects(()=>prepareTestnetDryRun(wrong.server,wrong.agentSigner,wrong.contract,0n),/network mismatch/);
  const missing=setup(); const original=missing.server.simulateTransaction.bind(missing.server);
  missing.server.simulateTransaction=async (...args) => {
    const response=await original(...args);
    if (missing.calls[missing.calls.length-1]==="spend" && "result" in response && response.result) return {...response,result:{...response.result,auth:[]}};
    return response;
  };
  await assert.rejects(()=>prepareTestnetDryRun(missing.server,missing.agentSigner,missing.contract,0n),/unsupported Soroban authorization/);
});

test("preflight seals the signed v2 bytes with their revision and fails if the lease is lost",async()=>{
  const { prepareAndPersistTestnet } = await import("./testnet-preflight.js");
  const { openEnvelope } = await import("./envelope-vault.js");
  const key=randomBytes(32), lease={tenantId:"tenant",eventId:"event",token:"lease"};
  const run=setup({}, {revision:4n});
  const resource={orderId:"order",attemptId:"attempt",contractId:run.contract,keyId:"test-key",policyRevision:4n};
  let parameters: unknown[] = [];
  const pool={query:async(_sql:string,args:unknown[])=>{parameters=args;return {rows:[{stored:true}]};}} as unknown as import("pg").Pool;
  const result=await prepareAndPersistTestnet(pool,run.server,run.agentSigner,lease,resource,key);
  assert.equal(parameters[14],"4");
  const restored=openEnvelope(key,{...resource,agent:run.signer.publicKey(),tenantId:lease.tenantId,transactionHash:result.hash,validThroughLedger:result.validThroughLedger},{nonce:parameters[10] as Buffer,ciphertext:parameters[11] as Buffer,tag:parameters[12] as Buffer,xdrDigest:parameters[13] as Buffer});
  assert.equal(Buffer.from(TransactionBuilder.fromXDR(restored.toString("base64"),Networks.TESTNET).hash()).toString("hex"),result.hash);
  const again=setup({}, {revision:4n});
  const rejected={query:async()=>({rows:[{stored:false}]})} as unknown as import("pg").Pool;
  await assert.rejects(()=>prepareAndPersistTestnet(rejected,again.server,again.agentSigner,lease,{...resource,contractId:again.contract},key),/not persisted/);
});
