import { resolve } from 'node:path';
import { padBytes32 } from 'midnight-referendum-api';

export interface CicoServiceConfig {
  readonly host: string;
  readonly port: number;
  readonly allowedOrigins: readonly string[];
  readonly stateDirectory: string;
  readonly rarimoBaseUrl: string;
  readonly rarimoPrivateHeaders: Readonly<Record<string, string>>;
  readonly rarimoProofParamsAllowedOrigins: readonly string[];
  readonly rarimoProofRequestBaseUrl: string;
  readonly issuerIdText: string;
  readonly credentialEpoch: number;
  readonly credentialTtlMs: number;
  readonly maximumIssuanceDelayMs: number;
  readonly issuerRuntime: {
    readonly issuerSeedHex: string;
    readonly issuerRoleSecretHex: string;
    readonly networkId: 'preview';
    readonly indexerHttpUrl: string;
    readonly indexerWsUrl: string;
    readonly proofServerUrl: string;
    readonly approvedProofServerOrigins: readonly string[];
    readonly zkConfigBasePath: string;
    readonly registryContractAddress: string;
    readonly registryId: Uint8Array;
    readonly issuerId: Uint8Array;
    readonly credentialEpoch: bigint;
    readonly relayUrl: string;
    readonly explorerBaseUrl?: string;
  };
}

export function loadCicoServiceConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): CicoServiceConfig {
  const network = optional(env, 'CICO_NETWORK', 'preview');
  if (network !== 'preview') throw new Error('CICO service is Preview-only');
  const issuerIdText = required(env, 'CICO_ISSUER_ID');
  const issuerId = bytes32(required(env, 'CICO_ISSUER_ID_HEX'), 'CICO_ISSUER_ID_HEX');
  if (!equalBytes(padBytes32(issuerIdText), issuerId)) {
    throw new Error('CICO_ISSUER_ID does not match CICO_ISSUER_ID_HEX');
  }
  const credentialEpoch = integer(env, 'CICO_CREDENTIAL_EPOCH', 0, Number.MAX_SAFE_INTEGER);
  const issuerSeedHex = secret(env, 'CICO_ISSUER_WALLET_SEED');
  const issuerRoleSecretHex = secret(env, 'CICO_ISSUER_ROLE_SECRET');
  if (issuerSeedHex === issuerRoleSecretHex) {
    throw new Error('CICO issuer wallet seed and role secret must be independent');
  }
  const rarimoBaseUrl = required(env, 'CICO_RARIMO_BASE_URL');
  const verifierOrigin = absoluteHttpUrl(rarimoBaseUrl, 'CICO_RARIMO_BASE_URL').origin;
  const explorerBaseUrl = env.CICO_EXPLORER_BASE_URL?.trim();
  return {
    host: optional(env, 'CICO_HOST', '127.0.0.1'),
    port: integer(env, 'CICO_PORT', 1, 65_535, 8791),
    allowedOrigins: list(required(env, 'CICO_ALLOWED_ORIGINS')),
    stateDirectory: resolve(optional(env, 'CICO_STATE_DIRECTORY', '.cico-state')),
    rarimoBaseUrl,
    rarimoPrivateHeaders: stringRecord(env.CICO_RARIMO_PRIVATE_HEADERS_JSON),
    rarimoProofParamsAllowedOrigins: list(
      optional(env, 'CICO_RARIMO_PROOF_PARAMS_ORIGINS', verifierOrigin),
    ),
    rarimoProofRequestBaseUrl: optional(
      env,
      'CICO_RARIMO_PROOF_REQUEST_BASE_URL',
      'https://app.rarime.com/external',
    ),
    issuerIdText,
    credentialEpoch,
    credentialTtlMs: integer(
      env,
      'CICO_CREDENTIAL_TTL_MS',
      1_000,
      30 * 24 * 60 * 60 * 1_000,
      24 * 60 * 60 * 1_000,
    ),
    maximumIssuanceDelayMs: integer(
      env,
      'CICO_MAXIMUM_ISSUANCE_DELAY_MS',
      1_000,
      60 * 60 * 1_000,
      10 * 60 * 1_000,
    ),
    issuerRuntime: {
      issuerSeedHex,
      issuerRoleSecretHex,
      networkId: 'preview',
      indexerHttpUrl: optional(
        env,
        'CICO_INDEXER_HTTP_URL',
        'https://indexer.preview.midnight.network/api/v4/graphql',
      ),
      indexerWsUrl: optional(
        env,
        'CICO_INDEXER_WS_URL',
        'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      ),
      proofServerUrl: optional(env, 'CICO_PROOF_SERVER_URL', 'http://localhost:6300'),
      approvedProofServerOrigins: list(optional(env, 'CICO_APPROVED_PROOF_ORIGINS', '')),
      zkConfigBasePath: resolve(required(env, 'CICO_ZK_CONFIG_PATH')),
      registryContractAddress: required(env, 'CICO_REGISTRY_CONTRACT_ADDRESS'),
      registryId: bytes32(required(env, 'CICO_REGISTRY_ID_HEX'), 'CICO_REGISTRY_ID_HEX'),
      issuerId,
      credentialEpoch: BigInt(credentialEpoch),
      relayUrl: optional(env, 'CICO_NODE_URL', 'wss://rpc.preview.midnight.network'),
      ...(explorerBaseUrl ? { explorerBaseUrl } : {}),
    },
  };
}

function required(env: Readonly<Record<string, string | undefined>>, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optional(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: string,
): string {
  return env[name]?.trim() || fallback;
}

function secret(env: Readonly<Record<string, string | undefined>>, name: string): string {
  const value = required(env, name).replace(/^0x/u, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(value)) throw new Error(`${name} must be 32-byte hexadecimal data`);
  return value;
}

function bytes32(value: string, name: string): Uint8Array {
  const normalized = value.replace(/^0x/u, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(normalized)) {
    throw new Error(`${name} must be 32-byte hexadecimal data`);
  }
  return Uint8Array.from(normalized.match(/.{2}/gu) ?? [], (byte) => Number.parseInt(byte, 16));
}

function integer(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  minimum: number,
  maximum: number,
  fallback?: number,
): number {
  const text = env[name]?.trim();
  const value = text ? Number(text) : fallback;
  if (value === undefined || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} is outside its supported integer range`);
  }
  return value;
}

function list(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringRecord(value: string | undefined): Readonly<Record<string, string>> {
  if (!value?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('CICO_RARIMO_PRIVATE_HEADERS_JSON must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('CICO_RARIMO_PRIVATE_HEADERS_JSON must be a JSON object');
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(parsed)) {
    if (typeof item !== 'string' || !key.trim() || !item) {
      throw new Error('CICO_RARIMO_PRIVATE_HEADERS_JSON must contain string values');
    }
    result[key] = item;
  }
  return result;
}

function absoluteHttpUrl(value: string, name: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  return url;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}
