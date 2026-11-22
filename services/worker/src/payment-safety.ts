/** Checks derived from WalletFoundation.policy(). Values are atomic token units. */
export interface PaymentPolicy {
  contract: string;
  asset: string;
  recipient: string;
  agent: string;
  maxPerPayment: bigint;
  limit: bigint;
  spent: bigint;
  frozen: boolean;
}

export interface PaymentAuthorization {
  contract: string;
  asset: string;
  recipient: string;
  agent: string;
  amount: bigint;
}

/** The caller must obtain the policy freshly from the expected network. */
export function assertPaymentPolicy(policy: PaymentPolicy, authorization: PaymentAuthorization): void {
  if (
    !policy.contract || !policy.asset || !policy.recipient || !policy.agent ||
    policy.contract !== authorization.contract || policy.asset !== authorization.asset ||
    policy.recipient !== authorization.recipient || policy.agent !== authorization.agent
  ) throw new Error("policy identity mismatch");
  if (policy.frozen) throw new Error("policy frozen");
  if (policy.maxPerPayment <= 0n || policy.limit < 0n || policy.spent < 0n || policy.spent > policy.limit)
    throw new Error("invalid policy");
  if (authorization.amount <= 0n || authorization.amount > policy.maxPerPayment ||
      authorization.amount > policy.limit - policy.spent)
    throw new Error("payment exceeds policy");
}

/** RPC absence and timeouts are not proof of failure or expiry. */
export type LookupResult = "confirmed" | "failed" | "not_found" | "timeout";
export type ReconciliationDecision = "confirm" | "definitive_failure" | "retain_and_retry_lookup";
export function reconciliationDecision(result: LookupResult): ReconciliationDecision {
  switch (result) {
    case "confirmed": return "confirm";
    case "failed": return "definitive_failure";
    case "not_found":
    case "timeout": return "retain_and_retry_lookup";
    default: throw new Error("unknown reconciliation result");
  }
}
