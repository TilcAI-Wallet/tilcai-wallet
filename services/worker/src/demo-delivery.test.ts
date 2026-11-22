import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Pool } from "pg";
import { processDemoDeliveryOnce } from "./demo-delivery-worker.js";
import { DemoReportProvider, verifyDeliveredArtifact, type DeliveryProvider } from "./demo-report-provider.js";
import { decodeEnvelopeKey, parseWorkerConfig } from "./worker-config.js";

function deliverySetup(options: { recordResult?: boolean; owned?: boolean } = {}) {
  const calls: Array<{ sql: string; args: unknown[] }> = [];
  const pool = { query: async (sql: string, args: unknown[] = []) => {
    calls.push({ sql, args });
    if (sql.includes("claim_testnet_delivery")) return { rows: [{ tenant_id: "tenant", event_id: "delivery-event", order_id: "order", lease_token: "token" }] };
    if (sql.includes("read_testnet_delivery")) return { rows: [{ order_id: "order", offer_id: "test-report", amount: "5000000", tx_hash: "a".repeat(64), ledger: "110" }] };
    if (sql.includes("renew_fixture")) return { rows: [{ owned: options.owned ?? true }] };
    if (sql.includes("record_demo_delivery")) return { rows: [{ recorded: options.recordResult ?? true }] };
    throw new Error(`unexpected query ${sql}`);
  } } as unknown as Pool;
  return { calls, pool };
}
const recorded = (calls: Array<{ sql: string }>) => calls.some((call) => call.sql.includes("record_demo_delivery"));

test("demo delivery is recorded only after independent artifact verification", async () => {
  const provider = new DemoReportProvider();
  const good = deliverySetup();
  assert.equal(await processDemoDeliveryOnce({ pool: good.pool, provider, leaseSeconds: 30 }), "delivered");
  const record = good.calls.find((call) => call.sql.includes("record_demo_delivery"))!;
  const expected = await provider.deliver({ orderId: "order", offerId: "test-report", paymentTxHash: "a".repeat(64), ledger: 110 });
  assert.deepEqual(record.args, ["tenant", "delivery-event", "token", "demo-report-provider", expected.evidenceId, expected.digest, expected.artifact.length, "a".repeat(64)]);
  const tampering: DeliveryProvider = { id: provider.id, deliver: async (request) => ({ ...(await provider.deliver(request)), digest: "0".repeat(64) }) };
  const bad = deliverySetup();
  await assert.rejects(() => processDemoDeliveryOnce({ pool: bad.pool, provider: tampering, leaseSeconds: 30 }), /digest mismatch/);
  assert.equal(recorded(bad.calls), false);
  const lost = deliverySetup({ owned: false });
  assert.equal(await processDemoDeliveryOnce({ pool: lost.pool, provider, leaseSeconds: 30 }), "lease_lost");
  assert.equal(recorded(lost.calls), false);
  assert.equal(await processDemoDeliveryOnce({ pool: deliverySetup({ recordResult: false }).pool, provider, leaseSeconds: 30 }), "rejected");
});

test("artifact verification binds provider, order, offer, payment hash and ledger", async () => {
  const provider = new DemoReportProvider(), request = { orderId: "order", offerId: "test-report", paymentTxHash: "a".repeat(64), ledger: 110 };
  const delivered = await provider.deliver(request);
  assert.equal(verifyDeliveredArtifact(request, delivered).digest, delivered.digest);
  for (const changed of [{ ...request, orderId: "other" }, { ...request, paymentTxHash: "b".repeat(64) }, { ...request, ledger: 111 }])
    assert.throws(() => verifyDeliveredArtifact(changed, delivered), /not bound/);
  assert.throws(() => verifyDeliveredArtifact(request, { ...delivered, providerId: "other" }), /provider/);
  const altered = Buffer.from(delivered.artifact); altered[altered.length - 2] ^= 1;
  assert.throws(() => verifyDeliveredArtifact(request, { ...delivered, artifact: altered }), /digest mismatch/);
  await assert.rejects(() => provider.deliver({ ...request, offerId: "other" }), /unsupported offer/);
});

test("worker configuration refuses broadcast and incomplete Testnet settings", () => {
  assert.equal(parseWorkerConfig({}).WORKER_MODE, "disabled");
  assert.throws(() => parseWorkerConfig({ TESTNET_BROADCAST: "enabled" }), /Broadcast gate closed/);
  assert.throws(() => parseWorkerConfig({ WORKER_MODE: "testnet" }), /HTTPS/);
  assert.throws(() => parseWorkerConfig({ WORKER_MODE: "testnet", STELLAR_RPC_URL: "http://rpc.example" }), /HTTPS/);
  assert.throws(() => parseWorkerConfig({ WORKER_MODE: "testnet", STELLAR_RPC_URL: "https://user:pw@rpc.example" }), /HTTPS/);
  assert.throws(() => parseWorkerConfig({ WORKER_MODE: "testnet", STELLAR_RPC_URL: "https://rpc.example" }), /ENVELOPE_KEY/);
  assert.equal(parseWorkerConfig({ WORKER_MODE: "testnet", STELLAR_RPC_URL: "https://rpc.example", ENVELOPE_KEY_ID: "k1", ENVELOPE_KEY_FILE: "/run/secrets/key", TESTNET_BROADCAST: "disabled" }).WORKER_MODE, "testnet");
  assert.equal(decodeEnvelopeKey(Buffer.alloc(32, 7).toString("base64")).length, 32);
  assert.throws(() => decodeEnvelopeKey(Buffer.alloc(16).toString("base64")));
});
