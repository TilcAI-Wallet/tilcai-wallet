import assert from "node:assert/strict";
import { test } from "node:test";
import { demoWallet } from "./fixtures.js";
import {
  amountMinorSchema,
  apiErrorSchema,
  cardSchema,
  createOrderSchema,
  orderSchema,
  receiptSchema,
  sessionSchema,
} from "./wallet-v1.js";

test("the shared fixture describes one charge against the same card and receipt", () => {
  const session = sessionSchema.parse(demoWallet.session);
  const before = cardSchema.parse(demoWallet.cardBefore);
  const after = cardSchema.parse(demoWallet.cardAfter);
  const order = orderSchema.parse(demoWallet.orderDelivered);
  const receipt = receiptSchema.parse(demoWallet.receipt);

  assert.equal(session.cardId, before.cardId);
  assert.equal(before.cardId, after.cardId);
  assert.equal(order.cardId, before.cardId);
  assert.equal(receipt.orderId, order.orderId);
  assert.equal(receipt.receiptId, order.receiptId);
  assert.equal(receipt.mode, "fixture");
  assert.equal(BigInt(before.balanceMinor) - BigInt(order.amountMinor), BigInt(after.balanceMinor));
  assert.equal(after.spentMinor, before.totalLimitMinor);
  assert.equal(after.availableMinor, "0");
  assert.equal(apiErrorSchema.parse(demoWallet.limitExceeded).error.code, "limit_exceeded");
});

test("order amounts are positive integer strings and the asset and recipient come from policy", () => {
  assert.equal(createOrderSchema.safeParse(demoWallet.createOrder).success, true);
  for (const value of ["0", "0.50", "05000000", 5_000_000, "-1", "170141183460469231731687303715884105728"]) {
    assert.equal(createOrderSchema.safeParse({ ...demoWallet.createOrder, maxAmountMinor: value }).success, false);
  }
  assert.equal(amountMinorSchema.safeParse("170141183460469231731687303715884105727").success, true);
  assert.equal(createOrderSchema.safeParse({ ...demoWallet.createOrder, recipient: "unauthorized" }).success, false);
});

test("a confirmed payment needs hash and ledger while a pending payment can be uncertain", () => {
  assert.equal(receiptSchema.safeParse({ ...demoWallet.receipt, payment: { status: "confirmed" } }).success, false);
  assert.equal(receiptSchema.safeParse({ ...demoWallet.receipt, payment: { status: "pending" } }).success, true);
});
