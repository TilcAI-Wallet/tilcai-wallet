import fastify from "fastify";
import type { Pool } from "pg";
import { registerPurchase } from "./purchase.js";
import { healthPath, type Health } from "@tilcai-wallet/api-contracts";

export function createApi(options: { logger?: boolean; pool?: Pool } = {}) {
  const app = fastify({ logger: options.logger ?? false });
  app.get(healthPath, async (): Promise<Health> => ({
    status: "ok",
    service: "wallet-api",
  }));
  registerPurchase(app, options.pool);
  return app;
}
