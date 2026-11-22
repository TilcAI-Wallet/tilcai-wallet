import { deepEqual, equal } from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { walletV1Routes } from "@tilcai-wallet/api-contracts";
import { demoWallet } from "@tilcai-wallet/api-contracts/fixtures";

async function startMcp(context: TestContext, env: NodeJS.ProcessEnv = {}) {
  const script = fileURLToPath(new URL("../apps/mcp/src/server.ts", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", script], {
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, WALLET_MCP_TOKEN: "", WALLET_MCP_CARD_ID: "", ...env },
  });
  const lines = createInterface({ input: child.stdout });

  context.after(() => {
    lines.close();
    child.kill();
  });

  function send(message: object) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  }

  const responses = lines[Symbol.asyncIterator]();
  let id = 0;
  async function request(method: string, params: object = {}) {
    const requestId = ++id;
    send({ id: requestId, method, params });
    const line = await responses.next();
    equal(line.done, false);
    const message = JSON.parse(line.value as string);
    equal(message.id, requestId);
    return message.result;
  }

  const initialized = await request("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "wallet-smoke", version: "1" },
  });
  equal(initialized.serverInfo.name, "tilcai-wallet");
  send({ method: "notifications/initialized" });

  return {
    list: () => request("tools/list"),
    call: (name: string, args: object = {}) => request("tools/call", { name, arguments: args }),
  };
}

test("MCP stdio identifies the wallet without credentials and lists no financial tools", { timeout: 15_000 }, async (context) => {
  const client = await startMcp(context);
  deepEqual((await client.list()).tools, []);
});

test("MCP uses the configured card and preserves the order key and receipt through stdio", { timeout: 15_000 }, async (context) => {
  const token = "test-only-token";
  const { cardId, ...purchase } = demoWallet.createOrder;
  const orderRequests: Array<{ key: string | string[] | undefined; body: unknown }> = [];
  let accepted = false;
  const api = createServer(async (request, response) => {
    function reply(status: number, body: unknown) {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    }

    if (request.headers.authorization !== `Bearer ${token}`) {
      reply(401, { error: { code: "unauthenticated" } });
      return;
    }
    if (request.method === "POST" && request.url === walletV1Routes.orders) {
      const chunks: string[] = [];
      request.setEncoding("utf8");
      for await (const chunk of request) chunks.push(chunk);
      const key = request.headers["idempotency-key"];
      orderRequests.push({ key, body: JSON.parse(chunks.join("")) });
      if (key !== demoWallet.idempotencyKey) {
        reply(409, demoWallet.limitExceeded);
      } else if (accepted) {
        reply(200, demoWallet.orderDelivered);
      } else {
        accepted = true;
        reply(202, demoWallet.orderPending);
      }
      return;
    }
    if (request.url === walletV1Routes.card(cardId)) {
      reply(200, accepted ? demoWallet.cardAfter : demoWallet.cardBefore);
    } else if (request.url === walletV1Routes.order(demoWallet.orderDelivered.orderId)) {
      reply(200, demoWallet.orderDelivered);
    } else if (request.url === walletV1Routes.receipt(demoWallet.receipt.receiptId)) {
      reply(200, demoWallet.receipt);
    } else if (request.url === walletV1Routes.receipt("foreign-receipt")) {
      reply(200, { ...demoWallet.receipt, receiptId: "foreign-receipt", cardId: "foreign-card" });
    } else {
      reply(404, { error: { code: "not_found" } });
    }
  });
  api.listen(0, "127.0.0.1");
  context.after(() => api.close());
  await once(api, "listening");
  const address = api.address();
  if (!address || typeof address === "string") throw new Error("Expected an HTTP port");

  const client = await startMcp(context, {
    WALLET_API_URL: `http://127.0.0.1:${address.port}`,
    WALLET_MCP_TOKEN: token,
    WALLET_MCP_CARD_ID: cardId,
  });
  const { tools } = await client.list();
  deepEqual(tools.map((tool: { name: string }) => tool.name).sort(), [
    "create_order", "get_card", "get_order", "get_receipt",
  ]);
  deepEqual((await client.call("get_card")).structuredContent, demoWallet.cardBefore);

  const args = { ...purchase, idempotencyKey: demoWallet.idempotencyKey };
  deepEqual((await client.call("create_order", args)).structuredContent, demoWallet.orderPending);
  deepEqual((await client.call("create_order", args)).structuredContent, demoWallet.orderDelivered);
  deepEqual((await client.call("get_order", { orderId: demoWallet.orderDelivered.orderId })).structuredContent, demoWallet.orderDelivered);
  deepEqual((await client.call("get_receipt", { receiptId: demoWallet.receipt.receiptId })).structuredContent, demoWallet.receipt);
  deepEqual((await client.call("get_card")).structuredContent, demoWallet.cardAfter);

  const rejected = await client.call("create_order", { ...args, idempotencyKey: "another-order" });
  equal(rejected.isError, true);
  equal(rejected.content[0].text, "limit_exceeded");
  deepEqual(orderRequests, [
    { key: demoWallet.idempotencyKey, body: demoWallet.createOrder },
    { key: demoWallet.idempotencyKey, body: demoWallet.createOrder },
    { key: "another-order", body: demoWallet.createOrder },
  ]);
  const foreign = await client.call("get_receipt", { receiptId: "foreign-receipt" });
  equal(foreign.isError, true);
  equal(foreign.content[0].text, "not_found");
});
