import { equal } from "node:assert/strict";
import { test } from "node:test";
import { formatUsdc } from "./money.ts";

test("formats atomic USDC amounts with a decimal comma", () => {
  equal(formatUsdc("200000000"), "20,00 USDC");
  equal(formatUsdc("195000000"), "19,50 USDC");
  equal(formatUsdc("5000000"), "0,50 USDC");
  equal(formatUsdc("0"), "0,00 USDC");
  equal(formatUsdc("12345678901"), "1.234,5678901 USDC");
});
