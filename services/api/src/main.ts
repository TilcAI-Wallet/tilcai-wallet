import pg from "pg";
import { createApi } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig(process.env);
const databaseUrl = process.env.WALLET_API_DATABASE_URL;
let pool: pg.Pool | undefined;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const sslMode = url.searchParams.get("sslmode");
  if (!isLoopback && sslMode && sslMode !== "verify-full") throw new Error("Remote database requires sslmode=verify-full");
  if (!isLoopback && !sslMode) url.searchParams.set("sslmode", "verify-full");
  pool = new pg.Pool({ connectionString: url.toString(), max: 5 });
}
const api = createApi({ logger: true, pool });
if (pool) api.addHook("onClose", async () => { await pool.end(); });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void api.close().catch((error: unknown) => {
      api.log.error(error);
      process.exitCode = 1;
    });
  });
}

try {
  await api.listen(config);
} catch (error: unknown) {
  api.log.error(error);
  process.exitCode = 1;
}
