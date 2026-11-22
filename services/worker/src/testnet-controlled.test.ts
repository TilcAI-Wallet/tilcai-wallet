import { strict as assert } from "node:assert";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { Networks, rpc, type rpc as Rpc } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { sealEnvelope } from "./envelope-vault.js";
import { makeTestEnvelope } from "./test-envelope.fixture.js";
import { processControlledTestnetOnce, SimulatedTransport } from "./testnet-controlled.js";

function setup(outcome:"accepted"|"timeout") {
  const sample=makeTestEnvelope(), key=randomBytes(32);
  const context={keyId:"test",tenantId:"tenant",orderId:"order",attemptId:"attempt",contractId:sample.contractId,agent:sample.agent,transactionHash:sample.hash,validThroughLedger:123};
  const stored=sealEnvelope(key,context,sample.bytes), statements:string[]=[];
  const pool={query:async(sql:string)=>{statements.push(sql);if(sql.includes("claim_testnet"))return {rows:[{tenant_id:"tenant",event_id:"event",order_id:"order",lease_token:"token"}]};if(sql.includes("read_testnet_task"))return {rows:[{attempt_id:"attempt",attempt_state:"prepared",order_id:"order",asset_id:"CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",recipient:"GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX",agent:sample.agent,amount:"5000000"}]};if(sql.includes("load_testnet_envelope"))return {rows:[{key_id:"test",nonce:stored.nonce,ciphertext:stored.ciphertext,tag:stored.tag,xdr_digest:stored.xdrDigest,tx_hash:sample.hash,valid_through_ledger:123,order_id:"order",contract_id:sample.contractId,agent:sample.agent}]};if(sql.includes("renew_fixture"))return {rows:[{owned:true}]};if(sql.includes("mark_testnet_uncertain"))return {rows:[{changed:true}]};throw new Error("unexpected query");}} as unknown as Pool;
  const server={getNetwork:async()=>({passphrase:Networks.TESTNET}),getTransaction:async()=>({status:rpc.Api.GetTransactionStatus.NOT_FOUND,txHash:sample.hash})} as unknown as Pick<Rpc.Server,"getNetwork"|"getLatestLedger"|"getAccount"|"simulateTransaction"|"getTransaction">;
  const transport=new SimulatedTransport(outcome);
  return {sample,statements,transport,options:{pool,rpc:server,signer:{publicKey:sample.agent,signHash:async()=>{throw new Error("must not sign again");}},keyId:"test",keyForId:async()=>key,transport,allowSimulatedSend:false}};
}
test("SIMULATED: disabled gate never submits and prepared envelope is recovered without signing",async()=>{
  const state=setup("accepted");
  assert.equal(await processControlledTestnetOnce(state.options),"prepared");
  assert.equal(state.transport.submissions.length,0);
  assert.equal(state.statements.some((sql)=>sql.includes("mark_testnet_uncertain")),false);
});
test("SIMULATED: timeout and NOT_FOUND reuse the same signed bytes and remain uncertain",async()=>{
  const timed=setup("timeout"); timed.options.allowSimulatedSend=true;
  assert.equal(await processControlledTestnetOnce(timed.options),"uncertain");
  assert.deepEqual(timed.transport.submissions,[createHash("sha256").update(timed.sample.bytes).digest("hex")]);
  assert.ok(timed.statements.findIndex((sql)=>sql.includes("mark_testnet_uncertain"))>timed.statements.findIndex((sql)=>sql.includes("load_testnet_envelope")));
  const missing=setup("accepted"); missing.options.allowSimulatedSend=true;
  assert.equal(await processControlledTestnetOnce(missing.options),"uncertain");
  assert.equal(missing.transport.submissions.length,1);
});
