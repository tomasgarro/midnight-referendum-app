import type { IsoNumericCountry } from './types.js';

/**
 * Rarimo's transport status values. These values never cross the
 * provider-neutral Passport domain boundary.
 */
export type RarimoVerificationStatus =
  | 'not_verified'
  | 'verified'
  | 'failed_verification'
  | 'uniqueness_check_failed';

export const RARIMO_GLOBAL_PUBLIC_SIGNAL_COUNT = 23;

/** The JSON shape accepted by verificator-svc's callback endpoint. */
export interface RarimoProofData {
  readonly pi_a: readonly string[];
  readonly pi_b: readonly (readonly string[])[];
  readonly pi_c: readonly string[];
  readonly protocol: 'groth16';
}

/** The JSON shape returned by the Rarimo proof endpoint. */
export interface RarimoProofEnvelope {
  readonly proof: RarimoProofData;
  readonly pub_signals: readonly string[];
}

/**
 * A gateway must bind the response to the request it fetched. The upstream
 * API returns the proof body without a trusted request identifier, so the
 * gateway implementation supplies these values from its request context.
 */
export interface RarimoVerifiedProof {
  readonly requestId: string;
  readonly userIdHash: string;
  readonly proof: RarimoProofEnvelope;
}

/**
 * Minimal result returned by CICO's trusted backend after it has verified the
 * raw proof and every request-bound public signal. Raw proofs never cross this
 * boundary into the browser credential adapter.
 */
export interface RarimoVerifiedEvidence {
  readonly requestId: string;
  readonly userIdHash: string;
  readonly evidenceAuthorization: string;
  readonly evidenceFingerprint: string;
  readonly eventId: string;
  readonly eventDataDecimal: string;
  readonly selector: string;
  readonly timestampUpperBound: string;
  readonly identityCounterUpperBound: string;
  readonly birthDateUpperBound: string;
  readonly expirationDateLowerBound: string;
  readonly citizenshipAlpha3: string;
  readonly adultPredicateSatisfied: boolean;
}

/**
 * Advanced proof parameters sent to the injected gateway. `eventData` is a
 * fresh opaque hex value; `eventDataDecimal` is the exact decimal signal the
 * Rarimo verifier emits for the same bytes.
 */
export interface RarimoVerificationRequest {
  readonly requestId: string;
  readonly eventId: string;
  readonly eventData: `0x${string}`;
  readonly eventDataDecimal: string;
  readonly selector: string;
  readonly citizenshipMask?: string;
  readonly birthDateLowerBound: string;
  readonly birthDateUpperBound: string;
  readonly identityCounterLowerBound: string;
  readonly identityCounterUpperBound: string;
  readonly expirationDateLowerBound: string;
  readonly expirationDateUpperBound: string;
  readonly timestampLowerBound: string;
  readonly timestampUpperBound: string;
}

export interface RarimoVerificationLink {
  readonly requestId: string;
  readonly userIdHash: string;
  readonly proofParamsUrl: string;
  readonly proofRequestUrl: string;
}

/**
 * No implementation may perform network I/O implicitly. Production code can
 * inject an HTTP gateway later; Preview and tests inject a deterministic fake.
 */
export interface RarimoVerificationGateway {
  createVerificationRequest(request: RarimoVerificationRequest): Promise<RarimoVerificationLink>;
  getVerificationStatus(requestId: string): Promise<RarimoVerificationStatus>;
  getVerifiedEvidence(requestId: string): Promise<RarimoVerifiedEvidence | null>;
  deleteVerification(requestId: string): Promise<void>;
}

/**
 * Rarimo emits ISO 3166 alpha-3 MRZ values while CICO uses numeric codes.
 * The catalogue is deliberately injected so this adapter cannot silently
 * ship an incomplete country table.
 */
export interface RarimoCountryMapper {
  fromAlpha3(alpha3: string): IsoNumericCountry | undefined;
  toAlpha3(country: IsoNumericCountry): string | undefined;
}

/** Public signal indexes for Rarimo's global passport query circuit. */
export const RARIMO_GLOBAL_SIGNAL_INDEX = {
  nullifier: 0,
  birthDate: 1,
  expirationDate: 2,
  citizenship: 6,
  eventId: 9,
  eventData: 10,
  idStateRoot: 11,
  selector: 12,
  currentDate: 13,
  timestampUpperBound: 15,
  identityCounterUpperBound: 17,
  birthDateUpperBound: 19,
  expirationDateLowerBound: 20,
} as const;

/** Provider-independent result of the narrow proof checks performed here. */
export interface RarimoDerivedClaims {
  readonly country: IsoNumericCountry;
  readonly ageClass: 'unknown' | '18-plus';
  readonly assurance: 'document-nfc';
}
