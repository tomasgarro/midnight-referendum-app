import { describe, expect, it } from 'vitest';
import { parsePassportV2RuntimeConfig } from '../integration/passport-v2-runtime-config';

const issuerId = 'cico-rarimo-preview';
const issuerHex = Array.from(new TextEncoder().encode(issuerId.padEnd(32, '\0')), (byte) =>
  byte.toString(16).padStart(2, '0'),
).join('');
const env = {
  VITE_PASSPORT_V2_API_URL: 'https://cico-api.example',
  VITE_MIDNIGHT_NETWORK: 'preview',
  VITE_CICO_ISSUER_ID: issuerId,
  VITE_CICO_CREDENTIAL_EPOCH: '7',
  VITE_CICO_CREDENTIAL_TTL_MS: '86400000',
  VITE_RARIMO_UNIQUENESS_TIMESTAMP_UPPER_BOUND: '1800000000',
  VITE_CICO_REGISTRY_ADDRESS: `0x${'04'.repeat(32)}`,
  VITE_CICO_REGISTRY_ID_HEX: '01'.repeat(32),
  VITE_CICO_ISSUER_ID_HEX: issuerHex,
  VITE_CICO_FROZEN_ROOT_FIELD: '42',
  VITE_CICO_REFERENDA_JSON: JSON.stringify([
    {
      referendumId: 'tierras-rurales:world',
      contractAddress: 'referendum-address',
      title: 'Tierras rurales',
      question: '¿Aprobás esta consulta?',
      eventIdHex: '02'.repeat(32),
      organizerKeyHex: '03'.repeat(32),
      countryPolicy: null,
      minimumAssurance: 2,
      requireAdult: true,
      validityReference: '1787659200',
    },
  ]),
};

describe('Passport v2 runtime config', () => {
  it('stays disabled when no backend is configured', () => {
    expect(parsePassportV2RuntimeConfig({})).toBeNull();
  });

  it('parses the frozen registry and referendum catalog without private keys', () => {
    const parsed = parsePassportV2RuntimeConfig(env);
    expect(parsed).toMatchObject({
      network: 'preview',
      apiUrl: 'https://cico-api.example',
      issuerId,
      credentialEpoch: 7,
      registry: { registryContractAddress: `0x${'04'.repeat(32)}`, credentialEpoch: 7n },
    });
    expect(parsed?.referenda[0]).toMatchObject({
      referendumId: 'tierras-rurales:world',
      config: { countryPolicyEnabled: false, minimumAssurance: 2n, network: 'preview' },
    });
  });

  it('uses the same v2 catalog on the local Undeployed network', () => {
    const parsed = parsePassportV2RuntimeConfig({
      ...env,
      VITE_MIDNIGHT_NETWORK: 'undeployed',
      VITE_PASSPORT_V2_API_URL: 'http://localhost:8791',
    });
    expect(parsed).toMatchObject({
      network: 'undeployed',
      referenda: [{ config: { network: 'undeployed' } }],
    });
  });

  it('accepts optional catalog lifecycle metadata and rejects a partial interval', () => {
    const parsed = parsePassportV2RuntimeConfig({
      ...env,
      VITE_CICO_REFERENDA_JSON: JSON.stringify([
        {
          ...JSON.parse(env.VITE_CICO_REFERENDA_JSON)[0],
          opened: '8 de agosto de 2026',
          deadline: '30 de agosto de 2026',
          opensAt: '2026-08-08T00:00:00Z',
          closesAt: '2026-08-30T23:59:59Z',
          eligible: '12.345',
          participation: 'Estado publicado',
        },
      ]),
    });
    expect(parsed?.referenda[0]).toMatchObject({
      opened: '8 de agosto de 2026',
      deadline: '30 de agosto de 2026',
      opensAt: '2026-08-08T00:00:00Z',
      closesAt: '2026-08-30T23:59:59Z',
      eligible: '12.345',
      participation: 'Estado publicado',
    });
    expect(() =>
      parsePassportV2RuntimeConfig({
        ...env,
        VITE_CICO_REFERENDA_JSON: JSON.stringify([
          { ...JSON.parse(env.VITE_CICO_REFERENDA_JSON)[0], opensAt: '2026-08-08T00:00:00Z' },
        ]),
      }),
    ).toThrow('both opensAt and closesAt');
  });

  it('fails closed for partial config, mainnet, or an issuer mismatch', () => {
    expect(() =>
      parsePassportV2RuntimeConfig({ VITE_PASSPORT_V2_API_URL: 'https://api.example' }),
    ).toThrow('VITE_CICO_ISSUER_ID');
    expect(() =>
      parsePassportV2RuntimeConfig({ ...env, VITE_MIDNIGHT_NETWORK: 'mainnet' }),
    ).toThrow('Preview or Undeployed');
    expect(() =>
      parsePassportV2RuntimeConfig({ ...env, VITE_CICO_ISSUER_ID_HEX: 'ff'.repeat(32) }),
    ).toThrow('does not match');
    expect(() =>
      parsePassportV2RuntimeConfig({
        ...env,
        VITE_CICO_REFERENDA_JSON: JSON.stringify([
          {
            referendumId: 'missing-copy',
            contractAddress: 'referendum-address',
            eventIdHex: '02'.repeat(32),
            organizerKeyHex: '03'.repeat(32),
            countryPolicy: null,
            minimumAssurance: 2,
            requireAdult: true,
            validityReference: '1787659200',
          },
        ]),
      }),
    ).toThrow('title');
  });
});
