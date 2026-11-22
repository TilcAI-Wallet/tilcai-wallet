import { Account, Address, Contract, Networks, TransactionBuilder, rpc, scValToNative } from "@stellar/stellar-sdk";
import type { PaymentPolicy } from "./payment-safety.js";
import { assertPolicyRevision, walletFoundationVersion } from "./spend-interface.js";
import { testnetUsdcContract } from "./testnet-constants.js";

export type StateRpc = Pick<rpc.Server, "simulateTransaction">;
export interface FoundationState { policy: PaymentPolicy; revision: bigint; balance: bigint }
type Operation = ReturnType<Contract["call"]>;
/** Validity of a signed spend: about ten minutes, enough for the human authorization of its exact hash.
 * Both bounds apply; the envelope stays bound to recipient and policy revision for its whole life. */
export const envelopeValidityLedgers = 120;
export const envelopeValiditySeconds = 600;

/** Read-only simulations against a fresh ledger. Rejects v1 contracts and malformed state. */
export function foundationReader(server: StateRpc, source: { accountId: string; sequence: string }, latest: number, validThroughLedger: number) {
  const build = (operation: Operation) => new TransactionBuilder(new Account(source.accountId, source.sequence), { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(operation).setTimeout(envelopeValiditySeconds).setLedgerbounds(latest, validThroughLedger).build();
  async function simulate(tx: ReturnType<typeof build>) {
    const sim = await server.simulateTransaction(tx);
    if (!rpc.Api.isSimulationSuccess(sim) || rpc.Api.isSimulationRestore(sim) || !sim.result || sim.latestLedger < latest || sim.latestLedger > latest + 5) throw new Error("simulation unavailable or stale");
    return sim;
  }
  async function readState(contractId: string): Promise<FoundationState> {
    const contract = new Contract(contractId);
    // v1 contracts expose spend(amount) without recipient or revision binding and are rejected.
    const version = scValToNative((await simulate(build(contract.call("version")))).result!.retval);
    if (version !== walletFoundationVersion) throw new Error("unsupported WalletFoundation version: v2 required");
    // policy_state returns policy and revision from one invocation, so they are consistent.
    const state = scValToNative((await simulate(build(contract.call("policy_state")))).result!.retval) as unknown;
    if (!Array.isArray(state) || state.length !== 2) throw new Error("invalid on-chain policy state");
    const raw = state[0] as Record<string, unknown>, revision = state[1] as unknown;
    if (typeof raw !== "object" || raw === null || typeof raw.agent !== "string" || typeof raw.asset !== "string" || typeof raw.recipient !== "string" || typeof raw.frozen !== "boolean" || typeof raw.max_per_payment !== "bigint" || typeof raw.limit !== "bigint" || typeof raw.spent !== "bigint") throw new Error("invalid on-chain policy");
    assertPolicyRevision(revision);
    const policy: PaymentPolicy = { contract: contractId, agent: raw.agent, asset: raw.asset, recipient: raw.recipient, frozen: raw.frozen, maxPerPayment: raw.max_per_payment, limit: raw.limit, spent: raw.spent };
    const balance = scValToNative((await simulate(build(new Contract(testnetUsdcContract).call("balance", new Address(contractId).toScVal())))).result!.retval);
    if (typeof balance !== "bigint") throw new Error("invalid on-chain balance");
    return { policy, revision, balance };
  }
  return { build, simulate, readState };
}
