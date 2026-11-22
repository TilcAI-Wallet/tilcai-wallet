import { scValToNative, type xdr } from "@stellar/stellar-sdk";
import { testReportAmount, testReportRecipient } from "./testnet-constants.js";

/** WalletFoundation interface version this backend signs for. */
export const walletFoundationVersion = 2;
/** Largest revision PostgreSQL can store (bigint); larger on-chain values fail closed. */
export const maxPolicyRevision = 9_223_372_036_854_775_807n;

export function assertPolicyRevision(value: unknown): asserts value is bigint {
  if (typeof value !== "bigint" || value < 0n || value > maxPolicyRevision) throw new Error("invalid policy revision");
}

/** Exactly spend(amount: i128 = 0.50 USDC, recipient: Address = test recipient, expected_policy_revision: u64 = revision). */
export function isExpectedSpendCall(contract: string, functionName: string, args: readonly xdr.ScVal[], expectedContract: string, revision: bigint): boolean {
  if (contract !== expectedContract || functionName !== "spend" || args.length !== 3) return false;
  const [amount, recipient, expected] = args as [xdr.ScVal, xdr.ScVal, xdr.ScVal];
  try {
    return amount.type === "scvI128" && scValToNative(amount) === testReportAmount &&
      recipient.type === "scvAddress" && scValToNative(recipient) === testReportRecipient &&
      expected.type === "scvU64" && scValToNative(expected) === revision;
  } catch { return false; }
}

/** An envelope prepared for an older interface. It is kept for audit and never re-signed automatically. */
export class LegacyEnvelopeError extends Error {
  constructor() { super("envelope was signed for WalletFoundation v1 spend(amount); manual review required, not re-signed"); }
}
