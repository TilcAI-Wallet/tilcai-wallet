import { strict as assert } from "node:assert";
import { test } from "node:test";
import { provisionalCreateOrderSchema, provisionalReceiptSchema } from "./purchase-provisional.js";

const id = "ac7d78cc-31bb-4c2e-86e3-337250ef43c1";
test("amount is a positive, bounded atomic integer string", () => {
  assert.equal(provisionalCreateOrderSchema.safeParse({ cardId: id, amountAtomic: "5000000" }).success, true);
  for (const value of [0, "0", "0.50", "invalid", "9223372036854775808"]) {
    assert.equal(provisionalCreateOrderSchema.safeParse({ cardId: id, amountAtomic: value }).success, false);
  }
  assert.equal(provisionalCreateOrderSchema.safeParse({ cardId: id, amountAtomic: "1", tenantId: id }).success, false);
});
test("receipt amount representations must agree and synthetic evidence is rejected", () => {
  const receipt = { receiptId: id, orderId: id, network: "testnet", contract: "contract", asset: "asset",
    recipient: "recipient", amountAtomic: "5000000", amountFormatted: "0.5000000", evidence: "stellar_testnet",
    transactionHash: "a".repeat(64), ledger: 1, paymentStatus: "confirmed", deliveryStatus: "pending", refundStatus: "none" };
  assert.equal(provisionalReceiptSchema.safeParse(receipt).success, true);
  assert.equal(provisionalReceiptSchema.safeParse({ ...receipt, amountFormatted: "0.6000000" }).success, false);
  assert.equal(provisionalReceiptSchema.safeParse({ ...receipt, amountAtomic: "bad" }).success, false);
  assert.equal(provisionalReceiptSchema.safeParse({ ...receipt, evidence: "synthetic" }).success, false);
});
