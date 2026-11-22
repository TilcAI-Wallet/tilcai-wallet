import { strict as assert } from "node:assert";
import { test } from "node:test";
import { claimPayment, recordPrepared, type WorkerConnection } from "./lease.js";

test("lost lease cannot store a prepared payment", async () => {
  const statements: string[] = [];
  const client: WorkerConnection = { async query(sql) { statements.push(sql); return { rows: [], rowCount: 0 }; }, release() {} };
  const result = await recordPrepared({ connect: async () => client }, { tenant:"tenant",network:"testnet",eventId:"event",orderId:"order",token:"stale" }, { hash:"a".repeat(64),envelopeRef:"private:envelope-1",validThroughLedger:123 });
  assert.equal(result,false);
  assert.equal(statements.some((sql) => sql.startsWith("UPDATE wallet_private.attempts")),false);
  assert.equal(statements.at(-1),"COMMIT");
});

test("claim rejects invalid network and lease length before connecting", async () => {
  const pool = { async connect(): Promise<WorkerConnection> { throw new Error("must not connect"); } };
  await assert.rejects(() => claimPayment(pool,"tenant","mainnet",10), /invalid lease request/);
  await assert.rejects(() => claimPayment(pool,"tenant","testnet",301), /invalid lease request/);
});
