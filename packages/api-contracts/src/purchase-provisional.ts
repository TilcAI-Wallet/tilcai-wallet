/** Internal formatting helper; public schemas and routes are defined by wallet-v1. */
import { amountMinorSchema } from "./wallet-v1.js";

export function formatUsdcMinor(value: string): string {
  const amount = BigInt(amountMinorSchema.parse(value));
  const scale = 10_000_000n;
  return `${amount / scale}.${(amount % scale).toString().padStart(7, "0")}`;
}
