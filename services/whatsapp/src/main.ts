import fastify from "fastify";
import { z } from "zod";
import { healthPath, type Health } from "@tilcai-wallet/api-contracts";

const env = z.object({
  WHATSAPP_HOST: z.string().min(1).default("127.0.0.1"),
  WHATSAPP_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
}).parse(process.env);

const app = fastify({ logger: true });
app.get(healthPath, async (): Promise<Health> => ({
  status: "ok",
  service: "whatsapp-adapter",
}));

try {
  await app.listen({ host: env.WHATSAPP_HOST, port: env.WHATSAPP_PORT });
} catch (error: unknown) {
  app.log.error(error);
  process.exitCode = 1;
}
