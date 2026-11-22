import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { sealEnvelope } from "./envelope-vault.js";
import { makeTestEnvelope } from "./test-envelope.fixture.js";
import { fakeTestnetRpc, type FakeChain } from "./test-rpc.fixture.js";
import { broadcastAuthorizedTestnet } from "./testnet-broadcast.js";
import { testReportRecipient, testnetUsdcContract } from "./testnet-constants.js";
import { processTestnetPaymentOnce } from "./testnet-worker.js";

// FAKE RPC only: sendTransaction records bytes in memory and never reaches a network.
function setup(chain: Partial<FakeChain> = {}, db: { owned?: boolean; begun?: boolean; attemptState?: string } = {}) {
  const sample = makeTestEnvelope(), key = randomBytes(32), log: string[] = [];
  const lease = { tenantId: "tenant", eventId: "event", token: "token" };
  const context = { keyId: "test", tenantId: lease.tenantId, orderId: "order", attemptId: "attempt", contractId: sample.contractId, agent: sample.agent, transactionHash: sample.hash, validThroughLedger: 123, policyRevision: sample.policyRevision };
  const blob = sealEnvelope(key, context, sample.bytes);
  const pool = { query: async (sql: string) => {
    const name = /wallet_private\.([a-z_]+)/.exec(sql)?.[1] ?? sql; log.push(`db:${name}`);
    if (name === "claim_testnet") return { rows: [{ tenant_id: "tenant", event_id: "event", order_id: "order", lease_token: "token" }] };
    if (name === "read_testnet_task") return { rows: [{ order_id: "order", attempt_id: "attempt", attempt_state: db.attemptState ?? "prepared", contract_id: sample.contractId, agent: sample.agent, asset_id: testnetUsdcContract, recipient: testReportRecipient, amount: "5000000", policy_revision: "0" }] };
    if (name === "load_testnet_envelope") return { rows: [{ key_id: "test", nonce: blob.nonce, ciphertext: blob.ciphertext, tag: blob.tag, xdr_digest: blob.xdrDigest, tx_hash: sample.hash, valid_through_ledger: 123, order_id: "order", contract_id: sample.contractId, agent: sample.agent, spend_interface: 2, policy_revision: "0" }] };
    if (name === "renew_fixture") return { rows: [{ owned: db.owned ?? true }] };
    if (name === "begin_testnet_broadcast") return { rows: [{ begun: db.begun ?? true }] };
    if (name === "confirm_testnet_payment") return { rows: [{ confirmed: true }] };
    throw new Error(`unexpected query ${sql}`);
  } } as unknown as Pool;
  const fake = fakeTestnetRpc(sample, chain);
  const send = { sendTransaction: async (tx: Parameters<typeof fake.send.sendTransaction>[0]) => { log.push("send"); return fake.send.sendTransaction(tx); } };
  const direct = { pool, freshRpc: fake.read, sendRpc: send, lease, attemptId: "attempt", context, envelope: sample.bytes, leaseSeconds: 30, nowSeconds: () => 1 };
  const worker = { pool, rpc: fake.read, keyId: "test", keyForId: async () => key, leaseSeconds: 30,
    signer: { publicKey: sample.agent, signHash: async (): Promise<Uint8Array> => { throw new Error("must not sign again"); } } };
  return { sample, log, fake, direct, worker, activation: { orderId: "order", rpc: send, nowSeconds: () => 1 } };
}
const has = (log: string[], entry: string) => log.includes(entry);

test("FAKE RPC: an authorized send persists uncertain state before sending the identical stored bytes", async () => {
  for (const send of ["pending", "duplicate", "error", "timeout"] as const) {
    const s = setup({ send });
    assert.equal(await broadcastAuthorizedTestnet(s.direct), "submitted", send);
    assert.deepEqual(s.fake.sent, [s.sample.bytes]);
    assert.ok(s.log.indexOf("db:renew_fixture") < s.log.indexOf("db:begin_testnet_broadcast"));
    assert.ok(s.log.indexOf("db:begin_testnet_broadcast") < s.log.indexOf("send"));
  }
});

test("FAKE RPC: no authorization, lost lease or expired bytes never send", async () => {
  const unauthorized = setup({}, { begun: false });
  assert.equal(await broadcastAuthorizedTestnet(unauthorized.direct), "not_authorized");
  assert.equal(unauthorized.fake.sent.length, 0);
  const lost = setup({}, { owned: false });
  assert.equal(await broadcastAuthorizedTestnet(lost.direct), "lease_lost");
  assert.equal(has(lost.log, "db:begin_testnet_broadcast"), false); assert.equal(lost.fake.sent.length, 0);
  // Ledger bound 123 is exclusive; a 2-ledger margin is required.
  const byLedger = setup({ latestLedger: 121 });
  assert.equal(await broadcastAuthorizedTestnet(byLedger.direct), "envelope_expired");
  const maxTime = Number((TransactionBuilder.fromXDR(byLedger.sample.bytes.toString("base64"), Networks.TESTNET) as unknown as { timeBounds: { maxTime: string } }).timeBounds.maxTime);
  const byTime = setup();
  assert.equal(await broadcastAuthorizedTestnet({ ...byTime.direct, nowSeconds: () => maxTime - 10 }), "envelope_expired");
  for (const s of [byLedger, byTime]) { assert.equal(s.fake.sent.length, 0); assert.equal(s.log.some((e) => e.startsWith("db:")), false); }
});

