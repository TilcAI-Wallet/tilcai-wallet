import { randomUUID } from "node:crypto";

/** Inject a PostgreSQL pool owned by the worker; never use an API or owner connection. */
export interface WorkerConnection {
  query(sql: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
  release(): void;
}
export interface WorkerPool { connect(): Promise<WorkerConnection> }
export interface Lease { tenant: string; network: string; eventId: string; orderId: string; token: string }

async function transaction<T>(pool: WorkerPool, tenant: string, action: (db: WorkerConnection) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT set_config('wallet.tenant_id', $1, true)", [tenant]);
    const result = await action(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { db.release(); }
}

/** A trusted dispatcher supplies the tenant. This function does not enumerate tenants. */
export async function claimPayment(pool: WorkerPool, tenant: string, network: string, leaseSeconds: number): Promise<Lease | null> {
  if (!tenant || network !== "testnet" || !Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 300) throw new Error("invalid lease request");
  return transaction(pool, tenant, async (db) => {
    const token = randomUUID();
    const result = await db.query(`WITH candidate AS (
      SELECT event_id FROM wallet_private.outbox
      WHERE tenant_id=$1 AND network=$2 AND kind='payment' AND completed_at IS NULL
        AND (lease_until IS NULL OR lease_until <= clock_timestamp())
      ORDER BY event_id FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE wallet_private.outbox o SET lease_token=$3, lease_until=clock_timestamp()+($4 * interval '1 second')
      FROM candidate c WHERE o.tenant_id=$1 AND o.network=$2 AND o.event_id=c.event_id
      RETURNING o.event_id,o.order_id`, [tenant, network, token, leaseSeconds]);
    const row = result.rows[0];
    return row ? { tenant, network, eventId: row.event_id, orderId: row.order_id, token } : null;
  });
}

/** Stores final hash and private envelope reference only while the caller owns an unexpired lease.
 * This does not sign, transmit, or validate a Stellar envelope; the adapter must do that first. */
export async function recordPrepared(pool: WorkerPool, lease: Lease, prepared: { hash: string; envelopeRef: string; validThroughLedger: number }): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(prepared.hash) || !/^private:[A-Za-z0-9_-]{1,128}$/.test(prepared.envelopeRef) || !Number.isSafeInteger(prepared.validThroughLedger) || prepared.validThroughLedger <= 0) throw new Error("invalid prepared payment");
  return transaction(pool, lease.tenant, async (db) => {
    const owner = await db.query("SELECT 1 FROM wallet_private.outbox WHERE tenant_id=$1 AND network=$2 AND event_id=$3 AND order_id=$4 AND lease_token=$5 AND lease_until > clock_timestamp() AND completed_at IS NULL FOR UPDATE", [lease.tenant,lease.network,lease.eventId,lease.orderId,lease.token]);
    if (!owner.rowCount) return false;
    const updated = await db.query("UPDATE wallet_private.attempts SET state='prepared', tx_hash=$4, envelope_ref=$5, valid_through_ledger=$6 WHERE tenant_id=$1 AND network=$2 AND order_id=$3 AND state='created' AND tx_hash IS NULL RETURNING attempt_id", [lease.tenant,lease.network,lease.orderId,prepared.hash,prepared.envelopeRef,prepared.validThroughLedger]);
    return updated.rowCount === 1;
  });
}
