import { describe, expect, it } from 'vitest';
import { deriveCredentialLeaf, deriveHolderBinding } from './crypto.js';
import { FixtureCivicCredentialAdapter } from './fixture-credential-adapter.js';
import {
  type CredentialEnrollmentRequest,
  isoNumericCountry,
  type PassportSession,
} from './types.js';

const now = new Date('2026-08-24T12:00:00.000Z');
const claims = {
  issuerId: 'cico-fixture-issuer',
  country: isoNumericCountry('032'),
  ageClass: '18-plus' as const,
  assurance: 'document-nfc' as const,
  credentialEpoch: 1,
  validFrom: '2026-08-24T00:00:00.000Z',
  validUntil: '2027-08-24T00:00:00.000Z',
};

function session(profile?: PassportSession['profile']): PassportSession {
  return {
    sessionId: 'display-session-id',
    origin: 'http://localhost:4173',
    network: 'preview',
    status: 'connected',
    profile,
    accountAddress: 'display-only-address',
    capabilities: ['session', 'profile'],
  };
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

function makeAdapter(randomBytes = deterministicRandomBytes()) {
  return new FixtureCivicCredentialAdapter({
    claims,
    now: () => new Date(now),
    randomBytes,
  });
}

const request = (profile?: PassportSession['profile']): CredentialEnrollmentRequest => ({
  session: session(profile),
  policy: {
    allowedCountries: [isoNumericCountry('032')],
    minimumAssurance: 'document',
    requireAdult: true,
  },
});

describe('CivicCredentialPort conformance', () => {
  it('issues a safe summary and fresh holder binding for each enrollment', async () => {
    const adapter = makeAdapter();
    const first = await adapter.beginEnrollment(request());
    const second = await adapter.beginEnrollment(request());

    expect(first.status).toBe('issued');
    expect(first.holderBinding).toHaveLength(32);
    expect(second.holderBinding).toHaveLength(32);
    expect(second.enrollmentId).not.toBe(first.enrollmentId);
    expect(second.holderBinding).not.toEqual(first.holderBinding);

    const summary = await adapter.getCredentialSummary();
    expect(summary).toEqual({
      provider: 'fixture',
      status: 'issued',
      issuerId: 'cico-fixture-issuer',
      country: '032',
      ageClass: '18-plus',
      assurance: 'document-nfc',
      credentialEpoch: 1,
      validFrom: '2026-08-24T00:00:00.000Z',
      validUntil: '2027-08-24T00:00:00.000Z',
    });
    await expect(adapter.getActionAuthorization()).resolves.toEqual({
      kind: 'civic-credential',
      handle: `fixture:${second.enrollmentId}`,
    });
  });

  it('derives the exact Compact-compatible holder binding', async () => {
    const expectedRandom = deterministicRandomBytes();
    expectedRandom(16);
    const voterSecret = expectedRandom(32);
    const holderBlind = expectedRandom(32);
    const adapter = makeAdapter(deterministicRandomBytes());
    const enrollment = await adapter.beginEnrollment(request());
    expect(enrollment.holderBinding).toEqual(deriveHolderBinding(voterSecret, holderBlind));
    const privateMaterial = await adapter.getPrivateCredentialMaterial();
    expect(privateMaterial).not.toBeNull();
    expect(privateMaterial?.credentialLeaf).toEqual(
      deriveCredentialLeaf({
        holderBinding: privateMaterial?.holderBinding ?? new Uint8Array(),
        credentialBlind: privateMaterial?.credentialBlind ?? new Uint8Array(),
        claims: privateMaterial?.claims ?? claims,
      }),
    );
    privateMaterial?.holderBlind.fill(0);
    expect((await adapter.getPrivateCredentialMaterial())?.holderBlind).not.toEqual(
      privateMaterial?.holderBlind,
    );
  });

  it('does not derive credential claims from Passport profile/session values', async () => {
    const first = makeAdapter(deterministicRandomBytes());
    const second = makeAdapter(deterministicRandomBytes());
    const firstEnrollment = await first.beginEnrollment(
      request({ displayName: 'Alice', alias: 'alice', avatarUrl: 'alice.png' }),
    );
    const secondEnrollment = await second.beginEnrollment(
      request({ displayName: 'Bob', alias: 'bob', avatarUrl: 'bob.png' }),
    );

    expect(firstEnrollment.holderBinding).toEqual(secondEnrollment.holderBinding);
    expect(await first.getCredentialSummary()).toEqual(await second.getCredentialSummary());
  });

  it('rejects a disconnected or expired Passport session', async () => {
    const adapter = makeAdapter();
    await expect(
      adapter.beginEnrollment({
        ...request(),
        session: { ...session(), status: 'disconnected' },
      }),
    ).rejects.toMatchObject({ code: 'PASSPORT_SESSION_REQUIRED' });
    await expect(
      adapter.beginEnrollment({
        ...request(),
        session: { ...session(), status: 'expired' },
      }),
    ).rejects.toMatchObject({ code: 'PASSPORT_SESSION_EXPIRED' });
  });

  it('enforces country, assurance, and age policy before issuing', async () => {
    const adapter = makeAdapter();
    await expect(
      adapter.beginEnrollment({
        ...request(),
        policy: { allowedCountries: [isoNumericCountry('076')] },
      }),
    ).rejects.toMatchObject({ code: 'POLICY_NOT_SATISFIED' });
    await expect(
      adapter.beginEnrollment({
        ...request(),
        policy: { minimumAssurance: 'passport-native' },
      }),
    ).rejects.toMatchObject({ code: 'POLICY_NOT_SATISFIED' });

    const underAgeAdapter = new FixtureCivicCredentialAdapter({
      claims: { ...claims, ageClass: 'under-18' },
      now: () => new Date(now),
      randomBytes: deterministicRandomBytes(),
    });
    await expect(
      underAgeAdapter.beginEnrollment({ ...request(), policy: { requireAdult: true } }),
    ).rejects.toMatchObject({ code: 'POLICY_NOT_SATISFIED' });
  });

  it('reports expiry and clears all local credential material', async () => {
    let clock = now.getTime();
    const adapter = new FixtureCivicCredentialAdapter({
      claims,
      now: () => new Date(clock),
      enrollmentTtlMs: 1_000,
      randomBytes: deterministicRandomBytes(),
    });
    const enrollment = await adapter.beginEnrollment(request());
    clock += 1_001;

    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).resolves.toMatchObject({
      status: 'expired',
      errorCode: 'ENROLLMENT_EXPIRED',
    });
    expect(await adapter.getCredentialSummary()).toMatchObject({ status: 'expired' });
    await expect(adapter.getActionAuthorization()).resolves.toBeNull();
    await expect(adapter.getPrivateCredentialMaterial()).resolves.toBeNull();

    await adapter.clearCredential();
    await expect(adapter.getCredentialSummary()).resolves.toBeNull();
    await expect(adapter.getActionAuthorization()).resolves.toBeNull();
    await expect(adapter.getPrivateCredentialMaterial()).resolves.toBeNull();
    await expect(adapter.getEnrollmentStatus(enrollment.enrollmentId)).rejects.toMatchObject({
      code: 'ENROLLMENT_NOT_FOUND',
    });
  });
});

describe('Passport domain scalar validation', () => {
  it('preserves ISO numeric country leading zeroes', () => {
    expect(isoNumericCountry(32)).toBe('032');
    expect(() => isoNumericCountry('32')).toThrow();
    expect(() => isoNumericCountry('000')).toThrow();
  });
});
