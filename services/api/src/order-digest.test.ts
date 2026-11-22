import { strict as assert } from "node:assert";
import { test } from "node:test";
import { orderRequestDigest } from "./order-digest.js";

test("canonical order digest ignores object property order and detects changed content", () => {
  const first = { cardId: "card-1", offerId: "test-report", maxAmountMinor: "5000000" };
  const replay = { maxAmountMinor: "5000000", offerId: "test-report", cardId: "card-1" };
  assert.deepEqual(orderRequestDigest(first).digest, orderRequestDigest(replay).digest);
  assert.notDeepEqual(orderRequestDigest(first).digest, orderRequestDigest({ ...first, maxAmountMinor: "1" }).digest);
  assert.throws(() => orderRequestDigest({ ...first, tenantId: "other" }));
});
