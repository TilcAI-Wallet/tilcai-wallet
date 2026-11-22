import { createHash } from "node:crypto";
import { createOrderSchema, type CreateOrder } from "@tilcai-wallet/api-contracts";

/** Canonical request digest for an idempotency record; not a Stellar transaction hash. */
export function orderRequestDigest(input: unknown): { order: CreateOrder; digest: Buffer } {
  const order = createOrderSchema.parse(input);
  const canonical = JSON.stringify(["wallet.order.create.v1", order.cardId, order.offerId, order.maxAmountMinor]);
  return { order, digest: createHash("sha256").update(canonical, "utf8").digest() };
}
