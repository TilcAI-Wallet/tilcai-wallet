import type { PaymentAuthorization, PaymentPolicy } from "./payment-safety.js";

/** Signed envelope bytes are sensitive and must never be logged. */
export interface PreparedPayment {
  envelope: Uint8Array;
  hash: string;
  network: "testnet";
  validThroughLedger: number;
}
export type PaymentLookup =
  | { status: "confirmed"; ledger: number }
  | { status: "failed" }
  | { status: "not_found" }
  | { status: "timeout" };

/** Implementations must persist the final envelope and its network hash before submit. */
export interface PaymentPort {
  policy(contract: string): Promise<PaymentPolicy>;
  prepare(authorization: PaymentAuthorization): Promise<PreparedPayment>;
  submit(prepared: PreparedPayment): Promise<void>;
  lookup(hash: string): Promise<PaymentLookup>;
}
