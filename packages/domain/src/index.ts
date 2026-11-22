export type WalletNetwork = "testnet" | "mainnet";

export const cardStates = [
  "draft",
  "active",
  "freeze_pending",
  "frozen",
  "revocation_pending",
  "revoked",
] as const;

export type CardState = (typeof cardStates)[number];

export const orderStates = [
  "awaiting_budget",
  "payment_pending",
  "paid",
  "delivered",
  "failed",
] as const;

export type OrderState = (typeof orderStates)[number];
