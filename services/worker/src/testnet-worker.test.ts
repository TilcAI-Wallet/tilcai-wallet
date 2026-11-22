import { strict as assert } from "node:assert";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { Networks } from "@stellar/stellar-sdk";
import type { Pool } from "pg";
import { sealEnvelope } from "./envelope-vault.js";
import { makeTestEnvelope } from "./test-envelope.fixture.js";
import { simulatedReadRpc, type RpcOutcome } from "./test-rpc.fixture.js";
import { processControlledTestnetOnce, SimulatedTransport } from "./testnet-controlled.js";
import { processTestnetPaymentOnce } from "./testnet-worker.js";
import { testReportRecipient, testnetUsdcContract } from "./testnet-constants.js";

function setup(options: { outcome?: RpcOutcome; attemptState?: string; loadable?: boolean; confirmResult?: boolean; recipient?: string } = {}) {
  const sample = makeTestEnvelope(), key = randomBytes(32);
  const context = { keyId: "test", tenantId: "tenant", orderId: "order", attemptId: "attempt", contractId: sample.contractId, agent: sample.agent, transactionHash: sample.hash, validThroughLedger: 123 };
  const stored = sealEnvelope(key, context, sample.bytes);
  const calls: Array<{ sql: string; args: unknown[] }> = [];
  const pool = { query: async (sql: string, args: unknown[] = []) => {
    calls.push({ sql, args });
    if (sql.includes("claim_testnet(")) return { rows: [{ tenant_id: "tenant", event_id: "event", order_id: "order", lease_token: "token" }] };
    if (sql.includes("read_testnet_task")) return { rows: [{ order_id: "order", attempt_id: "attempt", attempt_state: options.attemptState ?? "prepared", contract_id: sample.contractId, agent: sample.agent, asset_id: testnetUsdcContract, recipient: options.recipient ?? testReportRecipient, amount: "5000000" }] };
    if (sql.includes("load_testnet_envelope")) return { rows: options.loadable === false ? [] : [{ key_id: "test", nonce: stored.nonce, ciphertext: stored.ciphertext, tag: stored.tag, xdr_digest: stored.xdrDigest, tx_hash: sample.hash, valid_through_ledger: 123, order_id: "order", contract_id: sample.contractId, agent: sample.agent }] };
    if (sql.includes("renew_fixture")) return { rows: [{ owned: true }] };
    if (sql.includes("confirm_testnet_payment")) return { rows: [{ confirmed: options.confirmResult ?? true }] };
    if (sql.includes("mark_testnet_uncertain")) return { rows: [{ changed: true }] };
    throw new Error(`unexpected query ${sql}`);
  } } as unknown as Pool;
  const rpc = simulatedReadRpc(sample, options.outcome ?? "not_found");
  const signer = { publicKey: sample.agent, signHash: async (): Promise<Uint8Array> => { throw new Error("must not sign again"); } };
  return { sample, calls, rpc, run: { pool, rpc, signer, keyId: "test", keyForId: async () => key, leaseSeconds: 30 }, key };
}
const confirms = (calls: Array<{ sql: string }>) => calls.filter((call) => call.sql.includes("confirm_testnet_payment")).length;

test("SIMULATED: NOT_FOUND, timeout and unverified events keep the attempt and never confirm", async () => {
  for (const outcome of ["not_found", "timeout", "wrong_recipient", "wrong_amount"] as const) {
    const prepared = setup({ outcome });
    assert.equal(await processTestnetPaymentOnce(prepared.run), "awaiting_broadcast");
    assert.equal(confirms(prepared.calls), 0);
    assert.equal(prepared.rpc.lookups, 1);
    const submitted = setup({ outcome, attemptState: "uncertain" });
    assert.equal(await processTestnetPaymentOnce(submitted.run), "awaiting_evidence");
    assert.equal(confirms(submitted.calls), 0);
    assert.equal(submitted.calls.some((call) => call.sql.includes("mark_testnet_uncertain")), false);
  }
});

test("SIMULATED: a stalled RPC hits the deadline and keeps the attempt uncertain", async () => {
  const stalled = setup({ outcome: "verified", attemptState: "uncertain" });
  const rpc = { ...stalled.rpc, getNetwork: stalled.rpc.getNetwork.bind(stalled.rpc), getTransaction: () => new Promise<never>(() => undefined) };
  const started = Date.now();
  assert.equal(await processTestnetPaymentOnce({ ...stalled.run, rpc: rpc as typeof stalled.rpc, rpcTimeoutMs: 50 }), "awaiting_evidence");
  assert.ok(Date.now() - started < 5_000);
  assert.equal(confirms(stalled.calls), 0);
});

test("SIMULATED: verified transfer passes the exact stored evidence to the fenced confirmation", async () => {
  const state = setup({ outcome: "verified" });
  assert.equal(await processTestnetPaymentOnce(state.run), "confirmed");
  const call = state.calls.find((entry) => entry.sql.includes("confirm_testnet_payment"))!;
  assert.deepEqual(call.args, ["tenant", "event", "token", "attempt", state.sample.hash, Networks.TESTNET, 110, 0, testnetUsdcContract,
    state.sample.contractId, testReportRecipient, "5000000", createHash("sha256").update(state.sample.bytes).digest()]);
  const renew = state.calls.findIndex((entry) => entry.sql.includes("renew_fixture"));
  assert.ok(renew > -1 && renew < state.calls.indexOf(call));
  const rejected = setup({ outcome: "verified", confirmResult: false });
  assert.equal(await processTestnetPaymentOnce(rejected.run), "evidence_rejected");
});

test("lost lease, missing signer and unauthorized resources fail closed", async () => {
  const lost = setup({ outcome: "verified", loadable: false });
  assert.equal(await processTestnetPaymentOnce(lost.run), "lease_lost");
  assert.equal(lost.rpc.lookups, 0);
  const unsigned = setup({ attemptState: "created" });
  await assert.rejects(() => processTestnetPaymentOnce({ ...unsigned.run, signer: undefined }), /no authorized signer/);
  assert.equal(unsigned.calls.some((call) => call.sql.includes("store_testnet_envelope")), false);
  const foreign = setup({ recipient: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" });
  await assert.rejects(() => processTestnetPaymentOnce(foreign.run), /unauthorized Testnet resource/);
  assert.equal(foreign.rpc.lookups, 0);
});

test("SIMULATED: the controlled simulated transport never records a confirmation", async () => {
  const state = setup({ outcome: "verified" });
  const transport = new SimulatedTransport("accepted");
  const pool = { query: async (sql: string, args: unknown[]) => sql.includes("claim_testnet(") || sql.includes("read_testnet_task") || sql.includes("load_testnet_envelope") || sql.includes("renew_fixture") || sql.includes("mark_testnet_uncertain") ? state.run.pool.query(sql, args) : Promise.reject(new Error(`unexpected ${sql}`)) } as unknown as Pool;
  assert.equal(await processControlledTestnetOnce({ pool, rpc: state.rpc, signer: state.run.signer, keyId: "test", keyForId: state.run.keyForId, transport, allowSimulatedSend: true }), "simulated_verified");
  assert.equal(confirms(state.calls), 0);
});
