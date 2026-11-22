import { readFile, stat } from "node:fs/promises";
import pg from "pg";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { DemoReportProvider } from "./demo-report-provider.js";
import { processFixtureOnce } from "./fixture-worker.js";
import { broadcastBlocker } from "./testnet-constants.js";
import type { AgentSigner } from "./testnet-dry-run.js";
import { processDemoDeliveryOnce } from "./demo-delivery-worker.js";
import { processTestnetPaymentOnce } from "./testnet-worker.js";
import { assertPrivateFile, decodeEnvelopeKey, parseWorkerConfig } from "./worker-config.js";

async function readSecretFile(path: string, label: string): Promise<string> {
  assertPrivateFile((await stat(path)).mode, label);
  return readFile(path, "utf8");
}

const config = parseWorkerConfig(process.env);
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
    let iterate: () => Promise<void>;
    if (config.WORKER_MODE === "testnet") {
      const key = decodeEnvelopeKey(await readSecretFile(config.ENVELOPE_KEY_FILE!, "ENVELOPE_KEY_FILE"));
      const keyForId = async (id: string) => { if (id !== config.ENVELOPE_KEY_ID) throw new Error("unknown envelope key id"); return key; };
      let signer: AgentSigner | undefined;
      if (config.AGENT_SIGNER_SECRET_FILE) {
        const agent = Keypair.fromSecret((await readSecretFile(config.AGENT_SIGNER_SECRET_FILE, "AGENT_SIGNER_SECRET_FILE")).trim());
        signer = { publicKey: agent.publicKey(), signHash: async (hash) => agent.sign(Buffer.from(hash)) };
      }
      const server = new rpc.Server(config.STELLAR_RPC_URL!, { allowHttp: false });
      const provider = new DemoReportProvider();
      const broadcast = config.TESTNET_BROADCAST === "single-authorized" ? { orderId: config.TESTNET_BROADCAST_ORDER_ID!, rpc: server } : undefined;
      console.log(broadcast
        ? `Testnet worker started with single-authorized broadcast for one order; each send needs a stored authorization for its exact hash.`
        : `Testnet worker started without broadcast. ${broadcastBlocker}`);
      iterate = async () => {
        const payment = await processTestnetPaymentOnce({ pool, rpc: server, signer, keyId: config.ENVELOPE_KEY_ID!, keyForId, leaseSeconds: config.WORKER_LEASE_SECONDS, rpcTimeoutMs: config.RPC_TIMEOUT_MS, broadcast });
        if (payment !== "idle") console.log(`Testnet payment step: ${payment}`);
        const delivery = await processDemoDeliveryOnce({ pool, provider, leaseSeconds: config.WORKER_LEASE_SECONDS });
        if (delivery !== "idle") console.log(`Demo delivery step: ${delivery}`);
      };
    } else {
      iterate = async () => { await processFixtureOnce(pool, config.WORKER_LEASE_SECONDS); };
    }
    while (!stopping) {
      try { await iterate(); }
      catch { console.error(`${config.WORKER_MODE} worker iteration failed; will retry.`); }
      if (!stopping) await new Promise<void>((resolve) => setTimeout(resolve, config.RECONCILE_INTERVAL_MS));
    }
  } finally { await pool.end(); }
}
