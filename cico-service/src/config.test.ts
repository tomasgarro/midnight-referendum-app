import { padBytes32 } from 'midnight-referendum-api';
import { describe, expect, it } from 'vitest';
import { loadCicoServiceConfig } from './config.js';

function hex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const valid = {
  CICO_ALLOWED_ORIGINS: 'http://localhost:4173',
  CICO_RARIMO_BASE_URL: 'https://verificator.example',
  CICO_ISSUER_ID: 'cico-rarimo-preview',
  CICO_ISSUER_ID_HEX: hex(padBytes32('cico-rarimo-preview')),
  CICO_CREDENTIAL_EPOCH: '7',
  CICO_ISSUER_WALLET_SEED: '11'.repeat(32),
  CICO_ISSUER_ROLE_SECRET: '22'.repeat(32),
  CICO_ZK_CONFIG_PATH: '/tmp/credential-registry-v1',
  CICO_REGISTRY_CONTRACT_ADDRESS: 'registry-address',
  CICO_REGISTRY_ID_HEX: '33'.repeat(32),
};

describe('CICO service configuration', () => {
  it('loads a Preview-only configuration without exposing secret values', () => {
    const config = loadCicoServiceConfig(valid);
    expect(config.issuerRuntime.networkId).toBe('preview');
    expect(config.allowedOrigins).toEqual(['http://localhost:4173']);
    expect(config.rarimoProofParamsAllowedOrigins).toEqual(['https://verificator.example']);
    expect(config.issuerRuntime.issuerSeedHex).toBe(valid.CICO_ISSUER_WALLET_SEED);
  });

  it('rejects mainnet, mismatched public issuer IDs, and reused secrets', () => {
    expect(() => loadCicoServiceConfig({ ...valid, CICO_NETWORK: 'mainnet' })).toThrow(
      'Preview-only',
    );
    expect(() => loadCicoServiceConfig({ ...valid, CICO_ISSUER_ID: 'attacker' })).toThrow(
      'does not match',
    );
    expect(() =>
      loadCicoServiceConfig({
        ...valid,
        CICO_ISSUER_ROLE_SECRET: valid.CICO_ISSUER_WALLET_SEED,
      }),
    ).toThrow('must be independent');
  });
});
