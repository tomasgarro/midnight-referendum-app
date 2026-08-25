import {
  type CivicCredentialIssuanceRequest,
  type CredentialRegistryV1PrivateState,
  deriveCredentialLeaf,
  isoNumericCountry,
} from 'midnight-referendum-api';
import { describe, expect, it, vi } from 'vitest';
import {
  CredentialIssuerService,
  type EvidenceAuthorizationStore,
} from './credential-issuer-service.js';

const request: CivicCredentialIssuanceRequest = {
  enrollmentId: 'enrollment-id',
  provider: 'rarimo',
  evidenceAuthorization: 'single-use-authorization',
  holderBinding: new Uint8Array(32).fill(1),
  claims: {
    issuerId: 'cico-rarimo-preview',
    country: isoNumericCountry('032'),
    ageClass: '18-plus',
    assurance: 'document-nfc',
    credentialEpoch: 7,
    validFrom: '2026-08-24T12:00:00.000Z',
    validUntil: '2026-08-25T12:00:00.000Z',
  },
};

const receipt = {
  status: 'confirmed' as const,
  action: 'credential' as const,
  network: 'preview' as const,
  transactionId: 'credential-transaction-id',
  transactionHash: 'credential-transaction-hash',
  contractAddress: 'credential-registry-address',
  circuit: 'addCredential',
  blockHeight: 42,
  blockHash: 'credential-block-hash',
  blockTimestamp: '2026-08-24T12:00:00.000Z',
};

function makeService(options?: {
  authorization?: boolean;
  evidenceValid?: boolean;
  failOnce?: boolean;
  epochOpen?: boolean;
}) {
  const states: CredentialRegistryV1PrivateState[] = [];
  let additions = 0;
  let fail = options?.failOnce ?? false;
  const executor = {
    deploy: vi.fn(),
    join: vi.fn(async (_address: string, state: CredentialRegistryV1PrivateState) => {
      states.push(state);
    }),
    addCredential: vi.fn(async () => {
      additions += 1;
      if (fail) {
        fail = false;
        throw new Error('temporary Preview failure');
      }
      return receipt;
    }),
    freeze: vi.fn(),
  };
  const claims = new Map<string, string>();
  const evidenceAuthorizations: EvidenceAuthorizationStore = {
    claim: vi.fn(async (authorization, enrollmentId) => {
      if (options?.authorization === false) return false;
      const existing = claims.get(authorization);
      if (existing && existing !== enrollmentId) return false;
      claims.set(authorization, enrollmentId);
      return true;
    }),
  };
  const service = new CredentialIssuerService({
    executor,
    registryContractAddress: receipt.contractAddress,
    issuerSecret: new Uint8Array(32).fill(9),
    evidenceAuthorizations,
    epochMutations: {
      runEnrollmentMutation: async (operation) => {
        if (options?.epochOpen === false) {
          throw new Error('Credential enrollment is closed for this frozen epoch');
        }
        return operation();
      },
    },
    validateEvidenceAuthorization: vi.fn(async () => options?.evidenceValid !== false),
    randomBytes: () => new Uint8Array(32).fill(2),
  });
  return { service, executor, states, evidenceAuthorizations, getAdditions: () => additions };
}

describe('CredentialIssuerService', () => {
  it('serializes an authorized canonical issuance with exact Compact material', async () => {
    const { service, executor, states } = makeService();
    const issued = await service.issueCredential(request);
    expect(executor.join).toHaveBeenCalledWith(receipt.contractAddress, expect.any(Object));
    expect(states[0]).toMatchObject({
      credentialAgeClass: 2n,
      credentialAssurance: 2n,
      credentialClaimEpoch: 7n,
      credentialValidUntil: 1_787_659_200n,
    });
    expect(issued.credentialBlind).toEqual(new Uint8Array(32).fill(2));
    expect(issued.credentialLeaf).toEqual(
      deriveCredentialLeaf({
        holderBinding: request.holderBinding,
        claims: request.claims,
        credentialBlind: issued.credentialBlind,
      }),
    );
    expect(JSON.stringify(issued.receipt)).not.toMatch(/secret|blind|choice|path|proof/i);
  });

  it('deduplicates concurrent issuance and rejects conflicting reuse', async () => {
    const { service, getAdditions } = makeService();
    const results = await Promise.all([
      service.issueCredential(request),
      service.issueCredential(request),
      service.issueCredential(request),
    ]);
    expect(results.every((result) => result.issuanceId === results[0]?.issuanceId)).toBe(true);
    expect(getAdditions()).toBe(1);
    await expect(
      service.issueCredential({ ...request, holderBinding: new Uint8Array(32).fill(4) }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('rejects invalid authorization and allows an idempotent same-enrollment retry', async () => {
    const unverified = makeService({ evidenceValid: false });
    await expect(unverified.service.issueCredential(request)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIAL_CLAIMS',
    });
    expect(unverified.getAdditions()).toBe(0);

    const invalid = makeService({ authorization: false });
    await expect(invalid.service.issueCredential(request)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIAL_CLAIMS',
    });
    expect(invalid.getAdditions()).toBe(0);

    const retryable = makeService({ failOnce: true });
    await expect(retryable.service.issueCredential(request)).rejects.toThrow(
      'temporary Preview failure',
    );
    await expect(retryable.service.issueCredential(request)).resolves.toMatchObject({
      receipt,
    });
    expect(retryable.getAdditions()).toBe(2);
  });

  it('rejects issuance after epoch freeze before consuming the evidence authorization', async () => {
    const frozen = makeService({ epochOpen: false });
    await expect(frozen.service.issueCredential(request)).rejects.toThrow(
      'Credential enrollment is closed',
    );
    expect(frozen.evidenceAuthorizations.claim).not.toHaveBeenCalled();
    expect(frozen.executor.join).not.toHaveBeenCalled();
    expect(frozen.getAdditions()).toBe(0);
  });
});
