import {
  deriveCredentialLeaf,
  deriveHolderBinding,
  deriveRarimoIssuanceEventData,
  HOLDER_MATERIAL_BYTES,
} from './crypto.js';
import type {
  CivicCredentialIssuanceResult,
  CivicCredentialIssuerPort,
  CivicCredentialPort,
  CivicCredentialPrivateMaterial,
  CivicCredentialPrivateStatePort,
} from './ports.js';
import type {
  RarimoCountryMapper,
  RarimoDerivedClaims,
  RarimoVerificationGateway,
  RarimoVerificationRequest,
  RarimoVerificationStatus,
  RarimoVerifiedEvidence,
} from './rarimo-types.js';
import type {
  CivicActionAuthorization,
  CivicCredentialClaims,
  CredentialEnrollment,
  CredentialEnrollmentRequest,
  CredentialPolicy,
  CredentialSummary,
  EnrollmentStatus,
  EnrollmentStatusSnapshot,
} from './types.js';
import { CivicCredentialError, compareCredentialAssurance } from './types.js';

const EVENT_ID_BYTES = 31;
const REQUEST_ID_BYTES = 16;
const DEFAULT_ENROLLMENT_TTL_MS = 10 * 60 * 1_000;
const DEFAULT_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_DATE_HEX = '0x303030303030';

// Rarimo query selector bits: nullifier, citizenship, range checks.
const NULLIFIER_BIT = 1 << 0;
const CITIZENSHIP_BIT = 1 << 5;
const TIMESTAMP_UPPER_BOUND_BIT = 1 << 9;
const IDENTITY_COUNTER_UPPER_BOUND_BIT = 1 << 11;
const EXPIRATION_DATE_LOWER_BOUND_BIT = 1 << 12;
const BIRTH_DATE_UPPER_BOUND_BIT = 1 << 15;

const RARIMO_ASSURANCE = 'document-nfc' as const;

export interface RarimoCivicCredentialAdapterOptions {
  /** Injected transport boundary; this adapter never performs network I/O. */
  readonly gateway: RarimoVerificationGateway;
  /** CICO/Midnight issuer; provider evidence alone never marks a credential issued. */
  readonly issuer: CivicCredentialIssuerPort;
  /** Stable issuer namespace, independent from relayer and organizer keys. */
  readonly issuerId: string;
  readonly credentialEpoch: number;
  /** Complete alpha-3/numeric catalogue supplied by the issuer deployment. */
  readonly countryMapper: RarimoCountryMapper;
  /** Required for a sound uniqueness request; never guessed by this adapter. */
  readonly uniquenessTimestampUpperBoundUnixSeconds: number;
  readonly now?: () => Date;
  readonly randomBytes?: (length: number) => Uint8Array;
  readonly enrollmentTtlMs?: number;
  readonly credentialTtlMs?: number;
}

interface RarimoEnrollmentRecord {
  readonly enrollmentId: string;
  readonly requestId: string;
  readonly userIdHash: string;
  readonly holderSecret: Uint8Array;
  readonly holderBlind: Uint8Array;
  readonly holderBinding: Uint8Array;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly request: RarimoVerificationRequest;
  readonly policy?: CredentialPolicy;
  status: EnrollmentStatus;
  updatedAt: string;
  summary?: CredentialSummary;
  credentialBlind?: Uint8Array;
  credentialLeaf?: Uint8Array;
  actionAuthorizationHandle?: string;
  /** A one-way in-memory replay marker; the raw proof is never retained. */
  proofFingerprint?: string;
  cleanupRequested: boolean;
}

/**
 * Local CICO boundary for a Rarimo-backed credential.
 *
 * The gateway is intentionally injected. An HTTP gateway belongs in a
 * backend package and must translate its response into the DTOs in
 * `rarimo-types.ts`; the browser/domain layer never receives Rarimo payloads.
 */
