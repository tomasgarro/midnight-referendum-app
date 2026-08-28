import type { RelayerConfig } from './config.js';
import { type PgPoolLike, PostgresV2ActionStore, V2_POSTGRES_SCHEMA } from './v2-postgres.js';
import { FileV2ActionStore } from './v2-store.js';
import type { V2ActionStore } from './v2-types.js';

export interface ConfiguredV2Store {
  readonly store: V2ActionStore;
  readonly close?: () => Promise<void>;
  readonly durableKind: 'postgres' | 'file';
}

/**
 * Runtime selection is deliberately fail-closed for exposed servers. The
 * file adapter is only accepted on loopback for local/test recovery; a hosted
 * v2 relay must provide PostgreSQL for unique keys and transactional DUST
 * reservation.
 */
export async function createConfiguredV2Store(config: RelayerConfig): Promise<ConfiguredV2Store> {
  if (config.v2DatabaseUrl) {
    const pg = (await import('pg')) as unknown as {
      Pool: new (options: {
        connectionString: string;
      }) => PgPoolLike & {
        end(): Promise<void>;
      };
    };
    const pool = new pg.Pool({ connectionString: config.v2DatabaseUrl });
    const client = await pool.connect();
    try {
      await client.query(V2_POSTGRES_SCHEMA);
    } finally {
      client.release?.();
    }
    return {
      store: new PostgresV2ActionStore(pool),
      durableKind: 'postgres',
      close: () => pool.end(),
    };
  }
  if (!isLoopback(config.host) && config.v2CapabilitySecret) {
    throw new Error('RELAYER_V2_DATABASE_URL is required when v2 is exposed beyond loopback');
  }
  return {
    store: new FileV2ActionStore(config.v2JobStorePath),
    durableKind: 'file',
  };
}

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}
