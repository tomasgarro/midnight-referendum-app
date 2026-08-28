import { type CanonicalReceipt, sanitizeCanonicalReceipt } from 'midnight-referendum-api';
import { V2StoreConflictError } from './v2-store.js';
import type {
  NewV2ActionJob,
  V2ActionJob,
  V2ActionJobStatus,
  V2ActionStore,
  V2CapabilityReservation,
} from './v2-types.js';

/** Minimal pg-compatible surface; keeps this module testable without a live database. */
export interface PgQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: Row[];
  readonly rowCount?: number | null;
}

export interface PgClientLike {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string | { readonly text: string; readonly values?: readonly unknown[] },
    values?: readonly unknown[],
  ): Promise<PgQueryResult<Row>>;
  release?(): void;
}

export interface PgPoolLike {
  connect(): Promise<PgClientLike>;
}

/** Apply once during deployment, then use the unique idempotency index. */
export const V2_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS v2_action_jobs (
  id text PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  request_hash char(64) NOT NULL,
  UNIQUE (request_hash),
  capability_digest char(64) NOT NULL UNIQUE,
  tx_digest char(64) NOT NULL,
  network text NOT NULL,
  contract_address text NOT NULL,
  circuit text NOT NULL,
  action text NOT NULL CHECK (action IN ('credential', 'vote', 'cohort')),
  status text NOT NULL CHECK (status IN (
    'authorized', 'validated', 'dust_reserved', 'finalized', 'submitted',
    'indexer_pending', 'confirmed', 'failed', 'recovery_required'
  )),
  dust_reservation_id text UNIQUE,
  transaction_id text,
  receipt jsonb,
  error_code text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS v2_action_capabilities (
  digest char(64) PRIMARY KEY,
  action_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  network text NOT NULL,
  contract_address text NOT NULL,
  circuit text NOT NULL,
  action text NOT NULL CHECK (action IN ('credential', 'vote', 'cohort')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS v2_action_jobs_recovery_idx
  ON v2_action_jobs (status, updated_at)
  WHERE status IN ('authorized', 'validated', 'dust_reserved', 'finalized', 'submitted', 'indexer_pending');
`;

/**
 * PostgreSQL production adapter. Each method is a transaction, transitions
 * are compare-and-set, and `reserveDust` holds a transaction-scoped advisory
 * lock so only one in-flight job can spend the relayer's DUST wallet.
 */
export class PostgresV2ActionStore implements V2ActionStore {
  constructor(private readonly pool: PgPoolLike) {}

  async createOrGet(input: NewV2ActionJob): Promise<{ job: V2ActionJob; created: boolean }> {
    return this.transaction(async (client) => {
      const inserted = await client.query<Row>({
        text: `INSERT INTO v2_action_jobs
          (id, idempotency_key, request_hash, capability_digest, tx_digest, network, contract_address, circuit, action, status, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'authorized',$10,$10)
          ON CONFLICT DO NOTHING
          RETURNING *`,
        values: [
          input.id,
          input.idempotencyKey,
          input.requestHash,
          input.capabilityDigest,
          input.txDigest,
          input.network,
          input.contractAddress,
          input.circuit,
          input.action,
          input.now,
        ],
      });
      if (inserted.rows[0]) return { job: rowToJob(inserted.rows[0]), created: true };
      const existing = await client.query<Row>(
        `SELECT * FROM v2_action_jobs
         WHERE id = $1 OR idempotency_key = $2 OR request_hash = $3 OR capability_digest = $4
         ORDER BY (idempotency_key = $2) DESC
         LIMIT 1 FOR UPDATE`,
        [input.id, input.idempotencyKey, input.requestHash, input.capabilityDigest],
      );
      if (!existing.rows[0]) {
        throw new V2StoreConflictError(
          'Action id, capability, or idempotency key was already used',
        );
      }
      const job = rowToJob(existing.rows[0]);
      if (job.requestHash !== input.requestHash) {
        throw new V2StoreConflictError('Idempotency key was already used for another action');
      }
      return { job, created: false };
    });
  }

  async get(id: string): Promise<V2ActionJob | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<Row>('SELECT * FROM v2_action_jobs WHERE id = $1', [id]);
      return result.rows[0] ? rowToJob(result.rows[0]) : null;
    } finally {
      client.release?.();
    }
  }

  async getByIdempotencyKey(key: string): Promise<V2ActionJob | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<Row>(
        'SELECT * FROM v2_action_jobs WHERE idempotency_key = $1',
        [key],
      );
      return result.rows[0] ? rowToJob(result.rows[0]) : null;
    } finally {
      client.release?.();
    }
  }

  async consumeCapability(reservation: V2CapabilityReservation): Promise<boolean> {
    return this.transaction(async (client) => {
      const result = await client.query<Row>({
        text: `INSERT INTO v2_action_capabilities
          (digest, action_id, idempotency_key, request_hash, network, contract_address, circuit, action, expires_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9))
          ON CONFLICT (digest) DO NOTHING
          RETURNING digest`,
        values: [
          reservation.digest,
          reservation.actionId,
          reservation.idempotencyKey,
          reservation.requestHash,
          reservation.network,
          reservation.contractAddress,
          reservation.circuit,
          reservation.action,
          reservation.expiresAt,
        ],
      });
      return result.rows.length > 0;
    });
  }

  async transition(
    id: string,
    expected: V2ActionJobStatus | readonly V2ActionJobStatus[],
    patch: Partial<
      Pick<V2ActionJob, 'status' | 'dustReservationId' | 'transactionId' | 'receipt' | 'errorCode'>
    >,
  ): Promise<V2ActionJob | null> {
    const statuses = Array.isArray(expected) ? expected : [expected];
    return this.transaction(async (client) => {
      const values: unknown[] = [id, statuses];
      const assignments = ['updated_at = NOW()'];
      if (patch.status !== undefined) {
        values.push(patch.status);
        assignments.push(`status = $${values.length}`);
      }
      if (patch.dustReservationId !== undefined) {
        values.push(patch.dustReservationId);
        assignments.push(`dust_reservation_id = $${values.length}`);
      }
      if (patch.transactionId !== undefined) {
        values.push(patch.transactionId);
        assignments.push(`transaction_id = $${values.length}`);
      }
      if (patch.receipt !== undefined) {
        values.push(JSON.stringify(sanitizeCanonicalReceipt(patch.receipt)));
        assignments.push(`receipt = $${values.length}::jsonb`);
      }
      if (patch.errorCode !== undefined) {
        values.push(patch.errorCode);
        assignments.push(`error_code = $${values.length}`);
      }
      const result = await client.query<Row>(
        `UPDATE v2_action_jobs SET ${assignments.join(', ')}
         WHERE id = $1 AND status = ANY($2::text[])
         RETURNING *`,
        values,
      );
      return result.rows[0] ? rowToJob(result.rows[0]) : null;
    });
  }

  async reserveDust(id: string, reservationId: string): Promise<V2ActionJob | null> {
    return this.transaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext('midnight-referendum:v2:dust'))`);
      const result = await client.query<Row>(
        `UPDATE v2_action_jobs
         SET status = 'dust_reserved', dust_reservation_id = $2, updated_at = NOW()
         WHERE id = $1 AND status = 'validated'
           AND NOT EXISTS (
             SELECT 1 FROM v2_action_jobs
             WHERE status IN ('dust_reserved', 'finalized', 'submitted', 'indexer_pending')
           )
         RETURNING *`,
        [id, reservationId],
      );
      return result.rows[0] ? rowToJob(result.rows[0]) : null;
    });
  }

  async listRecoverable(): Promise<readonly V2ActionJob[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<Row>(
        `SELECT * FROM v2_action_jobs
         WHERE status IN ('authorized', 'validated', 'dust_reserved', 'finalized', 'submitted', 'indexer_pending')
         ORDER BY created_at ASC`,
      );
      return result.rows.map(rowToJob);
    } finally {
      client.release?.();
    }
  }

  private async transaction<T>(operation: (client: PgClientLike) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release?.();
    }
  }
}

