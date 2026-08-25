import type {
  CanonicalReceipt,
  CastVoteRequest,
  CivicActionAuthorization,
  CivicCredentialClaims,
  CredentialEnrollment,
  CredentialEnrollmentRequest,
  CredentialSummary,
  EnrollmentStatusSnapshot,
  PassportCapability,
  PassportCapabilityGrant,
  PassportSession,
  PassportSessionRequest,
  PublicCohortRequest,
} from './types.js';

export interface CivicCredentialIssuanceRequest {
  readonly enrollmentId: string;
  readonly provider: 'rarimo' | 'passport-native';
  /** Opaque, single-use backend authorization; never a raw proof or passport value. */
  readonly evidenceAuthorization: string;
  readonly holderBinding: Uint8Array;
  readonly claims: CivicCredentialClaims;
}

export interface CivicCredentialIssuanceResult {
  readonly issuanceId: string;
  readonly credentialBlind: Uint8Array;
  readonly credentialLeaf: Uint8Array;
  readonly receipt: CanonicalReceipt;
}

/** Restricted CICO issuer boundary; implementations submit CredentialRegistryV1.addCredential. */
export interface CivicCredentialIssuerPort {
  readonly adapterName: string;
  issueCredential(request: CivicCredentialIssuanceRequest): Promise<CivicCredentialIssuanceResult>;
}

/**
 * Browser-owned opening of an issued civic credential. Implementations must
 * return defensive copies and must never serialize this material to an HTTP
 * action service, telemetry, logs, or a public receipt.
 */
export interface CivicCredentialPrivateMaterial {
  readonly voterSecret: Uint8Array;
  readonly holderBlind: Uint8Array;
  readonly holderBinding: Uint8Array;
  readonly credentialBlind: Uint8Array;
  readonly credentialLeaf: Uint8Array;
  readonly claims: CivicCredentialClaims;
}

/** Private browser bridge between credential enrollment and Compact witnesses. */
export interface CivicCredentialPrivateStatePort {
  getPrivateCredentialMaterial(): Promise<CivicCredentialPrivateMaterial | null>;
}

/**
 * Durable boundary for Midnight Passport connection, consent, and scoped
 * capabilities. This port does not attest nationality, age, uniqueness, or
 * eligibility.
 */
export interface PassportSessionPort {
  readonly adapterName: string;
  readonly supportedCapabilities: readonly PassportCapability[];
  connect(request: PassportSessionRequest): Promise<PassportSession>;
  getSession(): Promise<PassportSession | null>;
  requestCapability(capability: PassportCapability): Promise<PassportCapabilityGrant>;
  disconnect(): Promise<void>;
}

/**
 * Durable boundary for credential enrollment. Implementations may be a
 * synthetic fixture, Rarimo-backed issuer bridge, or future Passport-native
 * verifier. The UI only consumes these provider-neutral values.
 */
export interface CivicCredentialPort {
  readonly adapterName: string;
  beginEnrollment(request: CredentialEnrollmentRequest): Promise<CredentialEnrollment>;
  getEnrollmentStatus(enrollmentId: string): Promise<EnrollmentStatusSnapshot>;
  getCredentialSummary(): Promise<CredentialSummary | null>;
  /** Opaque issued-credential handle; never Compact private state or provider proof data. */
  getActionAuthorization(): Promise<CivicActionAuthorization | null>;
  clearCredential(): Promise<void>;
}

/**
 * Durable boundary for citizen actions. Providers return a canonical receipt
 * only after the Midnight indexer confirms the transaction.
 */
export interface CivicActionPort {
  readonly adapterName: string;
  castVote(request: CastVoteRequest): Promise<CanonicalReceipt>;
  recordPublicCohort(request: PublicCohortRequest): Promise<CanonicalReceipt>;
  getCanonicalReceipt(transactionId: string): Promise<CanonicalReceipt | null>;
}
