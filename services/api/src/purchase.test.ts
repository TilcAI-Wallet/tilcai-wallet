import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createApi } from "./app.js";

test("all purchase routes reject absent or malformed credentials without consulting a database", async (t) => {
  const api = createApi(); t.after(() => api.close());
  for (const [method,url] of [["GET","/v1/sessions/session"],["GET","/v1/cards/card"],["POST","/v1/orders"],["GET","/v1/orders/order"],["GET","/v1/receipts/receipt"]] as const) {
    const response = await api.inject({ method, url, headers: { authorization: "Bearer short" } });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, "unauthenticated");
  }
});
test("a configured-looking token fails closed without a database", async (t) => {
  const api = createApi(); t.after(() => api.close());
  const response = await api.inject({method:"GET",url:"/v1/cards/card",headers:{authorization:`Bearer ${"a".repeat(32)}`}});
  assert.equal(response.statusCode, 503);
});
