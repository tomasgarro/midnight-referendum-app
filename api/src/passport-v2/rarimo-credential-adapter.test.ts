import { describe, expect, it } from 'vitest';
import { deriveCredentialLeaf, deriveHolderBinding } from './crypto.js';
import type {
  CivicCredentialIssuanceRequest,
  CivicCredentialIssuerPort,
  CivicCredentialVaultPort,
  StoredCivicCredential,
} from './ports.js';
import { RarimoCivicCredentialAdapter } from './rarimo-credential-adapter.js';
import type {
  RarimoVerificationGateway,
  RarimoVerificationLink,
  RarimoVerificationRequest,
  RarimoVerificationStatus,
  RarimoVerifiedEvidence,
} from './rarimo-types.js';
import {
  type CredentialEnrollmentRequest,
  isoNumericCountry,
  type PassportSession,
} from './types.js';

const now = new Date('2026-08-24T12:00:00.000Z');
const argentina = isoNumericCountry('032');
const france = isoNumericCountry('250');

const mapper = {
  fromAlpha3(alpha3: string) {
    return alpha3 === 'ARG' ? argentina : alpha3 === 'FRA' ? france : undefined;
  },
  toAlpha3(country: typeof argentina) {
    return country === argentina ? 'ARG' : country === france ? 'FRA' : undefined;
  },
};

function session(): PassportSession {
  return {
    sessionId: 'midnight-preview-session',
    origin: 'http://localhost:4173',
    network: 'preview',
    status: 'connected',
    capabilities: ['session', 'profile'],
  };
}

function request(policy?: CredentialEnrollmentRequest['policy']): CredentialEnrollmentRequest {
  return { session: session(), policy };
}

function deterministicRandomBytes(): (length: number) => Uint8Array {
  let next = 1;
  return (length) => {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = next;
      next = (next + 1) % 256;
    }
    return bytes;
  };
}

class FakeRarimoGateway implements RarimoVerificationGateway {
  readonly requests = new Map<string, RarimoVerificationRequest>();
  readonly statuses = new Map<string, RarimoVerificationStatus>();
  readonly deleted: string[] = [];
  readonly proofReads = new Map<string, number>();
  evidenceOverride?: (
    request: RarimoVerificationRequest,
    evidence: RarimoVerifiedEvidence,
  ) => RarimoVerifiedEvidence;

  async createVerificationRequest(
    request: RarimoVerificationRequest,
  ): Promise<RarimoVerificationLink> {
    this.requests.set(request.requestId, request);
    this.statuses.set(request.requestId, 'not_verified');
    return {
      requestId: request.requestId,
      userIdHash: `user-${request.requestId}`,
      proofParamsUrl: `http://preview.invalid/proof-params/${request.requestId}`,
      proofRequestUrl: `https://app.rarime.com/external?type=proof-request&proof_params_url=${request.requestId}`,
    };
  }

  async getVerificationStatus(requestId: string): Promise<RarimoVerificationStatus> {
    return this.statuses.get(requestId) ?? 'failed_verification';
  }

  async getVerifiedEvidence(requestId: string): Promise<RarimoVerifiedEvidence | null> {
    const request = this.requests.get(requestId);
    if (!request || this.statuses.get(requestId) !== 'verified') return null;
    this.proofReads.set(requestId, (this.proofReads.get(requestId) ?? 0) + 1);
    const evidence: RarimoVerifiedEvidence = {
      requestId,
      userIdHash: `user-${requestId}`,
      evidenceAuthorization: `authorization-${requestId}`,
      evidenceFingerprint: 'ab'.repeat(32),
      eventId: request.eventId,
      eventDataDecimal: request.eventDataDecimal,
      selector: request.selector,
      timestampUpperBound: request.timestampUpperBound,
      identityCounterUpperBound: request.identityCounterUpperBound,
      birthDateUpperBound: BigInt(request.birthDateUpperBound).toString(10),
      expirationDateLowerBound: BigInt(request.expirationDateLowerBound).toString(10),
      citizenshipAlpha3: 'ARG',
      adultPredicateSatisfied: request.birthDateUpperBound !== '0x303030303030',
    };
    return this.evidenceOverride?.(request, evidence) ?? evidence;
  }

