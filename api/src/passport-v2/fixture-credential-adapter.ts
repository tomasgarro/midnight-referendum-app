import { deriveCredentialLeaf, deriveHolderBinding, HOLDER_MATERIAL_BYTES } from './crypto.js';
import type {
  CivicCredentialPort,
  CivicCredentialPrivateMaterial,
  CivicCredentialPrivateStatePort,
} from './ports.js';
import type {
  CivicActionAuthorization,
  CivicCredentialClaims,
  CredentialEnrollment,
  CredentialEnrollmentRequest,
  CredentialSummary,
  EnrollmentStatus,
  EnrollmentStatusSnapshot,
} from './types.js';
import {
  CivicCredentialError,
  type CredentialPolicy,
  compareCredentialAssurance,
} from './types.js';

const DEFAULT_ENROLLMENT_TTL_MS = 15 * 60 * 1_000;

export interface FixtureCivicCredentialAdapterOptions {
  /**
   * Synthetic authoritative claims. This adapter never derives them from a
   * Passport profile; production adapters obtain them from a verified
   * provider/issuer boundary.
   */
  readonly claims: CivicCredentialClaims;
  readonly now?: () => Date;
  readonly randomBytes?: (length: number) => Uint8Array;
  readonly enrollmentTtlMs?: number;
}

interface EnrollmentRecord {
  readonly enrollmentId: string;
  readonly holderSecret: Uint8Array;
  readonly holderBlind: Uint8Array;
  readonly holderBinding: Uint8Array;
  readonly credentialBlind: Uint8Array;
  readonly credentialLeaf: Uint8Array;
  readonly createdAt: string;
  readonly expiresAt: string;
  status: EnrollmentStatus;
  updatedAt: string;
  readonly summary: CredentialSummary;
}

/**
 * Local-only credential adapter used for UI development and conformance
 * tests. Each enrollment creates fresh holder material. The material never
 * leaves this object and is zeroized by clearCredential().
 */
