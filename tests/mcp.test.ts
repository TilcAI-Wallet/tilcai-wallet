import { deepEqual, equal } from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("MCP stdio identifies the wallet without exposing financial tools", { timeout: 15_000 }, async (context) => {
  const script = fileURLToPath(new URL("../apps/mcp/src/server.ts", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", script], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = createInterface({ input: child.stdout });

  context.after(() => {
    lines.close();
    child.kill();
  });

  function send(message: object) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  }

  const responses = lines[Symbol.asyncIterator]();
  send({
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "wallet-smoke", version: "1" } },
  });

  const initialize = await responses.next();
  equal(initialize.done, false);
  const initialized = JSON.parse(initialize.value as string);
  equal(initialized.id, 1);
  equal(initialized.result.serverInfo.name, "tilcai-wallet");
  send({ method: "notifications/initialized" });
  send({ id: 2, method: "tools/list", params: {} });

  const toolList = await responses.next();
  equal(toolList.done, false);
  const listed = JSON.parse(toolList.value as string);
  equal(listed.id, 2);
  deepEqual(listed.result.tools, []);
});
