import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { createApi } from "./app.js";

test("reports gateway health", async (context) => {
  const api = createApi();
  context.after(() => api.close());
  const response = await api.inject({ method: "GET", url: "/healthz" });
  equal(response.statusCode, 200);
  deepEqual(response.json(), { status: "ok", service: "wallet-api" });
});

test("purchase requires authentication", async (context) => {
  const api = createApi();
  context.after(() => api.close());
  const response = await api.inject({ method: "POST", url: "/v1/orders" });
  equal(response.statusCode, 401);
});