export class FixtureCivicCredentialAdapter
  implements CivicCredentialPort, CivicCredentialPrivateStatePort
{
  readonly adapterName = 'fixture-civic-credential';
  private readonly claims: CivicCredentialClaims;
  private readonly now: () => Date;
  private readonly randomBytes: (length: number) => Uint8Array;
  private readonly enrollmentTtlMs: number;
  private readonly enrollments = new Map<string, EnrollmentRecord>();
  private activeEnrollmentId: string | null = null;

  constructor(options: FixtureCivicCredentialAdapterOptions) {
    validateClaims(options.claims);
    if (options.enrollmentTtlMs !== undefined && options.enrollmentTtlMs <= 0) {
      throw new TypeError('enrollmentTtlMs must be positive');
    }

    this.claims = cloneClaims(options.claims);
    this.now = options.now ?? (() => new Date());
    this.randomBytes = options.randomBytes ?? secureRandomBytes;
    this.enrollmentTtlMs = options.enrollmentTtlMs ?? DEFAULT_ENROLLMENT_TTL_MS;
  }

  async beginEnrollment(request: CredentialEnrollmentRequest): Promise<CredentialEnrollment> {
    this.assertSession(request);
    this.assertPolicy(request.policy);

    const created = this.now();
    const expires = new Date(created.getTime() + this.enrollmentTtlMs);
    if (expires <= created) {
      throw new CivicCredentialError(
        'ENROLLMENT_EXPIRED',
        'The fixture enrollment window is already expired',
      );
    }

    const enrollmentId = bytesToOpaqueId(this.randomBytes(16));
    const holderSecret = this.randomBytes(HOLDER_MATERIAL_BYTES);
    const holderBlind = this.randomBytes(HOLDER_MATERIAL_BYTES);
    const holderBinding = deriveHolderBinding(holderSecret, holderBlind);
    const credentialBlind = this.randomBytes(HOLDER_MATERIAL_BYTES);
    const credentialLeaf = deriveCredentialLeaf({
      holderBinding,
      claims: this.claims,
      credentialBlind,
    });
    const createdAt = created.toISOString();
    const expiresAt = expires.toISOString();

    const record: EnrollmentRecord = {
      enrollmentId,
      holderSecret,
      holderBlind,
      holderBinding,
      credentialBlind,
      credentialLeaf,
      createdAt,
      expiresAt,
      status: 'issued',
      updatedAt: createdAt,
      summary: {
        provider: 'fixture',
        status: 'issued',
        issuerId: this.claims.issuerId,
        country: this.claims.country,
        ageClass: this.claims.ageClass,
        assurance: this.claims.assurance,
        credentialEpoch: this.claims.credentialEpoch,
        validFrom: this.claims.validFrom,
        validUntil: this.claims.validUntil,
      },
    };

    this.enrollments.set(enrollmentId, record);
    this.activeEnrollmentId = enrollmentId;

    return {
      enrollmentId,
      status: record.status,
      holderBinding: new Uint8Array(holderBinding),
      createdAt,
      expiresAt,
    };
  }

  async getEnrollmentStatus(enrollmentId: string): Promise<EnrollmentStatusSnapshot> {
    const record = this.getRecord(enrollmentId);
    this.refreshExpiry(record);
    return {
      enrollmentId: record.enrollmentId,
      status: record.status,
      updatedAt: record.updatedAt,
      ...(record.status === 'expired' ? { errorCode: 'ENROLLMENT_EXPIRED' as const } : {}),
    };
  }

  async getCredentialSummary(): Promise<CredentialSummary | null> {
    if (!this.activeEnrollmentId) return null;
    const record = this.enrollments.get(this.activeEnrollmentId);
    if (!record) return null;
    this.refreshExpiry(record);
    if (record.status !== 'issued') {
      return {
        ...record.summary,
        status: record.status === 'expired' ? 'expired' : 'revoked',
      };
    }
    return { ...record.summary };
  }

  async getActionAuthorization(): Promise<CivicActionAuthorization | null> {
    if (!this.activeEnrollmentId) return null;
    const record = this.enrollments.get(this.activeEnrollmentId);
    if (!record) return null;
    this.refreshExpiry(record);
    if (record.status !== 'issued') return null;
    return {
      kind: 'civic-credential',
      handle: `fixture:${record.enrollmentId}`,
    };
  }

  async getPrivateCredentialMaterial(): Promise<CivicCredentialPrivateMaterial | null> {
    if (!this.activeEnrollmentId) return null;
    const record = this.enrollments.get(this.activeEnrollmentId);
    if (!record) return null;
    this.refreshExpiry(record);
    if (record.status !== 'issued') return null;
    return {
      voterSecret: new Uint8Array(record.holderSecret),
      holderBlind: new Uint8Array(record.holderBlind),
      holderBinding: new Uint8Array(record.holderBinding),
      credentialBlind: new Uint8Array(record.credentialBlind),
      credentialLeaf: new Uint8Array(record.credentialLeaf),
      claims: cloneClaims(this.claims),
    };
  }

  async clearCredential(): Promise<void> {
    for (const record of this.enrollments.values()) {
      record.status = 'revoked';
      record.updatedAt = this.now().toISOString();
      record.holderSecret.fill(0);
      record.holderBlind.fill(0);
      record.holderBinding.fill(0);
      record.credentialBlind.fill(0);
      record.credentialLeaf.fill(0);
    }
    this.enrollments.clear();
    this.activeEnrollmentId = null;
  }

  private assertSession(request: CredentialEnrollmentRequest): void {
    if (!request.session) {
      throw new CivicCredentialError(
        'PASSPORT_SESSION_REQUIRED',
        'Connect Midnight Passport before enrolling a civic credential',
      );
    }
    if (request.session.status === 'expired') {
      throw new CivicCredentialError(
        'PASSPORT_SESSION_EXPIRED',
        'The Midnight Passport session has expired',
        true,
      );
    }
    if (request.session.status !== 'connected') {
      throw new CivicCredentialError(
        'PASSPORT_SESSION_REQUIRED',
        'A connected Midnight Passport session is required',
      );
    }
  }

  private assertPolicy(policy: CredentialPolicy | undefined): void {
    if (!policy) return;
    if (policy.allowedCountries && !policy.allowedCountries.includes(this.claims.country)) {
      throw new CivicCredentialError(
        'POLICY_NOT_SATISFIED',
        'The verified country is not eligible for this credential policy',
      );
    }
    if (
      policy.minimumAssurance &&
      compareCredentialAssurance(this.claims.assurance, policy.minimumAssurance) < 0
    ) {
      throw new CivicCredentialError(
        'POLICY_NOT_SATISFIED',
        'The verified credential assurance is below the policy minimum',
      );
    }
    if (policy.requireAdult && this.claims.ageClass !== '18-plus') {
      throw new CivicCredentialError(
        'POLICY_NOT_SATISFIED',
        'The verified age class does not satisfy the adult policy',
      );
    }
  }

  private getRecord(enrollmentId: string): EnrollmentRecord {
    const record = this.enrollments.get(enrollmentId);
    if (!record) {
      throw new CivicCredentialError(
        'ENROLLMENT_NOT_FOUND',
        'The civic credential enrollment was not found',
      );
    }
    return record;
  }

  private refreshExpiry(record: EnrollmentRecord): void {
    if (record.status !== 'issued') return;
    if (this.now().getTime() >= Date.parse(record.expiresAt)) {
      record.status = 'expired';
      record.updatedAt = this.now().toISOString();
    }
  }
}

function validateClaims(claims: CivicCredentialClaims): void {
  if (!claims.issuerId.trim()) {
    throw new TypeError('credential issuerId must not be empty');
  }
  if (!/^[0-9]{3}$/.test(claims.country) || claims.country === '000') {
    throw new TypeError('credential country must be a non-zero ISO numeric code');
  }
  if (
    claims.ageClass !== 'unknown' &&
    claims.ageClass !== 'under-18' &&
    claims.ageClass !== '18-plus'
  ) {
    throw new TypeError('credential ageClass is invalid');
  }
  if (
    claims.assurance !== 'self-asserted' &&
    claims.assurance !== 'document' &&
    claims.assurance !== 'document-nfc' &&
    claims.assurance !== 'passport-native'
  ) {
    throw new TypeError('credential assurance is invalid');
  }
  if (!Number.isSafeInteger(claims.credentialEpoch) || claims.credentialEpoch < 0) {
    throw new TypeError('credential epoch must be a non-negative safe integer');
  }
  const validFrom = Date.parse(claims.validFrom);
  const validUntil = Date.parse(claims.validUntil);
  if (!Number.isFinite(validFrom) || !Number.isFinite(validUntil) || validUntil <= validFrom) {
    throw new TypeError('credential validity window is invalid');
  }
}

function cloneClaims(claims: CivicCredentialClaims): CivicCredentialClaims {
  return {
    issuerId: claims.issuerId,
    country: claims.country,
    ageClass: claims.ageClass,
    assurance: claims.assurance,
    credentialEpoch: claims.credentialEpoch,
    validFrom: claims.validFrom,
    validUntil: claims.validUntil,
  };
}

function secureRandomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function bytesToOpaqueId(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}
