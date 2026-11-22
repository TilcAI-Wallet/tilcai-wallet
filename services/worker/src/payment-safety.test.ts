import { strict as assert } from "node:assert";
import { test } from "node:test";
import { assertPaymentPolicy, reconciliationDecision, type PaymentPolicy } from "./payment-safety.js";
import { SyntheticPaymentAdapter } from "./synthetic-payment.js";

const policy: PaymentPolicy = {
  contract: "contract", asset: "usdc", recipient: "recipient", agent: "agent",
  maxPerPayment: 5_000_000n, limit: 5_000_000n, spent: 0n, frozen: false,
};
const payment = { contract: "contract", asset: "usdc", recipient: "recipient", agent: "agent", amount: 5_000_000n };

test("accepts exactly 0.50 USDC at seven decimals and rejects over-limit or consumed budget", () => {
  assert.doesNotThrow(() => assertPaymentPolicy(policy, payment));
  assert.throws(() => assertPaymentPolicy(policy, { ...payment, amount: 5_000_001n }));
  assert.throws(() => assertPaymentPolicy({ ...policy, spent: 1n }, payment));
  assert.throws(() => assertPaymentPolicy(policy, { ...payment, amount: 0n }));
});
test("rejects mismatched identities, frozen or malformed policies", () => {
  for (const field of ["contract", "asset", "recipient", "agent"] as const)
    assert.throws(() => assertPaymentPolicy(policy, { ...payment, [field]: "unexpected" }));
  assert.throws(() => assertPaymentPolicy({ ...policy, frozen: true }, payment));
  assert.throws(() => assertPaymentPolicy({ ...policy, spent: -1n }, payment));
  assert.throws(() => assertPaymentPolicy({ ...policy, limit: -1n }, payment));
});
test("uncertain lookup never authorizes a new attempt or release", () => {
  assert.equal(reconciliationDecision("not_found"), "retain_and_retry_lookup");
  assert.equal(reconciliationDecision("timeout"), "retain_and_retry_lookup");
  assert.equal(reconciliationDecision("confirmed"), "confirm");
  assert.equal(reconciliationDecision("failed"), "definitive_failure");
});
test("synthetic adapter detects changed bytes and repeated submission retains the same identity", () => {
  const adapter = new SyntheticPaymentAdapter(policy);
  const prepared = adapter.prepare(payment);
  assert.match(prepared.hash, /^synthetic:/);
  assert.equal(adapter.wasSubmitted(prepared.hash), false);
  adapter.submit(prepared);
  adapter.submit(prepared);
  assert.equal(adapter.wasSubmitted(prepared.hash), true);
  assert.throws(() => adapter.submit({ ...prepared, bytes: new Uint8Array([1]) }));
});
