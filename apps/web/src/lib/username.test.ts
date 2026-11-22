import assert from "node:assert/strict";
import test from "node:test";
import { parseUsername } from "./username";

test("acepta nombres válidos y recorta los bordes", () => {
  assert.deepEqual(parseUsername("  ana.paz_01 "), { ok: true, value: "ana.paz_01" });
  assert.deepEqual(parseUsername("José-M"), { ok: true, value: "José-M" });
});

test("rechaza largo fuera de rango, espacios y símbolos", () => {
  for (const bad of ["", "ab", "a".repeat(21), "ana paz", "ana@paz", "ana😀"]) assert.equal(parseUsername(bad).ok, false, bad);
});
