import pg from "pg";
import { z } from "zod";
import { processFixtureOnce } from "./fixture-worker.js";

const config = z.object({
  WORKER_MODE: z.enum(["disabled", "fixture"]).default("disabled"),
  WORKER_DATABASE_URL: z.string().min(1).optional(),
  RECONCILE_INTERVAL_MS: z.coerce.number().int().min(250).max(60000).default(5000),
  WORKER_LEASE_SECONDS: z.coerce.number().int().min(1).max(300).default(30),
}).parse(process.env);
if (process.argv.includes("--check") || config.WORKER_MODE === "disabled") {
  console.log("Worker configuration valid; payment processing is disabled.");
} else {
  if (!config.WORKER_DATABASE_URL) throw new Error("WORKER_DATABASE_URL is required");
  const url = new URL(config.WORKER_DATABASE_URL);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local && url.searchParams.get("sslmode") !== "verify-full") throw new Error("Remote database requires sslmode=verify-full");
  const pool = new pg.Pool({ connectionString:url.toString(), max:2, connectionTimeoutMillis:5000, statement_timeout:10000 });
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { stopping = true; });
  try {
    const identity = await pool.query("SELECT r.rolsuper, r.rolbypassrls, pg_has_role(current_user,'wallet_migrator','MEMBER') AS migrator, pg_has_role(current_user,'wallet_worker','USAGE') AS worker FROM pg_roles r WHERE r.rolname=current_user");
    if (!identity.rows[0] || identity.rows[0].rolsuper || identity.rows[0].rolbypassrls || identity.rows[0].migrator || !identity.rows[0].worker) throw new Error("Worker connection must use a dedicated non-privileged worker login");
    while (!stopping) {
      try { await processFixtureOnce(pool, config.WORKER_LEASE_SECONDS); }
      catch { console.error("Fixture worker iteration failed; will retry."); }
      if (!stopping) await new Promise<void>((resolve) => setTimeout(resolve, config.RECONCILE_INTERVAL_MS));
    }
  } finally { await pool.end(); }
}
