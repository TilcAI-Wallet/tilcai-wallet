import {
  stellarTestnetUsdc,
  type CreateOrder,
  type WalletApiError,
  type WalletCard,
  type WalletOrder,
  type WalletReceipt,
  type WalletSession,
} from "./wallet-v1.js";

const session = {
  mode: "fixture",
  sessionId: "session-codex-laptop",
  cardId: "card-codex-laptop",
  agentName: "Codex",
  name: "Portátil",
  status: "active",
} satisfies WalletSession;

const cardBefore = {
  mode: "fixture",
  cardId: session.cardId,
  sessionId: session.sessionId,
  name: "Codex · Portátil",
  status: "active",
  asset: stellarTestnetUsdc,
  accountAddress: null,
  balanceMinor: "200000000",
  perPaymentLimitMinor: "5000000",
  totalLimitMinor: "5000000",
  spentMinor: "0",
  availableMinor: "5000000",
} satisfies WalletCard;

const cardAfter = {
  ...cardBefore,
  balanceMinor: "195000000",
  spentMinor: "5000000",
  availableMinor: "0",
} satisfies WalletCard;

const createOrder = {
  cardId: session.cardId,
  offerId: "test-report",
  maxAmountMinor: "5000000",
} satisfies CreateOrder;

const orderDelivered = {
  mode: "fixture",
  orderId: "order-test-report",
  cardId: session.cardId,
  sessionId: session.sessionId,
  offerId: createOrder.offerId,
  amountMinor: createOrder.maxAmountMinor,
  status: "delivered",
  receiptId: "receipt-test-report",
} satisfies WalletOrder;

const orderPending = {
  ...orderDelivered,
  status: "payment_pending",
  receiptId: null,
} satisfies WalletOrder;

const receipt = {
  mode: "fixture",
  receiptId: orderDelivered.receiptId,
  orderId: orderDelivered.orderId,
  cardId: session.cardId,
  sessionId: session.sessionId,
  network: stellarTestnetUsdc.network,
  assetContractId: stellarTestnetUsdc.contractId,
  sourceAddress: null,
  recipientAddress: null,
  amountMinor: orderDelivered.amountMinor,
  payment: { status: "confirmed", txHash: "1".repeat(64), ledger: 1 },
  delivery: {
    status: "delivered",
    providerId: "demo-report-provider",
    evidenceId: "delivery-test-report",
    digest: "2".repeat(64),
  },
  refundStatus: "none",
} satisfies WalletReceipt;

const limitExceeded = { error: { code: "limit_exceeded" } } satisfies WalletApiError;
const idempotencyConflict = { error: { code: "idempotency_conflict" } } satisfies WalletApiError;

export const demoWallet = {
  session,
  cardBefore,
  cardAfter,
  idempotencyKey: "buy-test-report-fixture-1",
  createOrder,
  orderPending,
  orderDelivered,
  receipt,
  limitExceeded,
  idempotencyConflict,
} as const;
