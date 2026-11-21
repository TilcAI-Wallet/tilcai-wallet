export type WalletNetwork = "testnet" | "mainnet";

export type CardState =
  | "draft"
  | "active"
  | "freeze_pending"
  | "frozen"
  | "revocation_pending"
  | "revoked";

export type OrderState =
  | "awaiting_budget"
  | "payment_pending"
  | "paid"
  | "delivered"
  | "failed";
