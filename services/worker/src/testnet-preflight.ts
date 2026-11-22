import type { Pool } from "pg";
import type { rpc } from "@stellar/stellar-sdk";
import { prepareTestnetDryRun, type AgentSigner } from "./testnet-dry-run.js";
import { storeTestnetEnvelope, type EnvelopeLease } from "./postgres-envelope-vault.js";

/** Prepares, signs and durably stores an envelope. This function never broadcasts.
 * `policyRevision` is the revision reviewed for the card; the contract must still be at it. */
export async function prepareAndPersistTestnet(
  pool: Pool,
  server: Pick<rpc.Server,"getNetwork"|"getLatestLedger"|"getAccount"|"simulateTransaction">,
  signer: AgentSigner,
  lease: EnvelopeLease,
  resource: { orderId: string; attemptId: string; contractId: string; keyId: string; policyRevision: bigint },
  key: Buffer,
): Promise<{hash:string;validThroughLedger:number;policyRevision:bigint}> {
  const prepared = await prepareTestnetDryRun(server,signer,resource.contractId,resource.policyRevision);
  const stored = await storeTestnetEnvelope(pool,lease,{...resource,agent:signer.publicKey,tenantId:lease.tenantId,transactionHash:prepared.hash,validThroughLedger:prepared.validThroughLedger,policyRevision:prepared.policyRevision},key,prepared.envelope);
  if (!stored) throw new Error("envelope was not persisted: lease lost, attempt already prepared or card revision changed");
  return {hash:prepared.hash,validThroughLedger:prepared.validThroughLedger,policyRevision:prepared.policyRevision};
}
