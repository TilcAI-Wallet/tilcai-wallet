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

test("parses typed amounts into atomic units", async () => {
  const { parseUsdc } = await import("./money.ts");
  equal(parseUsdc("12"), "120000000");
  equal(parseUsdc("0,5"), "5000000");
  equal(parseUsdc(" 1.2345678 "), "12345678");
  equal(parseUsdc("0"), null);
  equal(parseUsdc("-1"), null);
  equal(parseUsdc("1,23456789"), null);
  equal(parseUsdc("abc"), null);
  equal(parseUsdc(""), null);
});