  async deleteVerification(requestId: string): Promise<void> {
    this.deleted.push(requestId);
  }
}

class FakeCicoIssuer implements CivicCredentialIssuerPort {
  readonly adapterName = 'fake-cico-midnight-issuer';
  readonly requests: CivicCredentialIssuanceRequest[] = [];
  fail = false;

  async issueCredential(request: CivicCredentialIssuanceRequest) {
    this.requests.push(request);
    if (this.fail) throw new Error('issuer unavailable');
    const credentialBlind = new Uint8Array(32).fill(91);
    return {
      issuanceId: `issuance-${request.enrollmentId}`,
      credentialBlind,
      credentialLeaf: deriveCredentialLeaf({
        holderBinding: request.holderBinding,
        claims: request.claims,
        credentialBlind,
      }),
      receipt: {
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
      },
    };
  }
}

class MemoryCredentialVault implements CivicCredentialVaultPort {
  stored: StoredCivicCredential | null = null;

  async load() {
    return this.stored;
  }

  async save(credential: StoredCivicCredential) {
    this.stored = structuredClone(credential);
  }

  async clear() {
    this.stored = null;
  }
}

function makeAdapter(
  gateway: FakeRarimoGateway,
  randomBytes = deterministicRandomBytes(),
  issuer: CivicCredentialIssuerPort = new FakeCicoIssuer(),
  vault?: CivicCredentialVaultPort,
) {
  return new RarimoCivicCredentialAdapter({
    gateway,
    issuer,
    issuerId: 'cico-rarimo-preview',
    credentialEpoch: 7,
    countryMapper: mapper,
    uniquenessTimestampUpperBoundUnixSeconds: 1_800_000_000,
    now: () => new Date(now),
    randomBytes,
    vault,
  });
}

