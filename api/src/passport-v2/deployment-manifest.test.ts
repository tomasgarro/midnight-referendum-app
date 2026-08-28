import { describe, expect, it } from 'vitest';
import {
  PASSPORT_V2_MANIFEST_KIND,
  PASSPORT_V2_MANIFEST_VERSION,
  type PassportV2DeploymentManifest,
  serializePassportV2DeploymentManifest,
  validatePassportV2DeploymentManifest,
} from './deployment-manifest.js';

function manifest(
  overrides: Partial<PassportV2DeploymentManifest> = {},
): PassportV2DeploymentManifest {
  return {
    kind: PASSPORT_V2_MANIFEST_KIND,
    version: PASSPORT_V2_MANIFEST_VERSION,
    status: 'in-progress',
    network: 'undeployed',
    networkId: 'undeployed',
    generatedAt: '2026-08-28T00:00:00.000Z',
    runtime: {
      apiUrl: 'http://127.0.0.1:8791',
      credentialTtlMs: 86_400_000,
      uniquenessTimestampUpperBoundUnixSeconds: '4102444800',
    },
    artifacts: {
      compactLanguageVersion: '0.23',
      compactCompilerVersion: '0.31.1',
      compactRuntimeVersion: '0.16.0',
      midnightJsVersion: '4.1.1',
      ledgerVersion: '8.1.0',
      onchainRuntimeVersion: '3.0.0',
      registryArtifact: 'credential-registry-v1',
      referendumArtifact: 'referendum-v2',
    },
    endpoints: {
      nodeRpc: null,
      indexerHttp: null,
      indexerWs: null,
      proofServer: null,
      relay: null,
      explorer: null,
    },
    dust: { before: null, after: null, spent: null, accounted: false },
    registry: {
      contractAddress: null,
      registryContractBindingHex: null,
      registryIdHex: '01'.repeat(32),
      issuerId: 'fixture-issuer',
      issuerIdHex: '02'.repeat(32),
      credentialEpoch: '7',
      currentRootField: null,
      frozenRootField: null,
      credentialCount: null,
      frozen: false,
    },
    referenda: [
      {
        referendumId: 'fixture:referendum',
        contractAddress: null,
        registryContractBindingHex: null,
        eventIdHex: '03'.repeat(32),
        organizerKeyHex: '04'.repeat(32),
        countryPolicy: null,
        minimumAssurance: '2',
        requireAdult: true,
        validityReference: '1',
        title: 'Fixture referendum',
        question: 'Should it proceed?',
      },
    ],
    transcript: { steps: [], observations: [] },
    ...overrides,
  };
}

describe('Passport v2 deployment manifest', () => {
  it('accepts a restartable in-progress journal and serializes observations safely', () => {
    const value = manifest();
    expect(() => validatePassportV2DeploymentManifest(value)).not.toThrow();
    expect(serializePassportV2DeploymentManifest(value)).toContain('"observations": []');
  });

  it('rejects a registry binding that does not match its selected address', () => {
    const value = manifest({
      registry: {
        ...manifest().registry,
        contractAddress: 'ab'.repeat(32),
        registryContractBindingHex: '00'.repeat(32),
      },
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'contract binding does not match its address',
    );
  });
});
