import { equal } from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createPairing, fund } from "./ledger.ts";

test("the demo state survives a server restart", async () => {
  const original = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), "tilcai-"));
  process.chdir(dir); // el archivo de estado se guarda en <cwd>/.data
  try {
    const { commit, resetDemo, store } = await import("./wallet.ts");
    resetDemo();
    fund(store(), 50_000_000n, new Date());
    createPairing(store(), "claude", "Claude · Portátil", "tl_prueba", new Date());
    commit();

    // Un reinicio borra la memoria del proceso: el estado debe volver del archivo, con los bigint intactos.
    const shared = globalThis as { __tilcaiStore?: unknown; __tilcaiStamp?: number };
    delete shared.__tilcaiStore;
    delete shared.__tilcaiStamp;
    equal(store().balance, 250_000_000n);
    equal(store().pairings[0]?.code, "tl_prueba");
  } finally {
    process.chdir(original);
    rmSync(dir, { recursive: true, force: true });
  }
});
