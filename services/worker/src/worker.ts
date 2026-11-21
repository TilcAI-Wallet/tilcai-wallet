import { z } from "zod";

const envSchema = z.object({
  RECONCILE_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
});

const env = envSchema.parse(process.env);
console.log(`Reconciler configuration valid (interval ${env.RECONCILE_INTERVAL_MS}ms).`);
