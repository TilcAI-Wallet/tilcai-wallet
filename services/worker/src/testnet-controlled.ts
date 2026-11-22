import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { rpc } from "@stellar/stellar-sdk";
import type { AgentSigner } from "./testnet-dry-run.js";
import { prepareAndPersistTestnet } from "./testnet-preflight.js";
import { loadTestnetEnvelope } from "./postgres-envelope-vault.js";
import { verifyTestnetTransfer } from "./testnet-transfer.js";

const usdc="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const recipient="GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
/** A deterministic test transport with no network access and no capability to broadcast. */
export class SimulatedTransport {
  readonly #hashes: string[] = [];
  constructor(readonly outcome: "accepted"|"timeout" = "accepted") { Object.freeze(this); }
  get submissions(): readonly string[] { return [...this.#hashes]; }
  async submit(envelope: Buffer): Promise<void> {
    this.#hashes.push(createHash("sha256").update(envelope).digest("hex"));
    if (this.outcome === "timeout") throw new Error("simulated timeout");
  }
}
Object.freeze(SimulatedTransport.prototype);
type ControlledRpc = Pick<rpc.Server,"getNetwork"|"getLatestLedger"|"getAccount"|"simulateTransaction"|"getTransaction">;
/** Explicitly simulated transport only. No caller of this function can submit to Stellar. */
export async function processControlledTestnetOnce(options: {
  pool:Pool; rpc:ControlledRpc; signer:AgentSigner; keyId:string;
  keyForId:(id:string)=>Promise<Buffer>; transport:SimulatedTransport; allowSimulatedSend:boolean;
}): Promise<"idle"|"prepared"|"uncertain"|"simulated_verified"|"lease_lost"> {
  const {pool}=options;
  if (Object.getPrototypeOf(options.transport) !== SimulatedTransport.prototype) throw new Error("only simulated transport is supported");
  const claim=await pool.query("SELECT * FROM wallet_private.claim_testnet(30)");
  const task=claim.rows[0]; if (!task) return "idle";
  const lease={tenantId:task.tenant_id,eventId:task.event_id,token:task.lease_token};
  const snapshot=(await pool.query("SELECT * FROM wallet_private.read_testnet_task($1,$2,$3)",[lease.tenantId,lease.eventId,lease.token])).rows[0];
  if (!snapshot) return "lease_lost";
  if (snapshot.asset_id!==usdc || snapshot.recipient!==recipient || snapshot.agent!==options.signer.publicKey || BigInt(snapshot.amount)!==5_000_000n || snapshot.order_id!==task.order_id) throw new Error("unauthorized Testnet resource");
  if (snapshot.attempt_state === "created") {
    if (snapshot.policy_revision===null || snapshot.policy_revision===undefined) throw new Error("card has no reviewed WalletFoundation policy revision");
    const key=await options.keyForId(options.keyId);
    await prepareAndPersistTestnet(pool,options.rpc,options.signer,lease,{orderId:task.order_id,attemptId:snapshot.attempt_id,contractId:snapshot.contract_id,keyId:options.keyId,policyRevision:BigInt(snapshot.policy_revision)},key);
  }
  const loaded=await loadTestnetEnvelope(pool,lease,snapshot.attempt_id,options.keyForId);
  if (!loaded) return "lease_lost";
  if (!options.allowSimulatedSend) return "prepared";
  const renewed=await pool.query("SELECT wallet_private.renew_fixture($1,$2,$3,30) AS owned",[lease.tenantId,lease.eventId,lease.token]);
  if (!renewed.rows[0].owned) return "lease_lost";
  const marked=await pool.query("SELECT wallet_private.mark_testnet_uncertain($1,$2,$3,$4,$5) AS changed",[lease.tenantId,lease.eventId,lease.token,snapshot.attempt_id,loaded.context.transactionHash]);
  if (!marked.rows[0].changed) return "lease_lost";
  try { await options.transport.submit(loaded.envelope); } catch { return "uncertain"; }
  const observation=await verifyTestnetTransfer(options.rpc,loaded.context,loaded.envelope);
  // A simulated observation is never persisted as Testnet chain evidence.
  return observation.status === "verified" ? "simulated_verified" : "uncertain";
}