test("FAKE RPC: policy, contract or balance changes since signing block the send", async () => {
  const base = fakeTestnetRpc(makeTestEnvelope()).chain.policy;
  const changes: Array<Partial<FakeChain>> = [
    { revision: 1n }, { version: 1 }, { balance: 4_999_999n },
    { policy: { ...base, recipient: Keypair.random().publicKey() } }, { policy: { ...base, frozen: true } },
    { policy: { ...base, spent: 5_000_000n } }, { policy: { ...base, max_per_payment: 4_999_999n } },
    { policy: { ...base, asset: "CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6" } },
  ];
  for (const change of changes) {
    const s = setup(change);
    // The default agent in `base` belongs to another sample, so restore this sample's agent unless testing it.
    if (change.policy) s.fake.chain.policy = { ...change.policy, agent: s.sample.agent };
    assert.equal(await broadcastAuthorizedTestnet(s.direct), "preconditions_failed", JSON.stringify(change, (_k, v) => typeof v === "bigint" ? v.toString() : v));
    assert.equal(s.fake.sent.length, 0); assert.equal(has(s.log, "db:begin_testnet_broadcast"), false);
  }
  const otherAgent = setup();
  otherAgent.fake.chain.policy = { ...otherAgent.fake.chain.policy, agent: Keypair.random().publicKey() };
  assert.equal(await broadcastAuthorizedTestnet(otherAgent.direct), "preconditions_failed");
  assert.equal(otherAgent.fake.sent.length, 0);
});

test("FAKE RPC: consumed sequence, wrong network and tampered context never send", async () => {
  const consumed = setup({ accountSequence: "2" });
  assert.equal(await broadcastAuthorizedTestnet(consumed.direct), "sequence_unavailable");
  const mainnet = setup({ network: Networks.PUBLIC });
  await assert.rejects(() => broadcastAuthorizedTestnet(mainnet.direct), /network mismatch/);
  const revised = setup();
  await assert.rejects(() => broadcastAuthorizedTestnet({ ...revised.direct, context: { ...revised.direct.context, policyRevision: 1n } }), /unexpected envelope invocation/);
  for (const s of [consumed, mainnet, revised]) assert.equal(s.fake.sent.length, 0);
});

test("FAKE RPC: the worker never sends by default, for another order, on RPC errors, FAILED or verified results", async () => {
  const disabled = setup();
  assert.equal(await processTestnetPaymentOnce(disabled.worker), "awaiting_broadcast");
  const otherOrder = setup();
  assert.equal(await processTestnetPaymentOnce({ ...otherOrder.worker, broadcast: { ...otherOrder.activation, orderId: "another-order" } }), "awaiting_broadcast");
  const timeout = setup({ transaction: "timeout" }, { attemptState: "uncertain" });
  assert.equal(await processTestnetPaymentOnce({ ...timeout.worker, broadcast: timeout.activation }), "awaiting_evidence");
  // Included and reverted (e.g. PolicyChanged): the sequence is consumed; never re-send or re-sign.
  const reverted = setup({ transaction: "failed" }, { attemptState: "uncertain" });
  assert.equal(await processTestnetPaymentOnce({ ...reverted.worker, broadcast: reverted.activation }), "awaiting_evidence");
  const verified = setup({ transaction: "verified" }, { attemptState: "uncertain" });
  assert.equal(await processTestnetPaymentOnce({ ...verified.worker, broadcast: verified.activation }), "confirmed");
  for (const s of [disabled, otherOrder, timeout, reverted, verified]) {
    assert.equal(s.fake.sent.length, 0);
    assert.equal(has(s.log, "db:begin_testnet_broadcast"), false);
    assert.equal(has(s.log, "db:store_testnet_envelope"), false);
  }
});

test("FAKE RPC: NOT_FOUND retries and restarts re-send only the same bytes, never a new envelope", async () => {
  const s = setup({ send: "timeout" });
  assert.equal(await processTestnetPaymentOnce({ ...s.worker, broadcast: s.activation }), "submitted");
  assert.equal(await processTestnetPaymentOnce({ ...s.worker, broadcast: s.activation }), "submitted");
  assert.deepEqual(s.fake.sent, [s.sample.bytes, s.sample.bytes]);
  assert.equal(has(s.log, "db:store_testnet_envelope"), false);
  // Once the bounded authorization is spent, the worker waits instead of sending.
  const spent = setup({}, { begun: false });
  assert.equal(await processTestnetPaymentOnce({ ...spent.worker, broadcast: spent.activation }), "awaiting_authorization");
  const expired = setup({ latestLedger: 122 });
  assert.equal(await processTestnetPaymentOnce({ ...expired.worker, broadcast: expired.activation }), "envelope_expired");
  const changed = setup({ revision: 3n });
  assert.equal(await processTestnetPaymentOnce({ ...changed.worker, broadcast: changed.activation }), "broadcast_blocked");
  for (const x of [spent, expired, changed]) assert.equal(x.fake.sent.length, 0);
});

test("FAKE RPC: concurrent runs holding stale and live leases send at most the same bytes", async () => {
  const live = setup(), stale = setup({}, { owned: false });
  const [a, b] = await Promise.all([broadcastAuthorizedTestnet(live.direct), broadcastAuthorizedTestnet({ ...stale.direct, envelope: live.sample.bytes, context: live.direct.context, freshRpc: live.fake.read })]);
  assert.deepEqual([a, b].sort(), ["lease_lost", "submitted"]);
  assert.deepEqual(live.fake.sent, [live.sample.bytes]);
  assert.equal(stale.fake.sent.length, 0);
});
