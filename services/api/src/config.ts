import { z } from "zod";

const configSchema = z.object({
  API_HOST: z.string().min(1).default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
});

export function readConfig(env: NodeJS.ProcessEnv) {
  const config = configSchema.parse(env);
  return { host: config.API_HOST, port: config.API_PORT };
}