export class RarimoCivicCredentialAdapter
  implements CivicCredentialPort, CivicCredentialPrivateStatePort
{
  readonly adapterName = 'rarimo-civic-credential';

  private readonly gateway: RarimoVerificationGateway;
  private readonly issuer: CivicCredentialIssuerPort;
  private readonly issuerId: string;
  private readonly credentialEpoch: number;
  private readonly countryMapper: RarimoCountryMapper;
  private readonly uniquenessTimestampUpperBoundUnixSeconds: number;
  private readonly now: () => Date;
  private readonly randomBytes: (length: number) => Uint8Array;
  private readonly enrollmentTtlMs: number;
  private readonly credentialTtlMs: number;
  private readonly enrollments = new Map<string, RarimoEnrollmentRecord>();
  private readonly statusChecks = new Map<string, Promise<EnrollmentStatusSnapshot>>();
  private activeEnrollmentId: string | null = null;

  constructor(options: RarimoCivicCredentialAdapterOptions) {
    if (!options.issuerId.trim()) throw new TypeError('issuerId must not be empty');
    if (!Number.isSafeInteger(options.credentialEpoch) || options.credentialEpoch < 0) {
      throw new TypeError('credentialEpoch must be a non-negative safe integer');
    }
    if (
      !Number.isSafeInteger(options.uniquenessTimestampUpperBoundUnixSeconds) ||
      options.uniquenessTimestampUpperBoundUnixSeconds < 0
    ) {
      throw new TypeError('uniqueness timestamp upper bound must be a non-negative safe integer');
    }
    if (options.enrollmentTtlMs !== undefined && options.enrollmentTtlMs <= 0) {
      throw new TypeError('enrollmentTtlMs must be positive');
    }
    if (options.credentialTtlMs !== undefined && options.credentialTtlMs <= 0) {
      throw new TypeError('credentialTtlMs must be positive');
    }

    this.gateway = options.gateway;
    this.issuer = options.issuer;
    this.issuerId = options.issuerId;
    this.credentialEpoch = options.credentialEpoch;
    this.countryMapper = options.countryMapper;
    this.uniquenessTimestampUpperBoundUnixSeconds =
      options.uniquenessTimestampUpperBoundUnixSeconds;
    this.now = options.now ?? (() => new Date());
    this.randomBytes = options.randomBytes ?? secureRandomBytes;
    this.enrollmentTtlMs = options.enrollmentTtlMs ?? DEFAULT_ENROLLMENT_TTL_MS;
    this.credentialTtlMs = options.credentialTtlMs ?? DEFAULT_CREDENTIAL_TTL_MS;
  }

  async beginEnrollment(request: CredentialEnrollmentRequest): Promise<CredentialEnrollment> {
    assertConnectedPassportSession(request);
    this.assertPolicyCanBeRequested(request.policy);

    // A new attempt invalidates every old attempt, so an old QR code cannot
    // later become the active credential by racing the new one.
    if (this.enrollments.size > 0) await this.clearCredential();

    const created = this.now();
    const expires = new Date(created.getTime() + this.enrollmentTtlMs);
    if (expires <= created) {
      throw new CivicCredentialError(
        'ENROLLMENT_EXPIRED',
        'The Rarimo enrollment window is already expired',
      );
    }

    const enrollmentId = bytesToHex(this.randomBytes(REQUEST_ID_BYTES));
    const requestId = bytesToHex(this.randomBytes(REQUEST_ID_BYTES));
    const holderSecret = this.randomBytes(HOLDER_MATERIAL_BYTES);
    const holderBlind = this.randomBytes(HOLDER_MATERIAL_BYTES);
    const holderBinding = deriveHolderBinding(holderSecret, holderBlind);
    const verificationRequest = this.buildVerificationRequest(
      requestId,
      enrollmentId,
      holderBinding,
      request.policy,
    );

    try {
      const link = await this.gateway.createVerificationRequest(verificationRequest);
      validateVerificationLink(link, requestId);

      const createdAt = created.toISOString();
      const expiresAt = expires.toISOString();
      const record: RarimoEnrollmentRecord = {
        enrollmentId,
        requestId,
        userIdHash: link.userIdHash,
        holderSecret,
        holderBlind,
        holderBinding,
        createdAt,
        expiresAt,
        request: verificationRequest,
        policy: request.policy,
        status: 'pending',
        updatedAt: createdAt,
        cleanupRequested: false,
      };

      this.enrollments.set(enrollmentId, record);
      this.activeEnrollmentId = enrollmentId;

      return {
        enrollmentId,
        status: 'pending',
        holderBinding: new Uint8Array(holderBinding),
        createdAt,
        expiresAt,
        interaction: {
          kind: 'cross-device-qr',
          uri: link.proofRequestUrl,
          expiresAt,
        },
      };
    } catch (error) {
      zeroize(holderSecret, holderBlind, holderBinding);
      if (error instanceof CivicCredentialError) throw error;
      throw new CivicCredentialError(
        'ADAPTER_UNAVAILABLE',
        'The Rarimo verification request could not be created',
        true,
      );
    }
  }

  async getEnrollmentStatus(enrollmentId: string): Promise<EnrollmentStatusSnapshot> {
    const existing = this.statusChecks.get(enrollmentId);
    if (existing) return existing;
    const operation = this.pollEnrollmentStatus(enrollmentId);
    this.statusChecks.set(enrollmentId, operation);
    try {
      return await operation;
    } finally {
      if (this.statusChecks.get(enrollmentId) === operation) {
        this.statusChecks.delete(enrollmentId);
      }
    }
  }

  private async pollEnrollmentStatus(enrollmentId: string): Promise<EnrollmentStatusSnapshot> {
    const record = this.getRecord(enrollmentId);
    if (isTerminal(record.status)) return toStatusSnapshot(record);

    if (this.now().getTime() >= Date.parse(record.expiresAt)) {
      await this.expireRecord(record);
      return toStatusSnapshot(record, 'ENROLLMENT_EXPIRED');
    }

    let providerStatus: RarimoVerificationStatus;
    try {
      providerStatus = await this.gateway.getVerificationStatus(record.requestId);
    } catch {
      throw new CivicCredentialError(
        'ADAPTER_UNAVAILABLE',
        'The Rarimo verification status could not be fetched',
        true,
      );
    }

    if (providerStatus === 'not_verified') {
      record.updatedAt = this.now().toISOString();
      return toStatusSnapshot(record);
    }

    if (providerStatus === 'failed_verification' || providerStatus === 'uniqueness_check_failed') {
      await this.failAndCleanup(record);
      return toStatusSnapshot(record, 'INVALID_CREDENTIAL_CLAIMS');
    }

    // Exact verified gate: only minimal evidence returned by CICO's trusted
    // backend may advance the browser-held credential state.
    let verifiedEvidence: RarimoVerifiedEvidence | null;
    try {
      verifiedEvidence = await this.gateway.getVerifiedEvidence(record.requestId);
    } catch {
      throw new CivicCredentialError(
        'ADAPTER_UNAVAILABLE',
        'The verified Rarimo evidence could not be fetched',
        true,
      );
    }
    if (!verifiedEvidence) {
      await this.failAndCleanup(record);
      return toStatusSnapshot(record, 'INVALID_CREDENTIAL_CLAIMS');
    }

    try {
      validateEvidenceBinding(record, verifiedEvidence);
      const derivedClaims = deriveClaims(verifiedEvidence, this.countryMapper, record);
      const now = new Date(Math.floor(this.now().getTime() / 1_000) * 1_000);
      const validUntil = new Date(now.getTime() + this.credentialTtlMs);
      const claims: CivicCredentialClaims = {
        issuerId: this.issuerId,
        country: derivedClaims.country,
        ageClass: derivedClaims.ageClass,
        assurance: derivedClaims.assurance,
        credentialEpoch: this.credentialEpoch,
        validFrom: now.toISOString(),
        validUntil: validUntil.toISOString(),
      };
      const proofFingerprint = verifiedEvidence.evidenceFingerprint;
      let issuance: CivicCredentialIssuanceResult;
      try {
        issuance = await this.issuer.issueCredential({
          enrollmentId: record.enrollmentId,
          provider: 'rarimo',
          evidenceAuthorization: verifiedEvidence.evidenceAuthorization,
          holderBinding: new Uint8Array(record.holderBinding),
          claims,
        });
      } catch {
        throw new CivicCredentialError(
          'ISSUANCE_FAILED',
          'The verified evidence has not yet been issued on Midnight',
          true,
        );
      }
      validateIssuance(issuance, record.holderBinding, claims);
      record.credentialBlind = new Uint8Array(issuance.credentialBlind);
      record.credentialLeaf = new Uint8Array(issuance.credentialLeaf);
      record.actionAuthorizationHandle = issuance.issuanceId;
      record.summary = {
        provider: 'rarimo',
        status: 'issued',
        ...claims,
      };
      record.proofFingerprint = proofFingerprint;
      record.status = 'issued';
      record.updatedAt = now.toISOString();
      await this.cleanupProviderRecord(record).catch(() => {
        // Issuance is canonical. Provider deletion is retried by backend retention work.
      });
      return toStatusSnapshot(record);
    } catch (error) {
      if (
        error instanceof CivicCredentialError &&
        (error.code === 'ADAPTER_UNAVAILABLE' || error.code === 'ISSUANCE_FAILED')
      ) {
        throw error;
      }
      await this.failAndCleanup(record);
      return toStatusSnapshot(record, 'INVALID_CREDENTIAL_CLAIMS');
    }
  }

  async getCredentialSummary(): Promise<CredentialSummary | null> {
    if (!this.activeEnrollmentId) return null;
    const record = this.enrollments.get(this.activeEnrollmentId);
    if (!record?.summary) return null;
    if (
      record.status === 'issued' &&
      this.now().getTime() >= Date.parse(record.summary.validUntil)
    ) {
      record.status = 'expired';
      record.summary = { ...record.summary, status: 'expired' };
      record.updatedAt = this.now().toISOString();
    }
    return { ...record.summary };
  }

  async getActionAuthorization(): Promise<CivicActionAuthorization | null> {
    if (!this.activeEnrollmentId) return null;
    const record = this.enrollments.get(this.activeEnrollmentId);
    if (record?.status !== 'issued' || !record.actionAuthorizationHandle) return null;
    if (record.summary && this.now().getTime() >= Date.parse(record.summary.validUntil)) {
      record.status = 'expired';
      record.summary = { ...record.summary, status: 'expired' };
      record.updatedAt = this.now().toISOString();
      return null;
    }
    return {
      kind: 'civic-credential',
      handle: record.actionAuthorizationHandle,
    };
  }

  async getPrivateCredentialMaterial(): Promise<CivicCredentialPrivateMaterial | null> {
    if (!this.activeEnrollmentId) return null;
    const record = this.enrollments.get(this.activeEnrollmentId);
    if (
      record?.status !== 'issued' ||
      !record.summary ||
      !record.credentialBlind ||
      !record.credentialLeaf
    ) {
      return null;
    }
    if (this.now().getTime() >= Date.parse(record.summary.validUntil)) {
      record.status = 'expired';
      record.summary = { ...record.summary, status: 'expired' };
      record.updatedAt = this.now().toISOString();
      return null;
    }
    const { provider: _provider, status: _status, ...claims } = record.summary;
    return {
      voterSecret: new Uint8Array(record.holderSecret),
      holderBlind: new Uint8Array(record.holderBlind),
      holderBinding: new Uint8Array(record.holderBinding),
      credentialBlind: new Uint8Array(record.credentialBlind),
      credentialLeaf: new Uint8Array(record.credentialLeaf),
      claims,
    };
  }

  async clearCredential(): Promise<void> {
    const records = [...this.enrollments.values()];
    const cleanupResults = await Promise.allSettled(
      records.map((record) => this.cleanupProviderRecord(record)),
    );

    // Always zeroize and forget local material, even if provider cleanup is
    // temporarily unavailable. The caller can retry provider cleanup through
    // its backend retention job without retaining holder secrets in this
    // process.
    for (const record of records) {
      zeroize(record.holderSecret, record.holderBlind, record.holderBinding);
      if (record.credentialBlind) record.credentialBlind.fill(0);
      if (record.credentialLeaf) record.credentialLeaf.fill(0);
    }
    this.enrollments.clear();
    this.activeEnrollmentId = null;

    const failedCleanup = cleanupResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failedCleanup) {
      throw new CivicCredentialError(
        'ADAPTER_UNAVAILABLE',
        'The Rarimo verification record could not be cleaned up',
        true,
      );
    }
  }

  private assertPolicyCanBeRequested(policy: CredentialPolicy | undefined): void {
    if (
      policy?.minimumAssurance &&
      compareCredentialAssurance(RARIMO_ASSURANCE, policy.minimumAssurance) < 0
    ) {
      throw new CivicCredentialError(
        'POLICY_NOT_SATISFIED',
        'Rarimo evidence does not satisfy the requested assurance policy',
      );
    }
    if (policy?.allowedCountries && policy.allowedCountries.length === 0) {
      throw new CivicCredentialError(
        'POLICY_NOT_SATISFIED',
        'The credential policy contains no allowed countries',
      );
    }
  }

  private buildVerificationRequest(
    requestId: string,
    enrollmentId: string,
    holderBinding: Uint8Array,
    policy: CredentialPolicy | undefined,
  ): RarimoVerificationRequest {
    const now = this.now();
    const eventDataBytes = deriveRarimoIssuanceEventData(enrollmentId, holderBinding);
    const eventData = `0x${bytesToHex(eventDataBytes)}` as `0x${string}`;
    const eventDataDecimal = bytesToBigInt(eventDataBytes).toString(10);
    const eventId = bytesToPositiveFieldDecimal(this.randomBytes(EVENT_ID_BYTES));
    const requireAdult = policy?.requireAdult === true;
    const requireExpiry = true;
    const selector =
      NULLIFIER_BIT |
      CITIZENSHIP_BIT |
      TIMESTAMP_UPPER_BOUND_BIT |
      IDENTITY_COUNTER_UPPER_BOUND_BIT |
      (requireExpiry ? EXPIRATION_DATE_LOWER_BOUND_BIT : 0) |
      (requireAdult ? BIRTH_DATE_UPPER_BOUND_BIT : 0);

    let citizenshipMask: string | undefined;
    if (policy?.allowedCountries?.length === 1) {
      citizenshipMask = this.countryMapper.toAlpha3(policy.allowedCountries[0]);
    }

    return {
      requestId,
      eventId,
      eventData,
      eventDataDecimal,
      selector: String(selector),
      citizenshipMask,
      birthDateLowerBound: DEFAULT_DATE_HEX,
      birthDateUpperBound: requireAdult
        ? asciiDateHex(ageThresholdDate(now, 18))
        : DEFAULT_DATE_HEX,
      identityCounterLowerBound: '0',
      identityCounterUpperBound: '1',
      expirationDateLowerBound: asciiDateHex(now),
      expirationDateUpperBound: DEFAULT_DATE_HEX,
      timestampLowerBound: '0',
      timestampUpperBound: String(this.uniquenessTimestampUpperBoundUnixSeconds),
    };
  }

  private getRecord(enrollmentId: string): RarimoEnrollmentRecord {
    const record = this.enrollments.get(enrollmentId);
    if (!record) {
      throw new CivicCredentialError('ENROLLMENT_NOT_FOUND', 'The Rarimo enrollment was not found');
    }
    return record;
  }

  private async expireRecord(record: RarimoEnrollmentRecord): Promise<void> {
    record.status = 'expired';
    record.updatedAt = this.now().toISOString();
    try {
      await this.cleanupProviderRecord(record);
    } finally {
      zeroize(record.holderSecret, record.holderBlind, record.holderBinding);
    }
  }

  private async failAndCleanup(record: RarimoEnrollmentRecord): Promise<void> {
    failRecord(record, this.now());
    try {
      await this.cleanupProviderRecord(record);
    } catch {
      // The local record is terminal and its holder material is already
      // zeroized. Provider cleanup can be retried by a backend retention job.
    }
  }

  private async cleanupProviderRecord(record: RarimoEnrollmentRecord): Promise<void> {
    if (record.cleanupRequested) return;
    await this.gateway.deleteVerification(record.requestId);
    record.cleanupRequested = true;
  }
}

