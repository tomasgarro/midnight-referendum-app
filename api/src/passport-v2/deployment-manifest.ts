import { deriveRegistryContractBinding } from './crypto.js';
import type { CanonicalReceipt } from './types.js';

/** Versioned public output of the v2 operator command. */
export const PASSPORT_V2_MANIFEST_KIND = 'midnight-passport-v2-runtime' as const;
export const PASSPORT_V2_MANIFEST_VERSION = 1 as const;

export type PassportV2ManifestNetwork = 'undeployed' | 'preview';
export type PassportV2ManifestStatus = 'in-progress' | 'complete';

export type PassportV2DeploymentStepId =
  | 'registry.deploy'
  | 'registry.issue'
  | 'registry.freeze'
  | 'referendum.deploy'
  | 'lifecycle.cast'
  | 'lifecycle.replay-rejected'
  | 'lifecycle.close'
  | 'lifecycle.reveal'
  | 'lifecycle.finalize';

export interface PassportV2DeploymentStep {
  readonly id: PassportV2DeploymentStepId;
  readonly status: 'confirmed' | 'reconciled' | 'rejected';
  readonly completedAt: string;
  /** Omitted when a restart reconciled state without the original receipt. */
  readonly receipt?: CanonicalReceipt;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

export interface PassportV2ManifestRuntime {
  /** HTTP origin of the CICO service, not a credential or proof endpoint. */
  readonly apiUrl: string;
  readonly credentialTtlMs: number;
  readonly uniquenessTimestampUpperBoundUnixSeconds: string;
}

/** Public build/runtime identity needed to reproduce the generated assets. */
export interface PassportV2ManifestArtifacts {
  readonly compactLanguageVersion: string;
  readonly compactCompilerVersion: string;
  readonly compactRuntimeVersion: string;
  readonly midnightJsVersion: string;
  readonly ledgerVersion: string;
  readonly onchainRuntimeVersion: string;
  readonly registryArtifact: string;
  readonly referendumArtifact: string;
}

/** Public infrastructure origins; credentials and query-string secrets are forbidden. */
export interface PassportV2ManifestEndpoints {
  readonly nodeRpc: string | null;
  readonly indexerHttp: string | null;
  readonly indexerWs: string | null;
  readonly proofServer: string | null;
  readonly relay: string | null;
  readonly explorer: string | null;
}

export interface PassportV2ManifestObservation {
  readonly stage: PassportV2DeploymentStepId;
  readonly observedAt: string;
  readonly indexer: {
    readonly available: boolean;
    readonly source: string | null;
  };
  readonly registry?: {
    readonly contractAddress: string;
    readonly currentRootField: string;
    readonly frozenRootField: string;
    readonly credentialCount: string;
    readonly frozen: boolean;
  };
  readonly referendum?: {
    readonly contractAddress: string;
    readonly phase: 'COMMIT' | 'REVEAL' | 'FINALIZED';
    readonly closed: boolean;
    readonly issuedVotes: string;
    readonly tally: Readonly<Record<'YES' | 'NO' | 'ABSTAIN', string>>;
  };
  readonly note?: string;
}

/** Public DUST accounting around the operator run; no wallet material is stored. */
export interface PassportV2ManifestDust {
  readonly before: string | null;
  readonly after: string | null;
  readonly spent: string | null;
  readonly accounted: boolean;
}

export interface PassportV2ManifestRegistry {
  readonly contractAddress: string | null;
  readonly registryContractBindingHex: string | null;
  readonly registryIdHex: string;
  readonly issuerId: string;
  readonly issuerIdHex: string;
  readonly credentialEpoch: string;
  readonly currentRootField: string | null;
  readonly frozenRootField: string | null;
  readonly credentialCount: string | null;
  readonly frozen: boolean;
}

/** Public referendum constructor data; no organizer secret is persisted. */
export interface PassportV2ManifestReferendum {
  readonly referendumId: string;
  readonly contractAddress: string | null;
  readonly registryContractBindingHex: string | null;
  readonly eventIdHex: string;
  readonly organizerKeyHex: string;
  readonly countryPolicy: string | null;
  readonly minimumAssurance: string;
  readonly requireAdult: boolean;
  readonly validityReference: string;
  readonly title: string;
  readonly question: string;
  readonly description?: string;
}

export interface PassportV2DeploymentManifest {
  readonly kind: typeof PASSPORT_V2_MANIFEST_KIND;
  readonly version: typeof PASSPORT_V2_MANIFEST_VERSION;
  readonly status: PassportV2ManifestStatus;
  readonly network: PassportV2ManifestNetwork;
  /** Midnight SDK network identifier (`undeployed` or `preview`). */
  readonly networkId: PassportV2ManifestNetwork;
  readonly generatedAt: string;
  readonly runtime: PassportV2ManifestRuntime;
  readonly artifacts: PassportV2ManifestArtifacts;
  readonly endpoints: PassportV2ManifestEndpoints;
  readonly dust: PassportV2ManifestDust;
  readonly registry: PassportV2ManifestRegistry;
  readonly referenda: readonly PassportV2ManifestReferendum[];
  readonly transcript: {
    readonly steps: readonly PassportV2DeploymentStep[];
    readonly observations: readonly PassportV2ManifestObservation[];
  };
}

/**
 * Serializes only the public deployment journal. BigInt values must already
 * be represented as decimal strings in the manifest schema.
 */
export function serializePassportV2DeploymentManifest(
  manifest: PassportV2DeploymentManifest,
): string {
  validatePassportV2DeploymentManifest(manifest);
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Performs the boundary checks needed before a manifest is consumed by a
 * runtime. The operator may persist an in-progress journal, but runtime
 * configuration is only generated from a complete manifest.
 */
export function validatePassportV2DeploymentManifest(manifest: PassportV2DeploymentManifest): void {
  if (manifest.kind !== PASSPORT_V2_MANIFEST_KIND) {
    throw new TypeError('Unsupported Passport v2 deployment manifest kind');
  }
  if (manifest.version !== PASSPORT_V2_MANIFEST_VERSION) {
    throw new TypeError('Unsupported Passport v2 deployment manifest version');
  }
  if (manifest.network !== manifest.networkId) {
    throw new TypeError('Manifest network and networkId must match');
  }
  if (!manifest.generatedAt || !manifest.runtime.apiUrl) {
    throw new TypeError('Manifest runtime metadata is incomplete');
  }
  assertPublicArtifacts(manifest.artifacts);
  assertPublicEndpoints(manifest.endpoints);
  assertDust(manifest.dust);
  assertHex32(manifest.registry.registryIdHex, 'registryIdHex');
  assertHex32(manifest.registry.issuerIdHex, 'issuerIdHex');
  if (manifest.registry.registryContractBindingHex !== null) {
    assertHex32(manifest.registry.registryContractBindingHex, 'registryContractBindingHex');
    if (manifest.registry.contractAddress !== null) {
      const expected = toHex(deriveRegistryContractBinding(manifest.registry.contractAddress));
      if (stripHexPrefix(manifest.registry.registryContractBindingHex) !== expected) {
        throw new TypeError('Manifest registry contract binding does not match its address');
      }
    }
  }
  if (!manifest.registry.issuerId.trim()) throw new TypeError('Manifest issuerId is required');
  assertDecimal(manifest.registry.credentialEpoch, 'credentialEpoch');
  if (!Array.isArray(manifest.referenda) || manifest.referenda.length === 0) {
    throw new TypeError('Manifest must contain at least one referendum');
  }
  const ids = new Set<string>();
  for (const referendum of manifest.referenda) {
    if (!referendum.referendumId.trim() || ids.has(referendum.referendumId)) {
      throw new TypeError('Manifest referendum IDs must be non-empty and unique');
    }
    ids.add(referendum.referendumId);
    assertHex32(referendum.eventIdHex, `${referendum.referendumId} eventIdHex`);
    assertHex32(referendum.organizerKeyHex, `${referendum.referendumId} organizerKeyHex`);
    if (referendum.registryContractBindingHex !== null) {
      assertHex32(
        referendum.registryContractBindingHex,
        `${referendum.referendumId} registryContractBindingHex`,
      );
      if (
        manifest.registry.registryContractBindingHex !== null &&
        stripHexPrefix(referendum.registryContractBindingHex) !==
          stripHexPrefix(manifest.registry.registryContractBindingHex)
      ) {
        throw new TypeError(
          `Manifest referendum ${referendum.referendumId} registry binding does not match the registry`,
        );
      }
    }
    assertDecimal(referendum.minimumAssurance, `${referendum.referendumId} minimumAssurance`);
    assertDecimal(referendum.validityReference, `${referendum.referendumId} validityReference`);
    if (!referendum.title.trim() || !referendum.question.trim()) {
      throw new TypeError(
        `Manifest referendum ${referendum.referendumId} needs title and question`,
      );
    }
  }
  for (const observation of manifest.transcript.observations) {
    if (!observation.observedAt || !observation.stage) {
      throw new TypeError('Manifest observations need a stage and timestamp');
    }
    if (observation.indexer.source !== null)
      assertPublicUrl(observation.indexer.source, 'indexer source');
    if (observation.registry) {
      assertHex32(observation.registry.contractAddress, `${observation.stage} registry address`);
      assertDecimal(observation.registry.currentRootField, `${observation.stage} currentRootField`);
      assertDecimal(observation.registry.frozenRootField, `${observation.stage} frozenRootField`);
      assertDecimal(observation.registry.credentialCount, `${observation.stage} credentialCount`);
    }
    if (observation.referendum) {
      assertHex32(
        observation.referendum.contractAddress,
        `${observation.stage} referendum address`,
      );
      assertDecimal(observation.referendum.issuedVotes, `${observation.stage} issuedVotes`);
      for (const choice of ['YES', 'NO', 'ABSTAIN'] as const) {
        assertDecimal(observation.referendum.tally[choice], `${observation.stage} ${choice} tally`);
      }
    }
  }
  if (manifest.status === 'complete') {
    assertCompletePassportV2DeploymentManifest(manifest);
  }
}

/** Ensures all address/root fields required by a runtime are present. */
export function assertCompletePassportV2DeploymentManifest(
  manifest: PassportV2DeploymentManifest,
): asserts manifest is PassportV2DeploymentManifest & {
  readonly status: 'complete';
  readonly registry: PassportV2ManifestRegistry & {
    readonly contractAddress: string;
    readonly registryContractBindingHex: string;
    readonly currentRootField: string;
    readonly frozenRootField: string;
    readonly credentialCount: string;
    readonly frozen: true;
  };
  readonly referenda: readonly (PassportV2ManifestReferendum & {
    readonly contractAddress: string;
    readonly registryContractBindingHex: string;
  })[];
} {
  if (manifest.status !== 'complete') {
    throw new Error('Passport v2 deployment manifest is not complete');
  }
  const registry = manifest.registry;
  if (
    !registry.contractAddress ||
    !registry.registryContractBindingHex ||
    !registry.currentRootField ||
    !registry.frozenRootField ||
    !registry.credentialCount ||
    !registry.frozen
  ) {
    throw new Error('Complete manifest is missing a frozen registry snapshot');
  }
  assertDecimal(registry.currentRootField, 'currentRootField');
  assertDecimal(registry.frozenRootField, 'frozenRootField');
  assertDecimal(registry.credentialCount, 'credentialCount');
  assertHex32(registry.registryContractBindingHex, 'registryContractBindingHex');
  for (const referendum of manifest.referenda) {
    if (!referendum.contractAddress) {
      throw new Error(`Complete manifest is missing ${referendum.referendumId} address`);
    }
    if (!referendum.registryContractBindingHex) {
      throw new Error(`Complete manifest is missing ${referendum.referendumId} registry binding`);
    }
    assertHex32(
      referendum.registryContractBindingHex,
      `${referendum.referendumId} registryContractBindingHex`,
    );
  }
  if (
    manifest.transcript.steps.length < 9 ||
    ![
      'registry.deploy',
      'registry.issue',
      'registry.freeze',
      'referendum.deploy',
      'lifecycle.cast',
      'lifecycle.replay-rejected',
      'lifecycle.close',
      'lifecycle.reveal',
      'lifecycle.finalize',
    ].every((id) => manifest.transcript.steps.some((step) => step.id === id))
  ) {
    throw new Error('Complete manifest is missing deployment or lifecycle transcript steps');
  }
  if (manifest.transcript.observations.length < 5) {
    throw new Error('Complete manifest is missing canonical indexer observations');
  }
  if (
    manifest.endpoints.nodeRpc === null ||
    manifest.endpoints.indexerHttp === null ||
    manifest.endpoints.indexerWs === null ||
    manifest.endpoints.proofServer === null ||
    manifest.endpoints.relay === null
  ) {
    throw new Error('Complete manifest is missing public infrastructure endpoints');
  }
  if (
    manifest.dust.before === null ||
    manifest.dust.after === null ||
    manifest.dust.spent === null ||
    !manifest.dust.accounted
  ) {
    throw new Error('Complete manifest is missing DUST accounting');
  }
}

function assertPublicArtifacts(artifacts: PassportV2ManifestArtifacts): void {
  for (const [key, value] of Object.entries(artifacts)) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new TypeError(`Manifest artifact ${key} is required`);
    }
  }
}

