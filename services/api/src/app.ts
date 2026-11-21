import fastify from "fastify";
import { healthPath, type Health } from "@tilcai-wallet/api-contracts";

export function createApi(options: { logger?: boolean } = {}) {
  const app = fastify({ logger: options.logger ?? false });
  app.get(healthPath, async (): Promise<Health> => ({
    status: "ok",
    service: "wallet-api",
  }));
  return app;
}
