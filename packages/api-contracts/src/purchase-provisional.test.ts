import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatUsdcMinor } from "./purchase-provisional.js";
import { createOrderSchema } from "./wallet-v1.js";

test("formats USDC atomic units exactly", () => {
  assert.equal(formatUsdcMinor("5000000"), "0.5000000");
  assert.equal(formatUsdcMinor("195000000"), "19.5000000");
  assert.throws(() => formatUsdcMinor("0.5"));
});
test("the official order contract rejects untrusted tenant and recipient fields", () => {
  const order = { cardId: "card-1", offerId: "test-report", maxAmountMinor: "5000000" };
  assert.equal(createOrderSchema.safeParse(order).success, true);
  assert.equal(createOrderSchema.safeParse({ ...order, tenantId: "other" }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...order, recipient: "other" }).success, false);
});
