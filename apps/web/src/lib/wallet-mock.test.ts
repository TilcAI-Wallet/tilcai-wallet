import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { formatUsdc } from "./money.ts";
import { demoCardAfter, demoCardBefore, demoReceipts } from "./wallet-mock.ts";

const figures = (card: typeof demoCardBefore) => [card.balance, card.cap, card.available].map(formatUsdc);

test("the demo card shows 20,00 before and 19,50 after the 0,50 payment", () => {
  deepEqual(figures(demoCardBefore), ["20,00 USDC", "0,50 USDC", "0,50 USDC"]);
  deepEqual(figures(demoCardAfter), ["19,50 USDC", "0,50 USDC", "0,00 USDC"]);
});

test("every simulated record is labelled as simulated", () => {
  equal(demoCardBefore.simulated && demoCardAfter.simulated, true);
  for (const receipt of Object.values(demoReceipts)) equal(receipt.simulated, true);
});
