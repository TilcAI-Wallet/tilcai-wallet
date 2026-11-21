import { z } from "zod";

export const healthPath = "/healthz";

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.enum(["wallet-api", "whatsapp-adapter"]),
});

export type Health = z.infer<typeof healthSchema>;
