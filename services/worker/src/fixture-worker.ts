import { createHash } from "node:crypto";
import type { Pool } from "pg";

/** Fixture-only: bytes and hash are synthetic, not a Stellar envelope or evidence. */
export async function processFixtureOnce(pool: Pool, leaseSeconds: number): Promise<boolean> {
  const claim = await pool.query("SELECT * FROM wallet_private.claim_fixture($1)", [leaseSeconds]);
  const task = claim.rows[0];
  if (!task) return false;
  const payload = Buffer.from(JSON.stringify(["tilcai-fixture-v1", task.order_id]), "utf8");
  const hash = createHash("sha256").update(payload).digest("hex");
  for (const step of ["prepare", "submit", "confirm"] as const) {
    const renewed = await pool.query("SELECT wallet_private.renew_fixture($1,$2,$3,$4) AS owned", [task.tenant_id,task.event_id,task.lease_token,leaseSeconds]);
    if (!renewed.rows[0].owned) return true;
    // prepare can already have happened before a restart; submit is idempotent.
    const result = await pool.query("SELECT wallet_private.advance_fixture($1,$2,$3,$4,$5,$6) AS changed", [task.tenant_id,task.event_id,task.lease_token,step,hash,payload]);
    if (step !== "prepare" && !result.rows[0].changed) return true;
  }
  return true;
}
