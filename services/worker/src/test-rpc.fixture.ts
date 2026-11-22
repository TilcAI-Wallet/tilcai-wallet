import { Address, Networks, StrKey, TransactionBuilder, nativeToScVal, rpc, xdr } from "@stellar/stellar-sdk";
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

export type RpcOutcome = "not_found" | "timeout" | "verified" | "wrong_recipient" | "wrong_amount";
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
      const event = outcome === "wrong_recipient" ? transferEvent(sample.contractId, { recipient: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" })
        : outcome === "wrong_amount" ? transferEvent(sample.contractId, { amount: 5_000_001n }) : transferEvent(sample.contractId);
      return { status: rpc.Api.GetTransactionStatus.SUCCESS, txHash: sample.hash, ledger,
        envelopeXdr: TransactionBuilder.fromXDR(sample.bytes.toString("base64"), Networks.TESTNET).toEnvelope(), events: { contractEventsXdr: [[event]] } };
    },
  };
  return server as unknown as TestnetReadRpc & { lookups: number };
}
