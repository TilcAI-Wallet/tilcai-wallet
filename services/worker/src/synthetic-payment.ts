import { createHash } from "node:crypto";
import { assertPaymentPolicy, type PaymentAuthorization, type PaymentPolicy } from "./payment-safety.js";

/** Test-only data: neither bytes nor hashes represent a Stellar transaction. */
export interface SyntheticPayment {
  kind: "synthetic";
  bytes: Uint8Array;
  hash: `synthetic:${string}`;
}

export class SyntheticPaymentAdapter {
  readonly #policy: PaymentPolicy;
  readonly #submitted = new Set<string>();
  constructor(policy: PaymentPolicy) { this.#policy = { ...policy }; }
  prepare(authorization: PaymentAuthorization): SyntheticPayment {
    assertPaymentPolicy(this.#policy, authorization);
    const bytes = new TextEncoder().encode(JSON.stringify([
      authorization.contract, authorization.asset, authorization.recipient,
      authorization.agent, authorization.amount.toString(),
    ]));
    return { kind: "synthetic", bytes, hash: this.#hash(bytes) };
  }
  submit(payment: SyntheticPayment): void {
    if (payment.kind !== "synthetic" || payment.hash !== this.#hash(payment.bytes))
      throw new Error("invalid synthetic payment");
    this.#submitted.add(payment.hash);
  }
  wasSubmitted(hash: string): boolean { return this.#submitted.has(hash); }
  #hash(bytes: Uint8Array): `synthetic:${string}` {
    return `synthetic:${createHash("sha256").update(bytes).digest("hex")}`;
  }
}
