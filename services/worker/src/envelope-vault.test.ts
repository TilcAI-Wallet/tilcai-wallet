import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Networks } from "@stellar/stellar-sdk";
import { openEnvelope, sealEnvelope } from "./envelope-vault.js";
import { makeTestEnvelope } from "./test-envelope.fixture.js";

const metadata = (sample: ReturnType<typeof makeTestEnvelope>) => ({agent:sample.agent,keyId:"test-key",tenantId:"tenant-a",orderId:"order-a",attemptId:"attempt-a",contractId:sample.contractId,transactionHash:sample.hash,validThroughLedger:123});
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
