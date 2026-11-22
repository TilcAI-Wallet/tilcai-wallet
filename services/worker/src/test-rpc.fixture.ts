import { Account, Address, Networks, SorobanDataBuilder, StrKey, TransactionBuilder, nativeToScVal, rpc, xdr } from "@stellar/stellar-sdk";
import type { SendRpc } from "./testnet-broadcast.js";
import type { TestnetReadRpc } from "./testnet-worker.js";
import { testReportRecipient, testnetUsdcContract } from "./testnet-constants.js";

/** SIMULATED SEP-41 transfer event for tests only. It is not chain evidence. */
export function transferEvent(source: string, options: { asset?: string; recipient?: string; amount?: bigint } = {}) {
  return new xdr.ContractEvent({ ext: xdr.ExtensionPoint.v0(), contractId: new xdr.ContractId(StrKey.decodeContract(options.asset ?? testnetUsdcContract)),
    type: xdr.ContractEventType.contract,
    body: xdr.ContractEventBody.v0(new xdr.ContractEventV0({
      topics: [nativeToScVal("transfer", { type: "symbol" }), new Address(source).toScVal(), new Address(options.recipient ?? testReportRecipient).toScVal()],
      data: nativeToScVal(options.amount ?? 5_000_000n, { type: "i128" }),
    })) });
}

export type RpcOutcome = "not_found" | "timeout" | "verified" | "wrong_recipient" | "wrong_amount" | "failed";
/** SIMULATED read-only RPC for tests. It has no send method and never touches a network. */
export function simulatedReadRpc(sample: { bytes: Buffer; hash: string; contractId: string }, outcome: RpcOutcome, ledger = 110): TestnetReadRpc & { lookups: number } {
  const state = { lookups: 0 };
  const server = {
    get lookups() { return state.lookups; },
    getNetwork: async () => ({ passphrase: Networks.TESTNET, protocolVersion: 23 }),
    getLatestLedger: async () => { throw new Error("SIMULATED RPC: preparation is not expected"); },
    getAccount: async () => { throw new Error("SIMULATED RPC: preparation is not expected"); },
    simulateTransaction: async () => { throw new Error("SIMULATED RPC: preparation is not expected"); },
    getTransaction: async () => {
      state.lookups++;
      if (outcome === "timeout") throw new Error("SIMULATED timeout");
      if (outcome === "not_found") return { status: rpc.Api.GetTransactionStatus.NOT_FOUND, txHash: sample.hash };
      // Included but reverted, e.g. Error(Contract, #5) PolicyChanged after a set_policy before execution.
      if (outcome === "failed") return { status: rpc.Api.GetTransactionStatus.FAILED, txHash: sample.hash, ledger,
        envelopeXdr: TransactionBuilder.fromXDR(sample.bytes.toString("base64"), Networks.TESTNET).toEnvelope(), events: { contractEventsXdr: [[]] } };
      const event = outcome === "wrong_recipient" ? transferEvent(sample.contractId, { recipient: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" })
        : outcome === "wrong_amount" ? transferEvent(sample.contractId, { amount: 5_000_001n }) : transferEvent(sample.contractId);
      return { status: rpc.Api.GetTransactionStatus.SUCCESS, txHash: sample.hash, ledger,
        envelopeXdr: TransactionBuilder.fromXDR(sample.bytes.toString("base64"), Networks.TESTNET).toEnvelope(), events: { contractEventsXdr: [[event]] } };
    },
  };
  return server as unknown as TestnetReadRpc & { lookups: number };
}

/** Mutable state of a FAKE Testnet: no network access; sendTransaction only records the bytes. */
export interface FakeChain {
  network: string; latestLedger: number; accountSequence: string; version: number; revision: bigint; balance: bigint;
  policy: { agent: string; asset: string; recipient: string; frozen: boolean; max_per_payment: bigint; limit: bigint; spent: bigint };
  transaction: "not_found" | "verified" | "failed" | "timeout";
  send: "pending" | "duplicate" | "error" | "timeout";
  inclusionLedger: number;
}
export function fakeTestnetRpc(sample: { bytes: Buffer; hash: string; contractId: string; agent: string; policyRevision: bigint }, overrides: Partial<FakeChain> = {}) {
  const chain: FakeChain = { network: Networks.TESTNET, latestLedger: 105, accountSequence: "1", version: 2, revision: sample.policyRevision, balance: 200_000_000n,
    policy: { agent: sample.agent, asset: testnetUsdcContract, recipient: testReportRecipient, frozen: false, max_per_payment: 5_000_000n, limit: 5_000_000n, spent: 0n },
    transaction: "not_found", send: "pending", inclusionLedger: 110, ...overrides };
  const sent: Buffer[] = [], counters = { lookups: 0 };
  const envelopeXdr = () => TransactionBuilder.fromXDR(sample.bytes.toString("base64"), Networks.TESTNET).toEnvelope();
  const simulation = (retval: xdr.ScVal) => ({ id: "fake", latestLedger: chain.latestLedger, events: [], _parsed: true,
    transactionData: new SorobanDataBuilder().setResourceFee("1000"), minResourceFee: "1000", result: { retval, auth: [] } });
  const server = {
    getNetwork: async () => ({ passphrase: chain.network, protocolVersion: 23 }),
    getLatestLedger: async () => ({ sequence: chain.latestLedger }),
    getAccount: async (id: string) => new Account(id, chain.accountSequence),
    simulateTransaction: async (tx: { operations: unknown[] }) => {
      const name = (tx.operations[0] as { func: { invokeContract: { functionName: { toString(): string } } } }).func.invokeContract.functionName.toString();
      if (name === "version") return simulation(nativeToScVal(chain.version, { type: "u32" }));
      if (name === "policy_state") return simulation(xdr.ScVal.scvVec([nativeToScVal(chain.policy, { type: { max_per_payment: ["symbol", "i128"], limit: ["symbol", "i128"], spent: ["symbol", "i128"] } }), nativeToScVal(chain.revision, { type: "u64" })]));
      if (name === "balance") return simulation(nativeToScVal(chain.balance, { type: "i128" }));
      throw new Error(`FAKE RPC: unexpected simulation ${name}`);
    },
    getTransaction: async () => {
      counters.lookups++;
      if (chain.transaction === "timeout") throw new Error("FAKE timeout");
      if (chain.transaction === "not_found") return { status: rpc.Api.GetTransactionStatus.NOT_FOUND, txHash: sample.hash };
      if (chain.transaction === "failed") return { status: rpc.Api.GetTransactionStatus.FAILED, txHash: sample.hash, ledger: chain.inclusionLedger, envelopeXdr: envelopeXdr(), events: { contractEventsXdr: [[]] } };
      return { status: rpc.Api.GetTransactionStatus.SUCCESS, txHash: sample.hash, ledger: chain.inclusionLedger, envelopeXdr: envelopeXdr(), events: { contractEventsXdr: [[transferEvent(sample.contractId)]] } };
    },
    sendTransaction: async (tx: { toEnvelope(): { toXDR(): Uint8Array } }) => {
      sent.push(Buffer.from(tx.toEnvelope().toXDR()));
      if (chain.send === "timeout") throw new Error("FAKE send timeout");
      return { status: chain.send === "duplicate" ? "DUPLICATE" : chain.send === "error" ? "ERROR" : "PENDING", hash: sample.hash, latestLedger: chain.latestLedger, latestLedgerCloseTime: 0 };
    },
  };
  return { chain, sent, get lookups() { return counters.lookups; }, read: server as unknown as TestnetReadRpc, send: server as unknown as SendRpc };
}
