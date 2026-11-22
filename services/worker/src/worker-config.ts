import { z } from "zod";
import { broadcastBlocker } from "./testnet-constants.js";

const base = z.object({
  WORKER_MODE: z.enum(["disabled", "fixture", "testnet"]).default("disabled"),
  WORKER_DATABASE_URL: z.string().min(1).optional(),
  RECONCILE_INTERVAL_MS: z.coerce.number().int().min(250).max(60000).default(5000),
  WORKER_LEASE_SECONDS: z.coerce.number().int().min(1).max(300).default(30),
  RPC_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(10000),
  STELLAR_RPC_URL: z.string().optional(),
  ENVELOPE_KEY_ID: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  ENVELOPE_KEY_FILE: z.string().min(1).optional(),
  AGENT_SIGNER_SECRET_FILE: z.string().min(1).optional(),
  TESTNET_BROADCAST: z.string().optional(),
  TESTNET_BROADCAST_ORDER_ID: z.string().optional(),
});
export type WorkerConfig = z.infer<typeof base>;

/** Fails closed: Testnet mode needs a trusted HTTPS RPC and an external envelope key. */
export function parseWorkerConfig(env: NodeJS.ProcessEnv): WorkerConfig {
  const config = base.parse(env);
  // Disabled unless the exact mode is set; any other value refuses to start.
  if (config.TESTNET_BROADCAST !== undefined && config.TESTNET_BROADCAST !== "disabled" && config.TESTNET_BROADCAST !== "single-authorized") throw new Error(broadcastBlocker);
  if (config.TESTNET_BROADCAST === "single-authorized") {
    if (config.WORKER_MODE !== "testnet") throw new Error(`${broadcastBlocker} single-authorized requires WORKER_MODE=testnet`);
    if (!config.TESTNET_BROADCAST_ORDER_ID || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(config.TESTNET_BROADCAST_ORDER_ID))
      throw new Error(`${broadcastBlocker} single-authorized requires TESTNET_BROADCAST_ORDER_ID naming exactly one order`);
  } else if (config.TESTNET_BROADCAST_ORDER_ID !== undefined) {
    throw new Error(`${broadcastBlocker} TESTNET_BROADCAST_ORDER_ID is only valid with single-authorized`);
  }
  if (config.WORKER_MODE === "testnet") {
    let rpcUrl: URL;
    try { rpcUrl = new URL(config.STELLAR_RPC_URL ?? ""); } catch { throw new Error("STELLAR_RPC_URL must be an HTTPS Testnet RPC URL"); }
    if (rpcUrl.protocol !== "https:" || rpcUrl.username || rpcUrl.password) throw new Error("STELLAR_RPC_URL must be an HTTPS Testnet RPC URL");
    if (!config.ENVELOPE_KEY_ID || !config.ENVELOPE_KEY_FILE) throw new Error("ENVELOPE_KEY_ID and ENVELOPE_KEY_FILE are required in testnet mode");
  }
  return config;
}

/** Secret files must not be readable by group or others. Content is never logged. */
export function assertPrivateFile(mode: number, label: string): void {
  if (process.platform !== "win32" && (mode & 0o077) !== 0) throw new Error(`${label} must not be accessible by group or others`);
}

export function decodeEnvelopeKey(text: string): Buffer {
  const key = Buffer.from(text.trim(), "base64");
  if (key.length !== 32 || key.toString("base64") !== text.trim()) throw new Error("envelope key must be 32 bytes in base64");
  return key;
}