function assertPublicEndpoints(endpoints: PassportV2ManifestEndpoints): void {
  for (const [key, value] of Object.entries(endpoints)) {
    if (value !== null) assertPublicUrl(value, `endpoint ${key}`);
  }
}

function assertPublicUrl(value: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${label} must be an absolute public URL`);
  }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
    throw new TypeError(`${label} uses an unsupported URL protocol`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new TypeError(`${label} must not contain credentials, query strings, or fragments`);
  }
}

function assertDust(dust: PassportV2ManifestDust): void {
  for (const [key, value] of Object.entries(dust)) {
    if (key === 'accounted') continue;
    if (value !== null) assertDecimal(value, `dust.${key}`);
  }
  if (dust.before !== null && dust.after !== null && dust.spent !== null) {
    const before = BigInt(dust.before);
    const after = BigInt(dust.after);
    const spent = BigInt(dust.spent);
    if (after > before || before - after !== spent) {
      throw new TypeError('DUST accounting must satisfy before - after = spent');
    }
  }
}

/**
 * Converts a complete manifest into the public Vite environment shape already
 * consumed by the Passport v2 runtime parser. No private fixture material is
 * included in this projection.
 */
export function passportV2ManifestRuntimeEnvironment(
  manifest: PassportV2DeploymentManifest,
): Readonly<Record<string, string>> {
  assertCompletePassportV2DeploymentManifest(manifest);
  return {
    VITE_PASSPORT_V2_API_URL: manifest.runtime.apiUrl,
    VITE_MIDNIGHT_NETWORK: manifest.network,
    VITE_CICO_ISSUER_ID: manifest.registry.issuerId,
    VITE_CICO_CREDENTIAL_EPOCH: manifest.registry.credentialEpoch,
    VITE_CICO_CREDENTIAL_TTL_MS: String(manifest.runtime.credentialTtlMs),
    VITE_RARIMO_UNIQUENESS_TIMESTAMP_UPPER_BOUND:
      manifest.runtime.uniquenessTimestampUpperBoundUnixSeconds,
    VITE_CICO_REGISTRY_ADDRESS: manifest.registry.contractAddress,
    VITE_CICO_REGISTRY_CONTRACT_BINDING_HEX: manifest.registry.registryContractBindingHex,
    VITE_CICO_REGISTRY_ID_HEX: manifest.registry.registryIdHex,
    VITE_CICO_ISSUER_ID_HEX: manifest.registry.issuerIdHex,
    VITE_CICO_FROZEN_ROOT_FIELD: manifest.registry.frozenRootField,
    VITE_CICO_REFERENDA_JSON: JSON.stringify(
      manifest.referenda.map((referendum) => ({
        referendumId: referendum.referendumId,
        contractAddress: referendum.contractAddress,
        registryContractBindingHex: referendum.registryContractBindingHex,
        eventIdHex: referendum.eventIdHex,
        organizerKeyHex: referendum.organizerKeyHex,
        countryPolicy: referendum.countryPolicy,
        minimumAssurance: referendum.minimumAssurance,
        requireAdult: referendum.requireAdult,
        validityReference: referendum.validityReference,
        title: referendum.title,
        question: referendum.question,
        ...(referendum.description ? { description: referendum.description } : {}),
      })),
    ),
  };
}

function assertHex32(value: string, label: string): void {
  if (!/^(?:0x)?[0-9a-f]{64}$/iu.test(value)) {
    throw new TypeError(`${label} must be 32-byte hexadecimal data`);
  }
}

function assertDecimal(value: string, label: string): void {
  if (!/^[0-9]+$/u.test(value)) throw new TypeError(`${label} must be an unsigned decimal string`);
}

function stripHexPrefix(value: string): string {
  return value.replace(/^0x/u, '').toLowerCase();
}

function toHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