describe('Rarimo civic credential boundary', () => {
  it('creates an opaque request and keeps pending evidence provider-neutral', async () => {
    const gateway = new FakeRarimoGateway();
    const adapter = makeAdapter(gateway);
    const enrollment = await adapter.beginEnrollment(
      request({ allowedCountries: [argentina], minimumAssurance: 'document', requireAdult: true }),
    );
    const providerRequest = [...gateway.requests.values()][0];

    expect(enrollment.status).toBe('pending');
    expect(enrollment.interaction).toMatchObject({
      kind: 'cross-device-qr',
    });
    expect(enrollment.interaction?.uri).toMatch(/^https:\/\/app\.rarime\.com\//);
    expect(enrollment.holderBinding).toHaveLength(32);
    const expectedRandom = deterministicRandomBytes();
    expectedRandom(16);
    expectedRandom(16);
    const voterSecret = expectedRandom(32);
    const holderBlind = expectedRandom(32);
    expect(enrollment.holderBinding).toEqual(deriveHolderBinding(voterSecret, holderBlind));
    expect(providerRequest.requestId).not.toBe('');
    expect(providerRequest.eventData).toMatch(/^0x[0-9a-f]+$/);
    expect(providerRequest.eventDataDecimal).toBe(BigInt(providerRequest.eventData).toString(10));
    expect(providerRequest.eventId).not.toBe('0');
    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).resolves.toMatchObject({
      status: 'pending',
    });
    await expect(adapter.getCredentialSummary()).resolves.toBeNull();
  });

  it('issues only after exact verified status and request-bound proof checks', async () => {
    const gateway = new FakeRarimoGateway();
    const issuer = new FakeCicoIssuer();
    const adapter = makeAdapter(gateway, deterministicRandomBytes(), issuer);
    const enrollment = await adapter.beginEnrollment(request({ requireAdult: true }));
    const requestId = [...gateway.requests.keys()][0];
    gateway.statuses.set(requestId, 'verified');

    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).resolves.toMatchObject({
      status: 'issued',
    });
    await expect(adapter.getCredentialSummary()).resolves.toMatchObject({
      provider: 'rarimo',
      status: 'issued',
      issuerId: 'cico-rarimo-preview',
      country: '032',
      ageClass: '18-plus',
      assurance: 'document-nfc',
      credentialEpoch: 7,
    });
    expect(issuer.requests).toHaveLength(1);
    expect(Object.keys(issuer.requests[0]).sort()).toEqual([
      'claims',
      'enrollmentId',
      'evidenceAuthorization',
      'holderBinding',
      'provider',
    ]);
    expect(issuer.requests[0].evidenceAuthorization).toMatch(/^authorization-/);
    await expect(adapter.getActionAuthorization()).resolves.toEqual({
      kind: 'civic-credential',
      handle: `issuance-${enrollment.enrollmentId}`,
    });
    const privateMaterial = await adapter.getPrivateCredentialMaterial();
    expect(privateMaterial).not.toBeNull();
    expect(privateMaterial?.holderBinding).toEqual(
      deriveHolderBinding(
        privateMaterial?.voterSecret ?? new Uint8Array(),
        privateMaterial?.holderBlind ?? new Uint8Array(),
      ),
    );
    expect(privateMaterial?.credentialBlind).toEqual(new Uint8Array(32).fill(91));
    expect(privateMaterial?.credentialLeaf).toEqual(
      deriveCredentialLeaf({
        holderBinding: privateMaterial?.holderBinding ?? new Uint8Array(),
        claims: privateMaterial?.claims ?? issuer.requests[0].claims,
        credentialBlind: privateMaterial?.credentialBlind ?? new Uint8Array(),
      }),
    );
    privateMaterial?.voterSecret.fill(0);
    privateMaterial?.credentialBlind.fill(0);
    const secondRead = await adapter.getPrivateCredentialMaterial();
    expect(secondRead?.voterSecret).not.toEqual(privateMaterial?.voterSecret);
    expect(secondRead?.credentialBlind).toEqual(new Uint8Array(32).fill(91));
  });

  it('restores issued credential material from the encrypted-vault boundary after restart', async () => {
    const gateway = new FakeRarimoGateway();
    const issuer = new FakeCicoIssuer();
    const vault = new MemoryCredentialVault();
    const first = makeAdapter(gateway, deterministicRandomBytes(), issuer, vault);
    const enrollment = await first.beginEnrollment(request({ requireAdult: true }));
    gateway.statuses.set([...gateway.requests.keys()][0], 'verified');

    await expect(first.getEnrollmentStatus(enrollment.enrollmentId)).resolves.toMatchObject({
      status: 'issued',
    });

    const restarted = makeAdapter(
      new FakeRarimoGateway(),
      deterministicRandomBytes(),
      new FakeCicoIssuer(),
      vault,
    );
    await expect(restarted.getCredentialSummary()).resolves.toMatchObject({
      provider: 'rarimo',
      status: 'issued',
      country: '032',
    });
    await expect(restarted.getActionAuthorization()).resolves.toEqual({
      kind: 'civic-credential',
      handle: `issuance-${enrollment.enrollmentId}`,
    });
    await expect(restarted.getPrivateCredentialMaterial()).resolves.toMatchObject({
      credentialBlind: new Uint8Array(32).fill(91),
    });

    await restarted.clearCredential();
    await expect(restarted.getCredentialSummary()).resolves.toBeNull();
    expect(vault.stored).toBeNull();
  });

  it('does not mark verified evidence issued until the Midnight issuer confirms it', async () => {
    const gateway = new FakeRarimoGateway();
    const issuer = new FakeCicoIssuer();
    issuer.fail = true;
    const adapter = makeAdapter(gateway, deterministicRandomBytes(), issuer);
    const enrollment = await adapter.beginEnrollment(request());
    const requestId = [...gateway.requests.keys()][0];
    gateway.statuses.set(requestId, 'verified');

    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).rejects.toMatchObject({
      code: 'ISSUANCE_FAILED',
      retryable: true,
    });
    await expect(adapter.getCredentialSummary()).resolves.toBeNull();
    await expect(adapter.getActionAuthorization()).resolves.toBeNull();

    issuer.fail = false;
    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).resolves.toMatchObject({
      status: 'issued',
    });
  });

  it('is idempotent for replayed status polling and cleanup', async () => {
    const gateway = new FakeRarimoGateway();
    const adapter = makeAdapter(gateway);
    const enrollment = await adapter.beginEnrollment(request());
    const requestId = [...gateway.requests.keys()][0];
    gateway.statuses.set(requestId, 'verified');

    await adapter.getEnrollmentStatus(enrollment.enrollmentId);
    await adapter.getEnrollmentStatus(enrollment.enrollmentId);
    expect(gateway.proofReads.get(requestId)).toBe(1);
    await adapter.clearCredential();
    await adapter.clearCredential();
    expect(gateway.deleted).toEqual([requestId]);
  });

  it('serializes concurrent verified polls into one issuer operation', async () => {
    const gateway = new FakeRarimoGateway();
    const issuer = new FakeCicoIssuer();
    const adapter = makeAdapter(gateway, deterministicRandomBytes(), issuer);
    const enrollment = await adapter.beginEnrollment(request());
    const requestId = [...gateway.requests.keys()][0];
    gateway.statuses.set(requestId, 'verified');

    const results = await Promise.all([
      adapter.getEnrollmentStatus(enrollment.enrollmentId),
      adapter.getEnrollmentStatus(enrollment.enrollmentId),
      adapter.getEnrollmentStatus(enrollment.enrollmentId),
    ]);
    expect(results.every((result) => result.status === 'issued')).toBe(true);
    expect(issuer.requests).toHaveLength(1);
    expect(gateway.proofReads.get(requestId)).toBe(1);
  });

  it('rejects provider failure and invokes the cleanup hook', async () => {
    const gateway = new FakeRarimoGateway();
    const adapter = makeAdapter(gateway);
    const enrollment = await adapter.beginEnrollment(request());
    const requestId = [...gateway.requests.keys()][0];
    gateway.statuses.set(requestId, 'uniqueness_check_failed');

    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'INVALID_CREDENTIAL_CLAIMS',
    });
    expect(gateway.deleted).toEqual([requestId]);
    await expect(adapter.getCredentialSummary()).resolves.toBeNull();
  });

  it('rejects a proof whose request or user binding was changed', async () => {
    const gateway = new FakeRarimoGateway();
    gateway.evidenceOverride = (request, evidence) => ({
      ...evidence,
      requestId: `${request.requestId}-replayed`,
    });
    const adapter = makeAdapter(gateway);
    const enrollment = await adapter.beginEnrollment(request());
    const requestId = [...gateway.requests.keys()][0];
    gateway.statuses.set(requestId, 'verified');

    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'INVALID_CREDENTIAL_CLAIMS',
    });
    expect(gateway.deleted).toEqual([requestId]);
  });

  it('clears pending provider state and forgets the enrollment locally', async () => {
    const gateway = new FakeRarimoGateway();
    const adapter = makeAdapter(gateway);
    const enrollment = await adapter.beginEnrollment(request());
    const requestId = [...gateway.requests.keys()][0];

    await adapter.clearCredential();
    expect(gateway.deleted).toEqual([requestId]);
    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).rejects.toMatchObject({
      code: 'ENROLLMENT_NOT_FOUND',
    });
    await expect(adapter.getCredentialSummary()).resolves.toBeNull();
    await expect(adapter.getPrivateCredentialMaterial()).resolves.toBeNull();
  });
});
