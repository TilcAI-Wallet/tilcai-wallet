import type { Pool } from "pg";
import type { rpc } from "@stellar/stellar-sdk";
import { prepareTestnetDryRun, type AgentSigner } from "./testnet-dry-run.js";
import { storeTestnetEnvelope, type EnvelopeLease } from "./postgres-envelope-vault.js";

/** Prepares, signs and durably stores an envelope. This function never broadcasts. */
export async function prepareAndPersistTestnet(
  pool: Pool,
  server: Pick<rpc.Server,"getNetwork"|"getLatestLedger"|"getAccount"|"simulateTransaction">,
  signer: AgentSigner,
  lease: EnvelopeLease,
  resource: { orderId: string; attemptId: string; contractId: string; keyId: string },
  key: Buffer,
): Promise<{hash:string;validThroughLedger:number}> {
  const prepared = await prepareTestnetDryRun(server,signer,resource.contractId);
  const stored = await storeTestnetEnvelope(pool,lease,{...resource,agent:signer.publicKey,tenantId:lease.tenantId,transactionHash:prepared.hash,validThroughLedger:prepared.validThroughLedger},key,prepared.envelope);
  if (!stored) throw new Error("envelope was not persisted: lease lost or attempt already prepared");
  return {hash:prepared.hash,validThroughLedger:prepared.validThroughLedger};
}