function validateIssuance(
  issuance: Awaited<ReturnType<CivicCredentialIssuerPort['issueCredential']>>,
  holderBinding: Uint8Array,
  claims: CivicCredentialClaims,
): void {
  if (!issuance.issuanceId.trim()) {
    throw new CivicCredentialError('ISSUANCE_FAILED', 'Issuer returned no issuance ID', true);
  }
  if (
    issuance.credentialBlind.length !== 32 ||
    issuance.credentialLeaf.length !== 32 ||
    issuance.receipt.status !== 'confirmed' ||
    issuance.receipt.action !== 'credential' ||
    issuance.receipt.circuit !== 'addCredential' ||
    issuance.receipt.network !== 'preview'
  ) {
    throw new CivicCredentialError(
      'ISSUANCE_FAILED',
      'Issuer did not return a canonical credential issuance',
      true,
    );
  }
  const expectedLeaf = deriveCredentialLeaf({
    holderBinding,
    claims,
    credentialBlind: issuance.credentialBlind,
  });
  if (!equalBytes(expectedLeaf, issuance.credentialLeaf)) {
    throw new CivicCredentialError(
      'ISSUANCE_FAILED',
      'Issuer credential leaf does not match the verified claims',
      true,
    );
  }
}

function assertConnectedPassportSession(request: CredentialEnrollmentRequest): void {
  if (!request.session) {
    throw new CivicCredentialError(
      'PASSPORT_SESSION_REQUIRED',
      'Connect Midnight Passport before enrolling a Rarimo credential',
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

function validateVerificationLink(
  link: {
    readonly requestId: string;
    readonly userIdHash: string;
    readonly proofRequestUrl: string;
  },
  expectedRequestId: string,
): void {
  let proofRequestUrl: URL;
  try {
    proofRequestUrl = new URL(link.proofRequestUrl);
  } catch {
    throw new CivicCredentialError(
      'INVALID_CREDENTIAL_CLAIMS',
      'The Rarimo verification link is invalid',
    );
  }
  if (
    link.requestId !== expectedRequestId ||
    !link.userIdHash.trim() ||
    proofRequestUrl.protocol !== 'https:'
  ) {
    throw new CivicCredentialError(
      'INVALID_CREDENTIAL_CLAIMS',
      'The Rarimo verification link was not bound to the enrollment request',
    );
  }
}

function validateEvidenceBinding(
  record: RarimoEnrollmentRecord,
  evidence: RarimoVerifiedEvidence,
): void {
  if (
    evidence.requestId !== record.requestId ||
    evidence.userIdHash !== record.userIdHash ||
    evidence.eventId !== record.request.eventId ||
    evidence.eventDataDecimal !== record.request.eventDataDecimal ||
    evidence.selector !== record.request.selector ||
    evidence.timestampUpperBound !== record.request.timestampUpperBound ||
    evidence.identityCounterUpperBound !== record.request.identityCounterUpperBound ||
    evidence.birthDateUpperBound !== hexToDecimal(record.request.birthDateUpperBound) ||
    evidence.expirationDateLowerBound !== hexToDecimal(record.request.expirationDateLowerBound) ||
    !evidence.evidenceAuthorization.trim() ||
    !/^[0-9a-f]{64}$/u.test(evidence.evidenceFingerprint)
  ) {
    throw new CivicCredentialError(
      'INVALID_CREDENTIAL_CLAIMS',
      'The verified Rarimo evidence was not bound to this enrollment request',
    );
  }
  if (
    record.request.birthDateUpperBound !== DEFAULT_DATE_HEX &&
    !evidence.adultPredicateSatisfied
  ) {
    throw new CivicCredentialError(
      'INVALID_CREDENTIAL_CLAIMS',
      'The verified evidence did not satisfy the requested adult predicate',
    );
  }
}

function deriveClaims(
  evidence: RarimoVerifiedEvidence,
  mapper: RarimoCountryMapper,
  record: RarimoEnrollmentRecord,
): RarimoDerivedClaims {
  const country = mapper.fromAlpha3(evidence.citizenshipAlpha3);
  if (!country) {
    throw new CivicCredentialError(
      'INVALID_CREDENTIAL_CLAIMS',
      'The Rarimo citizenship code is not in the configured country catalogue',
    );
  }

  // Country policy is checked against the verified proof, never against the
  // Passport profile or the requester's UI selection.
  const policyCountryCodes = record.request.citizenshipMask;
  if (policyCountryCodes) {
    const requested = mapper.fromAlpha3(policyCountryCodes);
    if (requested && requested !== country) {
      throw new CivicCredentialError(
        'INVALID_CREDENTIAL_CLAIMS',
        'The verified citizenship does not satisfy the enrollment policy',
      );
    }
  }

  const allowedCountries = record.policy?.allowedCountries;
  if (allowedCountries && !allowedCountries.includes(country)) {
    throw new CivicCredentialError(
      'INVALID_CREDENTIAL_CLAIMS',
      'The verified citizenship does not satisfy the enrollment policy',
    );
  }

  return {
    country,
    ageClass: record.request.birthDateUpperBound === DEFAULT_DATE_HEX ? 'unknown' : '18-plus',
    assurance: RARIMO_ASSURANCE,
  };
}

function failRecord(record: RarimoEnrollmentRecord, now: Date): void {
  record.status = 'failed';
  record.updatedAt = now.toISOString();
  zeroize(record.holderSecret, record.holderBlind, record.holderBinding);
}

function isTerminal(status: EnrollmentStatus): boolean {
  return status === 'issued' || status === 'failed' || status === 'expired' || status === 'revoked';
}

function toStatusSnapshot(
  record: RarimoEnrollmentRecord,
  errorCode?: EnrollmentStatusSnapshot['errorCode'],
): EnrollmentStatusSnapshot {
  return {
    enrollmentId: record.enrollmentId,
    status: record.status,
    updatedAt: record.updatedAt,
    ...(errorCode ? { errorCode } : {}),
  };
}

function ageThresholdDate(now: Date, age: number): Date {
  const threshold = new Date(now);
  threshold.setUTCFullYear(threshold.getUTCFullYear() - age);
  return threshold;
}

function asciiDateHex(date: Date): string {
  const yy = String(date.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const value = `${yy}${mm}${dd}`;
  let hex = '';
  for (const character of value) hex += character.charCodeAt(0).toString(16).padStart(2, '0');
  return `0x${hex}`;
}

function hexToDecimal(value: string): string {
  return BigInt(value).toString(10);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return BigInt(`0x${hex}`);
}

function bytesToPositiveFieldDecimal(bytes: Uint8Array): string {
  const masked = new Uint8Array(bytes);
  masked[0] &= 0x3f;
  const value = bytesToBigInt(masked);
  return (value === 0n ? 1n : value).toString(10);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

function secureRandomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function zeroize(...values: Uint8Array[]): void {
  for (const value of values) value.fill(0);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
