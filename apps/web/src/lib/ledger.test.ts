import { equal, throws } from "node:assert/strict";
import { test } from "node:test";
import { available, createStore, fund, LedgerError, payAgent, resolveRequest, setAgentPaused, setCodexSession, transfer, codexAgentId } from "./ledger.ts";

const now = new Date("2026-11-22T10:00:00.000Z");

test("the demo payment leaves 19,50 and nothing available for the agent", () => {
  const store = createStore();
  equal(available(store), 5_000_000n);
  payAgent(store, now);
  payAgent(store, now); // idempotente
  equal(store.balance, 195_000_000n);
  equal(available(store), 0n);
  equal(store.activity.filter((item) => item.kind === "payment").length, 1);
});

test("funding adds balance and activity; transfers subtract and refuse overdrafts", () => {
  const store = createStore();
  fund(store, 100_000_000n, now);
  equal(store.balance, 300_000_000n);
  transfer(store, "GDEST", 50_000_000n, now);
  equal(store.balance, 250_000_000n);
  throws(() => transfer(store, "GDEST", 999_000_000_000n, now), LedgerError);
  throws(() => fund(store, 0n, now), LedgerError);
  equal(store.activity[0]!.kind, "transfer");
});

test("approving a cap increase raises what the agent can spend, once", () => {
  const store = createStore();
  payAgent(store, now);
  resolveRequest(store, "ntf_request", true);
  equal(available(store), 5_000_000n);
  throws(() => resolveRequest(store, "ntf_request", true), LedgerError);
});

test("pausing the agent or ending the session removes the agent's spending power", () => {
  const store = createStore();
  setAgentPaused(store, codexAgentId, true);
  equal(store.cardState, "frozen");
  equal(available(store), 0n);
  setAgentPaused(store, codexAgentId, false);
  setCodexSession(store, false);
  equal(available(store), 0n);
  setCodexSession(store, true);
  equal(available(store), 5_000_000n);
});
