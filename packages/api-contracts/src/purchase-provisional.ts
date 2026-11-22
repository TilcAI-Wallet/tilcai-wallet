/** Temporary contract pending alignment with issue #4. No payment endpoint is enabled yet. */
import { z } from "zod";

const identifier = z.string().uuid();
const atomic = z.string().regex(/^(0|[1-9][0-9]{0,18})$/).refine(
  (value) => !/^(0|[1-9][0-9]{0,18})$/.test(value) || BigInt(value) <= 9_223_372_036_854_775_807n,
  "atomic amount exceeds PostgreSQL bigint",
);
const positiveAtomic = atomic.refine((value) => value !== "0", "amount must be positive");

export const provisionalCreateOrderSchema = z.strictObject({
  cardId: identifier,
  amountAtomic: positiveAtomic,
});
export const provisionalCardSchema = z.strictObject({
  cardId: identifier,
  network: z.literal("testnet"),
  asset: z.string().min(1),
  confirmedBalanceAtomic: atomic,
  confirmedLedger: z.number().int().nonnegative(),
  projectedBalanceAtomic: atomic,
  heldAtomic: atomic,
  availableBudgetAtomic: atomic,
});
export const provisionalOrderSchema = z.strictObject({
  orderId: identifier,
  cardId: identifier,
  amountAtomic: positiveAtomic,
  paymentStatus: z.enum(["pending", "uncertain", "confirmed", "failed"]),
  deliveryStatus: z.enum(["pending", "delivered", "failed"]),
  refundStatus: z.enum(["none", "pending", "confirmed", "failed"]),
  receiptId: identifier.nullable(),
});
export const provisionalReceiptSchema = z.strictObject({
  receiptId: identifier,
  orderId: identifier,
  network: z.literal("testnet"),
  contract: z.string().min(1),
  asset: z.string().min(1),
  recipient: z.string().min(1),
  amountAtomic: positiveAtomic,
  amountFormatted: z.string().max(28).regex(/^(0|[1-9][0-9]*)\.[0-9]{7}$/),
  evidence: z.literal("stellar_testnet"),
  transactionHash: z.string().regex(/^[a-f0-9]{64}$/),
  ledger: z.number().int().positive(),
  paymentStatus: z.literal("confirmed"),
  deliveryStatus: z.enum(["pending", "delivered", "failed"]),
  refundStatus: z.enum(["none", "pending", "confirmed", "failed"]),
}).refine((receipt) => {
  const [whole, fraction] = receipt.amountFormatted.split(".");
  if (!whole || !fraction || whole.length + fraction.length > 27 || receipt.amountAtomic.length > 19 || !/^\d+$/.test(whole + fraction) || !/^\d+$/.test(receipt.amountAtomic)) return false;
  return BigInt(whole + fraction) === BigInt(receipt.amountAtomic);
}, "formatted amount must match atomic amount");
export type ProvisionalCreateOrder = z.infer<typeof provisionalCreateOrderSchema>;
export type ProvisionalCard = z.infer<typeof provisionalCardSchema>;
export type ProvisionalOrder = z.infer<typeof provisionalOrderSchema>;
export type ProvisionalReceipt = z.infer<typeof provisionalReceiptSchema>;
