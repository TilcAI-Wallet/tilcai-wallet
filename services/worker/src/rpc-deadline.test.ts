import { strict as assert } from "node:assert";
import { test } from "node:test";
import { RpcDeadlineError, withRpcDeadline } from "./rpc-deadline.js";
import { parseWorkerConfig } from "./worker-config.js";

test("a stalled RPC call rejects at its deadline; normal calls keep their result and receiver", async () => {
  const client = {
    calls: 0,
    async latest() { this.calls += 1; return 42; },
    stall() { return new Promise<never>(() => undefined); },
    async broken() { throw new Error("rpc failure"); },
  };
  const wrapped = withRpcDeadline(client, 20);
  assert.equal(await wrapped.latest(), 42);
  assert.equal(client.calls, 1);
  await assert.rejects(() => wrapped.stall(), (error: unknown) => error instanceof RpcDeadlineError && error.method === "stall");
  await assert.rejects(() => wrapped.broken(), /rpc failure/);
  assert.throws(() => withRpcDeadline(client, 0), /invalid RPC deadline/);
});

test("RPC_TIMEOUT_MS is bounded", () => {
  assert.equal(parseWorkerConfig({}).RPC_TIMEOUT_MS, 10_000);
  assert.throws(() => parseWorkerConfig({ RPC_TIMEOUT_MS: "999" }));
  assert.throws(() => parseWorkerConfig({ RPC_TIMEOUT_MS: "30001" }));
});