interface Row extends Record<string, unknown> {
  id: string;
  idempotency_key: string;
  request_hash: string;
  capability_digest: string;
  tx_digest: string;
  network: string;
  contract_address: string;
  circuit: string;
  action: 'credential' | 'vote' | 'cohort';
  status: V2ActionJobStatus;
  dust_reservation_id?: string | null;
  transaction_id?: string | null;
  receipt?: CanonicalReceipt | string | null;
  error_code?: V2ActionJob['errorCode'] | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function rowToJob(row: Row): V2ActionJob {
  const receipt = row.receipt
    ? sanitizeCanonicalReceipt(
        typeof row.receipt === 'string' ? JSON.parse(row.receipt) : row.receipt,
      )
    : undefined;
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    capabilityDigest: row.capability_digest,
    requestHash: row.request_hash,
    txDigest: row.tx_digest,
    network: row.network,
    contractAddress: row.contract_address,
    circuit: row.circuit,
    action: row.action,
    status: row.status,
    ...(row.dust_reservation_id ? { dustReservationId: row.dust_reservation_id } : {}),
    ...(row.transaction_id ? { transactionId: row.transaction_id } : {}),
    ...(receipt ? { receipt } : {}),
    ...(row.error_code ? { errorCode: row.error_code } : {}),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
