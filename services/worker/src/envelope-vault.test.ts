import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Networks } from "@stellar/stellar-sdk";
import { openEnvelope, sealEnvelope } from "./envelope-vault.js";
import { makeTestEnvelope } from "./test-envelope.fixture.js";

const metadata = (sample: ReturnType<typeof makeTestEnvelope>) => ({agent:sample.agent,keyId:"test-key",tenantId:"tenant-a",orderId:"order-a",attemptId:"attempt-a",contractId:sample.contractId,transactionHash:sample.hash,validThroughLedger:123,policyRevision:sample.policyRevision});
test("encrypted Stellar envelope survives recovery with exact signed bytes and Testnet hash", () => {
  const sample=makeTestEnvelope(), key=randomBytes(32), context=metadata(sample);
  const encrypted=sealEnvelope(key,context,sample.bytes);
  assert.notDeepEqual(encrypted.ciphertext,sample.bytes);
  assert.deepEqual(openEnvelope(key,context,encrypted),sample.bytes);
  assert.notDeepEqual(sealEnvelope(key,context,sample.bytes).nonce,encrypted.nonce);
});
test("rejects altered ciphertext, wrong key, tenant, network, signature, and XDR digest", () => {
  const sample=makeTestEnvelope(), key=randomBytes(32), context=metadata(sample), encrypted=sealEnvelope(key,context,sample.bytes);
  const tampered=Buffer.from(encrypted.ciphertext); tampered[0] = tampered[0]! ^ 1;
  assert.throws(() => openEnvelope(key,context,{...encrypted,ciphertext:tampered}));
  assert.throws(() => openEnvelope(randomBytes(32),context,encrypted));
  assert.throws(() => openEnvelope(key,{...context,tenantId:"tenant-b"},encrypted));
  assert.throws(() => openEnvelope(key,context,{...encrypted,xdrDigest:randomBytes(32)}));
  assert.throws(() => sealEnvelope(key,{...context,transactionHash:"0".repeat(64)},sample.bytes));
  assert.throws(() => sealEnvelope(key,{...context,contractId:makeTestEnvelope().contractId},sample.bytes));
  const unsigned=makeTestEnvelope(Networks.TESTNET,false);
  assert.throws(() => sealEnvelope(key,metadata(unsigned),unsigned.bytes),/signature/);
  const mainnet=makeTestEnvelope(Networks.PUBLIC);
  assert.throws(() => sealEnvelope(key,metadata(mainnet),mainnet.bytes));
});

test("only WalletFoundation v2 spend(amount, recipient, expected_policy_revision) is sealed, in operation and authorization", () => {
  const key=randomBytes(32), other="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
  const revised=makeTestEnvelope(Networks.TESTNET,true,{policyRevision:7n});
  assert.deepEqual(openEnvelope(key,metadata(revised),sealEnvelope(key,metadata(revised),revised.bytes)),revised.bytes);
  // Envelope signed for revision 7 cannot be presented as revision 8, and vice versa.
  assert.throws(() => sealEnvelope(key,{...metadata(revised),policyRevision:8n},revised.bytes),/unexpected envelope invocation/);
  const cases: Array<[Parameters<typeof makeTestEnvelope>[2],RegExp]> = [
    [{operation:{legacy:true}},/unexpected envelope invocation/],
    [{operation:{recipient:other}},/unexpected envelope invocation/],
    [{operation:{revision:1n}},/unexpected envelope invocation/],
    [{operation:{amount:5_000_001n}},/unexpected envelope invocation/],
    [{authorization:{legacy:true}},/unexpected envelope authorization/],
    [{authorization:{recipient:other}},/unexpected envelope authorization/],
    [{authorization:{revision:1n}},/unexpected envelope authorization/],
  ];
  for (const [options,error] of cases) {
    const sample=makeTestEnvelope(Networks.TESTNET,true,options);
    assert.throws(() => sealEnvelope(key,metadata(sample),sample.bytes),error,JSON.stringify(options,(_k,v)=>typeof v==="bigint"?v.toString():v));
  }
  assert.throws(() => sealEnvelope(key,{...metadata(revised),policyRevision:-1n},revised.bytes),/invalid policy revision/);
});

test("the AEAD context binds the policy revision", () => {
  const sample=makeTestEnvelope(Networks.TESTNET,true,{policyRevision:3n}), key=randomBytes(32), context=metadata(sample);
  const encrypted=sealEnvelope(key,context,sample.bytes);
  assert.throws(() => openEnvelope(key,{...context,policyRevision:4n},encrypted),/authentication failed/);
});
