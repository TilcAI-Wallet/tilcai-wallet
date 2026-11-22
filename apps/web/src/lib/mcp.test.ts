import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import { approvePairing, configureAgentCard, createPairing, createStore, findPairing, rejectPairing } from "./ledger.ts";
import { handleMcp } from "./mcp.ts";

const now = new Date("2026-11-22T10:00:00.000Z");
const code = "tl_codigo_de_prueba";
let id = 0;
const rpc = (method: string, params: unknown = {}) => ({ jsonrpc: "2.0", id: ++id, method, params });
const call = (store: ReturnType<typeof createStore>, name: string, args: unknown = {}) =>
  (handleMcp(store, code, rpc("tools/call", { name, arguments: args }), now).body as { result: { content: { text: string }[]; isError?: boolean } }).result;

function setup() {
  const store = createStore();
  createPairing(store, "claude", "Claude · Portátil", code, now);
  return store;
}

test("a bad or missing code is rejected with 401 and changes nothing", () => {
  const store = setup();
  equal(handleMcp(store, "otro", rpc("initialize"), now).status, 401);
  equal(handleMcp(store, null, rpc("initialize"), now).status, 401);
  equal(findPairing(store, code, now)!.status, "waiting");
});

test("initialize marks the pairing as connected and answers like an MCP server", () => {
  const store = setup();
  const reply = handleMcp(store, code, rpc("initialize", { protocolVersion: "2025-03-26" }), now);
  equal(reply.status, 200);
  const result = (reply.body as { result: { protocolVersion: string; serverInfo: { name: string } } }).result;
  equal(result.protocolVersion, "2025-03-26");
  equal(result.serverInfo.name, "tilcai-wallet");
  equal(findPairing(store, code, now)!.status, "connected");
});

test("notifications get 202 and no body; tools/list works before approval", () => {
  const store = setup();
  equal(handleMcp(store, code, { jsonrpc: "2.0", method: "notifications/initialized" }, now).status, 202);
  const tools = (handleMcp(store, code, rpc("tools/list"), now).body as { result: { tools: { name: string }[] } }).result.tools;
  deepEqual(tools.map((t) => t.name), ["get_wallet_status", "request_purchase", "list_receipts"]);
});

test("tools are blocked until the owner approves", () => {
  const store = setup();
  const result = call(store, "get_wallet_status");
  equal(result.isError, true);
  ok(result.content[0]!.text.includes("pendiente"));
});

test("an approved agent without a card has no access to funds; with a card it respects every limit", () => {
  const store = setup();
  const agentId = approvePairing(store, code, now);
  ok(call(store, "get_wallet_status").content[0]!.text.includes("sin tarjeta"));
  ok(call(store, "request_purchase", { amount: "1", description: "x" }).content[0]!.text.includes("no tiene acceso a fondos"));

  configureAgentCard(store, agentId, 50_000_000n, 20_000_000n, now); // tope 5, máximo 2
  const bought = call(store, "request_purchase", { amount: "1.50", description: "Informe" });
  equal(bought.isError, undefined);
  equal(store.balance, 200_000_000n - 15_000_000n);
  ok(call(store, "request_purchase", { amount: "2.50", description: "x" }).content[0]!.text.includes("máximo por compra"));
  ok(call(store, "request_purchase", { amount: "abc", description: "x" }).isError);
  call(store, "request_purchase", { amount: "2", description: "otro" });
  ok(call(store, "request_purchase", { amount: "1.60", description: "x" }).content[0]!.text.includes("tope acumulado")); // 1,5 + 2 + 1,6 > 5
  const receipts = JSON.parse(call(store, "list_receipts").content[0]!.text) as unknown[];
  equal(receipts.length, 2);
});

test("a pending pairing expires after 10 minutes; a rejected one disappears", () => {
  const store = setup();
  const later = new Date(now.getTime() + 11 * 60_000);
  equal(findPairing(store, code, later), undefined);
  createPairing(store, "codex", "Codex · Escritorio", "tl_otro", now);
  rejectPairing(store, "tl_otro");
  equal(handleMcp(store, "tl_otro", rpc("ping"), now).status, 401);
});
