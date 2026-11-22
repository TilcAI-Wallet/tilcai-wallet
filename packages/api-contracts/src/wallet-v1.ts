import { cardStates, orderStates } from "@tilcai-wallet/domain";
import { z } from "zod";

export const walletV1Routes = {
  sessions: "/v1/sessions",
  session: (id: string) => `/v1/sessions/${encodeURIComponent(id)}`,
  cards: "/v1/cards",
  card: (id: string) => `/v1/cards/${encodeURIComponent(id)}`,
  orders: "/v1/orders",
  order: (id: string) => `/v1/orders/${encodeURIComponent(id)}`,
  receipts: "/v1/receipts",
  receipt: (id: string) => `/v1/receipts/${encodeURIComponent(id)}`,
} as const;

export const idempotencyHeader = "Idempotency-Key";
export const stellarTestnetUsdc = {
  network: "testnet",
  code: "USDC",
  decimals: 7,
  issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
} as const;

const dataModeSchema = z.enum(["fixture", "testnet"]);
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const accountAddressSchema = z.string().regex(/^[GC][A-Z2-7]{55}$/);
const maxSorobanAmount = "170141183460469231731687303715884105727";

export const walletIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/);
export const idempotencyKeySchema = walletIdSchema;
export const amountMinorSchema = z.string()
  .regex(/^(0|[1-9][0-9]{0,38})$/)
  .refine((value) => value.length < maxSorobanAmount.length || value <= maxSorobanAmount, {
    message: "Amount exceeds the Soroban i128 maximum",
  });
export const positiveAmountMinorSchema = amountMinorSchema.refine((value) => value !== "0", {
  message: "Amount must be positive",
});

export const sessionSchema = z.object({
  mode: dataModeSchema,
  sessionId: walletIdSchema,
  cardId: walletIdSchema,
  agentName: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["active", "expired", "revoked"]),
});

export const cardSchema = z.object({
  mode: dataModeSchema,
  cardId: walletIdSchema,
  sessionId: walletIdSchema,
  name: z.string().min(1),
  status: z.enum(cardStates),
  asset: z.object({
    network: z.literal(stellarTestnetUsdc.network),
    code: z.literal(stellarTestnetUsdc.code),
    decimals: z.literal(stellarTestnetUsdc.decimals),
    issuer: z.literal(stellarTestnetUsdc.issuer),
    contractId: z.literal(stellarTestnetUsdc.contractId),
  }),
  accountAddress: accountAddressSchema.nullable(),
  balanceMinor: amountMinorSchema,
  perPaymentLimitMinor: amountMinorSchema,
  totalLimitMinor: amountMinorSchema,
  spentMinor: amountMinorSchema,
  availableMinor: amountMinorSchema,
});

export const createOrderSchema = z.strictObject({
  cardId: walletIdSchema,
  offerId: walletIdSchema,
  maxAmountMinor: positiveAmountMinorSchema,
});

export const orderSchema = z.object({
  mode: dataModeSchema,
  orderId: walletIdSchema,
  cardId: walletIdSchema,
  sessionId: walletIdSchema,
  offerId: walletIdSchema,
  amountMinor: positiveAmountMinorSchema,
  status: z.enum(orderStates),
  receiptId: walletIdSchema.nullable(),
});

const paymentSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("not_submitted") }),
  z.object({ status: z.literal("pending"), txHash: sha256Schema.optional() }),
  z.object({
    status: z.literal("confirmed"),
    txHash: sha256Schema,
    ledger: z.number().int().positive(),
  }),
  z.object({ status: z.literal("failed"), txHash: sha256Schema.optional() }),
]);

const deliverySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({
    status: z.literal("delivered"),
    providerId: walletIdSchema,
    evidenceId: walletIdSchema,
    digest: sha256Schema,
  }),
  z.object({ status: z.literal("failed") }),
]);

export const receiptSchema = z.object({
  mode: dataModeSchema,
  receiptId: walletIdSchema,
  orderId: walletIdSchema,
  sessionId: walletIdSchema,
  cardId: walletIdSchema,
  network: z.literal(stellarTestnetUsdc.network),
  assetContractId: z.literal(stellarTestnetUsdc.contractId),
  sourceAddress: accountAddressSchema.nullable(),
  recipientAddress: accountAddressSchema.nullable(),
  amountMinor: positiveAmountMinorSchema,
  payment: paymentSchema,
  delivery: deliverySchema,
  refundStatus: z.enum(["none", "pending", "confirmed", "failed"]),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "invalid_request",
      "unauthenticated",
      "forbidden",
      "not_found",
      "idempotency_conflict",
      "limit_exceeded",
      "rate_limited",
      "service_unavailable",
    ]),
  }),
});

export type WalletSession = z.infer<typeof sessionSchema>;
export type WalletCard = z.infer<typeof cardSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type WalletOrder = z.infer<typeof orderSchema>;
export type WalletReceipt = z.infer<typeof receiptSchema>;
export type WalletApiError = z.infer<typeof apiErrorSchema>;
