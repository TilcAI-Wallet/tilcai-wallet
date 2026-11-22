import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Networks, type rpc } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { sealEnvelope } from "./envelope-vault.js";
import { makeTestEnvelope } from "./test-envelope.fixture.js";
import { broadcastStoredTestnet } from "./testnet-broadcast.js";

function setup() {
  const sample=makeTestEnvelope(),key=randomBytes(32),calls:string[]=[];
  const lease={tenantId:"tenant",eventId:"event",token:"token"};
  const context={keyId:"test",tenantId:lease.tenantId,orderId:"order",attemptId:"attempt",contractId:sample.contractId,agent:sample.agent,transactionHash:sample.hash,validThroughLedger:123};
  const blob=sealEnvelope(key,context,sample.bytes);
  const pool={query:async(sql:string)=>{calls.push(sql);if(sql.includes("load_testnet_envelope"))return {rows:[{key_id:context.keyId,nonce:blob.nonce,ciphertext:blob.ciphertext,tag:blob.tag,xdr_digest:blob.xdrDigest,tx_hash:sample.hash,valid_through_ledger:123,order_id:"order",contract_id:sample.contractId,agent:sample.agent}]};if(sql.includes("renew_fixture"))return {rows:[{owned:true}]};if(sql.includes("mark_testnet_uncertain"))return {rows:[{changed:true}]};throw new Error("unexpected query");}} as unknown as Pool;
  const sent:Buffer[]=[];
  const server={getNetwork:async()=>({passphrase:Networks.TESTNET}),getLatestLedger:async()=>({sequence:110}),sendTransaction:async(tx:{toEnvelope:()=>{toXDR:()=>Uint8Array}})=>{sent.push(Buffer.from(tx.toEnvelope().toXDR()));throw new Error("SIMULATED timeout");}} as unknown as Pick<rpc.Server,"getNetwork"|"getLatestLedger"|"sendTransaction">;
  return {sample,key,calls,sent,options:{pool,rpc:server,lease,attemptId:"attempt",keyForId:async()=>key,verifyFreshPolicy:async()=>true,nowSeconds:()=>Math.floor(Date.now()/1000)}};
}
test("SIMULATED: broadcast gate is disabled without even reading the database",async()=>{
  const s=setup(); assert.deepEqual(await broadcastStoredTestnet(s.options),{status:"disabled"});
  assert.equal(s.calls.length,0); assert.equal(s.sent.length,0);
});
test("SIMULATED: persist uncertain before sending identical bytes; timeout remains uncertain",async()=>{
  const s=setup(); assert.deepEqual(await broadcastStoredTestnet({...s.options,broadcastEnabled:true}),{status:"uncertain"});
  assert.deepEqual(s.sent,[s.sample.bytes]);
  assert.ok(s.calls.findIndex((q)=>q.includes("mark_testnet_uncertain"))>s.calls.findIndex((q)=>q.includes("load_testnet_envelope")));
});
test("SIMULATED: expiration and a lost lease never submit",async()=>{
  const s=setup(); s.options.rpc.getLatestLedger=async()=>({sequence:123} as rpc.Api.GetLatestLedgerResponse);
  assert.deepEqual(await broadcastStoredTestnet({...s.options,broadcastEnabled:true}),{status:"expired"}); assert.equal(s.sent.length,0);
  const stale=setup(); stale.options.pool.query=(async()=>({rows:[]})) as unknown as typeof stale.options.pool.query;
  assert.deepEqual(await broadcastStoredTestnet({...stale.options,broadcastEnabled:true}),{status:"lease_lost"}); assert.equal(stale.sent.length,0);
});

test("SIMULATED: failed fresh-policy validation prevents submission",async()=>{
  const s=setup(); s.options.verifyFreshPolicy=async()=>false;
  await assert.rejects(()=>broadcastStoredTestnet({...s.options,broadcastEnabled:true}),/policy/);
  assert.equal(s.sent.length,0);
});
