import { sha256 } from '@noble/hashes/sha256.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { sanitizeCanonicalReceipt } from '../receipts/canonical.js';
import { deriveRegistryContractBinding } from './crypto.js';
import type { CanonicalReceipt } from './types.js';

/** Versioned public output of the v2 operator command. */
export const PASSPORT_V2_MANIFEST_KIND = 'midnight-passport-v2-runtime' as const;
/**
 * Version 3 describes the open-enrollment model: the credential registry
 * stays open while a referendum runs, and later registry roots are admitted
 * into the referendum by publishing them on-chain rather than by freezing
 * the registry before deployment. Version 2 journals encoded the older
 * freeze-before-deploy model and are not complete under this validator.
 */
export const PASSPORT_V2_MANIFEST_VERSION = 3 as const;

export type PassportV2ManifestNetwork = 'undeployed' | 'preview';
export type PassportV2ManifestStatus = 'in-progress' | 'complete';

/**
 * `'frozen'` is the legacy model: the registry is frozen before the
 * referendum is deployed and its root is pinned for the referendum's
 * lifetime. `'open'` is the current model: enrollment stays open while
 * voting runs, and new voters are admitted by publishing later registry
 * roots to the referendum (see `PassportV2ManifestReferendum.acceptedRoots`).
 */
export type PassportV2ManifestEnrollmentModel = 'open' | 'frozen';

export type PassportV2DeploymentStepId =
  | 'registry.deploy'
  | 'registry.issue'
  | 'registry.freeze'
  | 'registry.attest'
  | 'referendum.deploy'
  | 'referendum.publish-root'
  | 'referendum.revoke-root'
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
  /**
   * Required on a confirmed/reconciled `referendum.publish-root` step. The
   * contract has no cross-contract calls, so it cannot itself verify that an
   * admitted root came from the credential registry; the manifest instead
   * requires that every published root was also attested on the registry via
   * `attestCurrentRoot`, whose assertion is permanent on-chain proof of
   * provenance.
   *
   * The two calls target different contracts and therefore CANNOT share a
   * transaction, so this must be a DIFFERENT transaction ID from the publish
   * step's own `receipt.transactionId` — a value equal to it is rejected as a
   * fabricated record. Provenance comes from the attestation existing and
   * succeeding, not from atomicity.
   */
  readonly attestationTransactionId?: string;
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
  /** SHA-256 hashes of the public generated artifact trees. */
  readonly hashes?: Readonly<Record<string, string>>;
}

export interface PassportV2ManifestSource {
  readonly commit: string;
  readonly tree: string;
}

export interface PassportV2ManifestServiceVersion {
  readonly version: string;
  readonly hash: string;
}

export interface PassportV2ManifestServices {
  readonly api: PassportV2ManifestServiceVersion;
  readonly relayer: PassportV2ManifestServiceVersion;
  readonly node: PassportV2ManifestServiceVersion;
  readonly indexer: PassportV2ManifestServiceVersion;
  readonly proofServer: PassportV2ManifestServiceVersion;
  readonly lockfile: PassportV2ManifestServiceVersion;
}

/** Digest-only evidence linking the citizen cast to the atomic relay. */
export interface PassportV2ManifestActionEvidence {
  readonly actionId: string;
  readonly actionIdDigest: string;
  readonly idempotencyKeyDigest: string;
  readonly requestHash: string;
  readonly txDigest: string;
  readonly capabilityDigest: string;
  readonly transactionId: string;
  readonly status: 'confirmed';
}

export interface PassportV2ManifestRelayEvidence {
  readonly submissionTransport: 'v2-actions';
  readonly durableStore: 'postgresql';
  readonly legacyApiEnabled: false;
  readonly states: readonly string[];
  readonly accepted: boolean;
  readonly duplicateResolved: boolean;
  readonly concurrentIdempotent: boolean;
  readonly restartRecovered: boolean;
}

export interface PassportV2ManifestLifecycleEvidence {
  readonly castTransactionId: string;
  readonly closeTransactionId: string;
  readonly revealTransactionId: string;
  readonly finalizeTransactionId: string;
  readonly replayRejected: boolean;
  readonly finalized: boolean;
  readonly indexerObservations: number;
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
  readonly transactionId?: string;
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
  /** Wall-clock instants when the public wallet states were sampled. */
  readonly beforeObservedAt: string | null;
  readonly afterObservedAt: string | null;
  /** Shared valuation instant, because DUST continues to accrue over time. */
  readonly valuationAt: string | null;
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
  /** Discriminates the legacy freeze-before-deploy model from open enrollment. */
  readonly enrollmentModel: PassportV2ManifestEnrollmentModel;
}

/** Public referendum constructor data; no organizer secret is persisted. */
export interface PassportV2ManifestReferendum {
  readonly referendumId: string;
  readonly contractAddress: string | null;
  readonly registryContractBindingHex: string | null;
  /**
   * The credential registry contract's address, recorded directly (not only
   * as the `registryContractBindingHex` hash). An auditor confirming that a
   * `registry.attest` transaction targeted the real registry — and not an
   * attacker-deployed look-alike populated with fabricated credentials —
   * needs an on-chain-checkable address, not a hash whose preimage format
   * lives off-chain.
   */
  readonly registryContractAddress: string | null;
  readonly eventIdHex: string;
  readonly organizerKeyHex: string;
  /**
   * Public key authorized to publish/revoke registry roots on this
   * referendum. The contract enforces that this differs from
   * `organizerKeyHex`; the manifest enforces the same separation.
   */
  readonly rootPublisherKeyHex: string;
  /** The accepted registry root at deployment time, as a decimal string. */
  readonly initialRootField: string;
  /**
   * Every registry root this referendum has ever accepted, including
   * `initialRootField`. Roots other than `initialRootField` must each be
   * backed by a `referendum.publish-root` transcript step that references a
   * separate `registry.attest` transaction. The two calls target different
   * contracts and so cannot share a transaction; provenance comes from the
   * attestation existing at all, not from atomicity.
   */
  readonly acceptedRoots: readonly string[];
  readonly opensAtUnix: string;
  readonly enrollmentClosesAtUnix: string;
  readonly closesAtUnix: string;
  /**
   * End of the reveal window. Enforced on-chain: finalizeVote is permissionless
   * and refuses to run before it, so the organizer cannot stop the count early
   * while watching the public tally. Recorded here so a resumed deployment
   * detects a changed value instead of silently rebinding the referendum.
   */
  readonly revealClosesAtUnix: string;
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
  readonly source?: PassportV2ManifestSource;
  readonly services?: PassportV2ManifestServices;
  readonly runtime: PassportV2ManifestRuntime;
  readonly artifacts: PassportV2ManifestArtifacts;
  readonly endpoints: PassportV2ManifestEndpoints;
  readonly dust: PassportV2ManifestDust;
  readonly submissionTransport?: 'legacy' | 'v2-actions';
  readonly action?: PassportV2ManifestActionEvidence;
  readonly relay?: PassportV2ManifestRelayEvidence;
  readonly lifecycle?: PassportV2ManifestLifecycleEvidence;
  /** SHA-256 digest over the canonical manifest with this field omitted. */
  readonly manifestDigest?: string;
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
  assertNoPrivateManifestFields(manifest);
  if (manifest.kind !== PASSPORT_V2_MANIFEST_KIND) {
    throw new TypeError('Unsupported Passport v2 deployment manifest kind');
  }
  if (manifest.version !== PASSPORT_V2_MANIFEST_VERSION) {
    throw new TypeError('Unsupported Passport v2 deployment manifest version');
  }
  if (manifest.network !== manifest.networkId) {
    throw new TypeError('Manifest network and networkId must match');
  }
  if (
    typeof manifest.generatedAt !== 'string' ||
    !manifest.generatedAt.trim() ||
    !manifest.runtime ||
    typeof manifest.runtime.apiUrl !== 'string' ||
    !manifest.runtime.apiUrl.trim()
  ) {
    throw new TypeError('Manifest runtime metadata is incomplete');
  }
  assertRuntimeApiUrl(manifest.runtime.apiUrl, manifest.network);
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
  if (
    manifest.registry.enrollmentModel !== 'open' &&
    manifest.registry.enrollmentModel !== 'frozen'
  ) {
    throw new TypeError('Manifest registry enrollmentModel must be "open" or "frozen"');
  }
  if (manifest.registry.enrollmentModel === 'open') {
    if (manifest.registry.frozen) {
      throw new TypeError('Manifest registry with an open enrollmentModel must not be frozen');
    }
    if (
      manifest.registry.frozenRootField !== null &&
      manifest.registry.frozenRootField !== undefined
    ) {
      throw new TypeError(
        'Manifest registry with an open enrollmentModel must not carry a frozenRootField',
      );
    }
  } else if (!manifest.registry.frozen) {
    throw new TypeError('Manifest registry with a frozen enrollmentModel must be frozen');
  }
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
    assertHex32(referendum.rootPublisherKeyHex, `${referendum.referendumId} rootPublisherKeyHex`);
    if (
      stripHexPrefix(referendum.rootPublisherKeyHex) === stripHexPrefix(referendum.organizerKeyHex)
    ) {
      throw new TypeError(
        `Manifest referendum ${referendum.referendumId} rootPublisherKeyHex must not equal organizerKeyHex`,
      );
    }
    assertDecimal(referendum.initialRootField, `${referendum.referendumId} initialRootField`);
    if (!Array.isArray(referendum.acceptedRoots) || referendum.acceptedRoots.length === 0) {
      throw new TypeError(
        `Manifest referendum ${referendum.referendumId} acceptedRoots must be non-empty`,
      );
    }
    const seenRoots = new Set<string>();
    for (const root of referendum.acceptedRoots) {
      assertDecimal(root, `${referendum.referendumId} acceptedRoots entry`);
      if (seenRoots.has(root)) {
        throw new TypeError(
          `Manifest referendum ${referendum.referendumId} acceptedRoots must not contain duplicates`,
        );
      }
      seenRoots.add(root);
    }
    if (!seenRoots.has(referendum.initialRootField)) {
      throw new TypeError(
        `Manifest referendum ${referendum.referendumId} acceptedRoots must contain initialRootField`,
      );
    }
    assertDecimal(referendum.opensAtUnix, `${referendum.referendumId} opensAtUnix`);
    assertDecimal(
      referendum.enrollmentClosesAtUnix,
      `${referendum.referendumId} enrollmentClosesAtUnix`,
    );
    assertDecimal(referendum.closesAtUnix, `${referendum.referendumId} closesAtUnix`);
    assertDecimal(referendum.revealClosesAtUnix, `${referendum.referendumId} revealClosesAtUnix`);
    if (
      BigInt(referendum.opensAtUnix) > BigInt(referendum.enrollmentClosesAtUnix) ||
      BigInt(referendum.enrollmentClosesAtUnix) > BigInt(referendum.closesAtUnix)
    ) {
      throw new TypeError(
        `Manifest referendum ${referendum.referendumId} schedule must satisfy opensAtUnix <= enrollmentClosesAtUnix <= closesAtUnix`,
      );
    }
    // Strict, mirroring the contract's own constructor asserts. Equal values
    // would deploy happily and then make voting or the reveal impossible
    // forever, on sealed fields.
    if (BigInt(referendum.opensAtUnix) >= BigInt(referendum.closesAtUnix)) {
      throw new TypeError(
        `Manifest referendum ${referendum.referendumId} must satisfy opensAtUnix < closesAtUnix`,
      );
    }
    if (BigInt(referendum.closesAtUnix) >= BigInt(referendum.revealClosesAtUnix)) {
      throw new TypeError(
        `Manifest referendum ${referendum.referendumId} must satisfy closesAtUnix < revealClosesAtUnix`,
      );
    }
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
    if (referendum.registryContractAddress !== null) {
      assertHex32(
        referendum.registryContractAddress,
        `${referendum.referendumId} registryContractAddress`,
      );
      if (
        manifest.registry.contractAddress !== null &&
        stripHexPrefix(referendum.registryContractAddress) !==
          stripHexPrefix(manifest.registry.contractAddress)
      ) {
        throw new TypeError(
          `Manifest referendum ${referendum.referendumId} registryContractAddress does not match the registry`,
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
    if (observation.transactionId !== undefined && !observation.transactionId.trim()) {
      throw new TypeError(`${observation.stage} transactionId must not be empty`);
    }
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

/** A manifest is public evidence; private fixture material must fail closed. */
function assertNoPrivateManifestFields(value: unknown): void {
  const forbidden = new Set([
    'secret',
    'seed',
    'seedphrase',
    'witness',
    'proof',
    'credentialblind',
    'credentialleaf',
    'votersecret',
    'votesalt',
    'capabilitytoken',
    'holdersecret',
    'holderblind',
    'credentialopening',
    'choice',
    'passportprofile',
    'privatestate',
    'rawproof',
  ]);
  const pending: unknown[] = [value];
  while (pending.length > 0) {
    const item = pending.pop();
    if (Array.isArray(item)) {
      pending.push(...item);
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    for (const [key, child] of Object.entries(item)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/gu, '');
      if (forbidden.has(normalizedKey)) {
        throw new TypeError('Manifest contains private fixture material');
      }
      if (child && typeof child === 'object') pending.push(child);
    }
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
    readonly credentialCount: string;
  };
  readonly referenda: readonly (PassportV2ManifestReferendum & {
    readonly contractAddress: string;
    readonly registryContractBindingHex: string;
  })[];
} {
  if (manifest.status !== 'complete') {
    throw new Error('Passport v2 deployment manifest is not complete');
  }
  const source = manifest.source;
  if (!source || !/^[0-9a-f]{40}$/iu.test(source.commit) || !/^[0-9a-f]{40}$/iu.test(source.tree)) {
    throw new Error('Complete manifest is missing the source commit/tree identity');
  }
  const services = manifest.services;
  if (!services) throw new Error('Complete manifest is missing service versions and hashes');
  for (const [name, service] of Object.entries(services)) {
    if (
      !service ||
      typeof service.version !== 'string' ||
      !service.version.trim() ||
      typeof service.hash !== 'string' ||
      !/^[0-9a-f]{64}$/iu.test(service.hash)
    ) {
      throw new Error(`Complete manifest is missing ${name} service version/hash`);
    }
  }
  const artifactHashes = manifest.artifacts.hashes;
  if (!artifactHashes || Object.keys(artifactHashes).length === 0) {
    throw new Error('Complete manifest is missing artifact hashes');
  }
  for (const [name, hash] of Object.entries(artifactHashes)) {
    if (!/^[0-9a-f]{64}$/iu.test(hash)) {
      throw new Error(`Complete manifest artifact hash ${name} is invalid`);
    }
  }
  if (manifest.submissionTransport !== 'v2-actions') {
    throw new Error('Complete manifest must prove submissionTransport=v2-actions');
  }
  const action = manifest.action;
  if (
    !action ||
    typeof action.actionId !== 'string' ||
    !action.actionId.trim() ||
    typeof action.transactionId !== 'string' ||
    !action.transactionId.trim() ||
    action.status !== 'confirmed' ||
    !/^[0-9a-f]{64}$/iu.test(action.actionIdDigest) ||
    !/^[0-9a-f]{64}$/iu.test(action.idempotencyKeyDigest) ||
    !/^[0-9a-f]{64}$/iu.test(action.requestHash) ||
    !/^[0-9a-f]{64}$/iu.test(action.txDigest) ||
    !/^[0-9a-f]{64}$/iu.test(action.capabilityDigest)
  ) {
    throw new Error('Complete manifest is missing atomic action/idempotency evidence');
  }
  const expectedActionIdDigest = bytesToHex(
    sha256(utf8ToBytes(`midnight-referendum:v2-action-id-digest:1:${action.actionId}`)),
  );
  if (action.actionIdDigest !== expectedActionIdDigest) {
    throw new Error('Complete manifest action ID digest does not match its public action ID');
  }
  const relay = manifest.relay;
  const requiredRelayStates = [
    'authorized',
    'validated',
    'dust_reserved',
    'finalized',
    'submitted',
    'indexer_pending',
    'confirmed',
  ];
  if (
    relay?.submissionTransport !== 'v2-actions' ||
    relay?.durableStore !== 'postgresql' ||
    relay?.legacyApiEnabled !== false ||
    !relay?.accepted ||
    !relay?.duplicateResolved ||
    !relay?.concurrentIdempotent ||
    !relay?.restartRecovered ||
    !Array.isArray(relay?.states) ||
    relay?.states.length !== requiredRelayStates.length ||
    !requiredRelayStates.every((state, index) => relay?.states[index] === state)
  ) {
    throw new Error(
      'Complete manifest is missing the exact PostgreSQL relay policy/state/idempotency sequence',
    );
  }
  const registry = manifest.registry;
  if (
    !registry.contractAddress ||
    !registry.registryContractBindingHex ||
    !registry.currentRootField ||
    !registry.credentialCount
  ) {
    throw new Error('Complete manifest is missing a registry snapshot');
  }
  assertDecimal(registry.currentRootField, 'currentRootField');
  assertDecimal(registry.credentialCount, 'credentialCount');
  assertHex32(registry.registryContractBindingHex, 'registryContractBindingHex');
  if (registry.enrollmentModel === 'frozen') {
    if (!registry.frozen || !registry.frozenRootField) {
      throw new Error('Complete manifest is missing a frozen registry snapshot');
    }
    assertDecimal(registry.frozenRootField, 'frozenRootField');
  } else if (registry.frozen || registry.frozenRootField) {
    throw new Error('Complete manifest with an open enrollmentModel must not be frozen');
  }
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
    if (!referendum.registryContractAddress) {
      throw new Error(
        `Complete manifest is missing ${referendum.referendumId} registryContractAddress`,
      );
    }
    assertHex32(
      referendum.registryContractAddress,
      `${referendum.referendumId} registryContractAddress`,
    );
    const contractAddress = referendum.contractAddress;
    const registryContractAddress = referendum.registryContractAddress;
    const nonInitialRoots = referendum.acceptedRoots.filter(
      (root) => root !== referendum.initialRootField,
    );
    for (const root of nonInitialRoots) {
      // The referendum and the registry are different contracts, and Midnight
      // transaction merging requires one side to have no contract calls, so
      // a publish-root call and a registry.attest call can never share a
      // transaction. Provenance instead rests on the attest transaction
      // itself: a confirmed attestCurrentRoot(R) is permanent on-chain proof
      // that R was the registry's current root, because the circuit asserts
      // credentials.checkRoot(R).
      const publishStep = manifest.transcript.steps.find(
        (step) =>
          step.id === 'referendum.publish-root' &&
          (step.status === 'confirmed' || step.status === 'reconciled') &&
          step.receipt?.contractAddress !== undefined &&
          stripHexPrefix(step.receipt.contractAddress) === stripHexPrefix(contractAddress) &&
          step.details?.rootField === root,
      );
      if (!publishStep?.receipt?.transactionId) {
        throw new Error(
          `Complete manifest is missing a referendum.publish-root transcript step for ${referendum.referendumId} root ${root}`,
        );
      }
      if (!publishStep.attestationTransactionId?.trim()) {
        throw new Error(
          `Complete manifest ${referendum.referendumId} publish-root step for root ${root} is missing a registry.attest attestation`,
        );
      }
      if (publishStep.attestationTransactionId === publishStep.receipt.transactionId) {
        throw new Error(
          `Complete manifest ${referendum.referendumId} publish-root step for root ${root} attestation must be a separate registry.attest transaction, not the publish-root transaction itself`,
        );
      }
      const attestStep = manifest.transcript.steps.find(
        (step) =>
          step.id === 'registry.attest' &&
          (step.status === 'confirmed' || step.status === 'reconciled') &&
          step.receipt?.transactionId === publishStep.attestationTransactionId &&
          step.receipt?.contractAddress !== undefined &&
          stripHexPrefix(step.receipt.contractAddress) ===
            stripHexPrefix(registryContractAddress) &&
          step.details?.rootField === root,
      );
      if (!attestStep) {
        throw new Error(
          `Complete manifest ${referendum.referendumId} root ${root} has no matching registry.attest transcript step attesting that root on the registry`,
        );
      }
    }
  }
  const requiredStepIds: readonly PassportV2DeploymentStepId[] = [
    'registry.deploy',
    'registry.issue',
    // A frozen registry must actually record its freeze step; an open
    // registry never freezes, so the step would be a lie if required here.
    ...(registry.enrollmentModel === 'frozen' ? (['registry.freeze'] as const) : []),
    'referendum.deploy',
    'lifecycle.cast',
    'lifecycle.replay-rejected',
    'lifecycle.close',
    'lifecycle.reveal',
    'lifecycle.finalize',
  ];
  if (
    manifest.transcript.steps.length < requiredStepIds.length ||
    !requiredStepIds.every((id) => manifest.transcript.steps.some((step) => step.id === id))
  ) {
    throw new Error('Complete manifest is missing deployment or lifecycle transcript steps');
  }
  if (registry.enrollmentModel === 'open') {
    if (manifest.transcript.steps.some((step) => step.id === 'registry.freeze')) {
      throw new Error(
        'Complete manifest with an open enrollmentModel must not record a registry.freeze step',
      );
    }
  }
  const requiredReceipts = [
    'lifecycle.cast',
    'lifecycle.close',
    'lifecycle.reveal',
    'lifecycle.finalize',
  ] as const;
  // A registry may publish many roots over the life of an open referendum
  // (and attest each one), so `referendum.publish-root`, `registry.attest`,
  // and `referendum.revoke-root` may legitimately repeat. Every other step
  // id describes a one-time deployment or lifecycle milestone and must stay
  // unique.
  const repeatableStepIds = new Set<PassportV2DeploymentStepId>([
    'referendum.publish-root',
    'registry.attest',
    'referendum.revoke-root',
  ]);
  const singletonStepIds = manifest.transcript.steps
    .filter((step) => !repeatableStepIds.has(step.id))
    .map((step) => step.id);
  if (new Set(singletonStepIds).size !== singletonStepIds.length) {
    throw new Error('Complete manifest contains duplicate deployment transcript steps');
  }
  const referendumAddress = manifest.referenda[0]?.contractAddress;
  if (!referendumAddress) {
    throw new Error('Complete manifest is missing the lifecycle referendum address');
  }
  assertHex32(referendumAddress, 'lifecycle referendum address');
  const lifecycleReceipts = new Map<PassportV2DeploymentStepId, CanonicalReceipt>();
  for (const id of requiredReceipts) {
    const step = manifest.transcript.steps.find((candidate) => candidate.id === id);
    if (!step || (step.status !== 'confirmed' && step.status !== 'reconciled')) {
      throw new Error(`Complete manifest is missing ${id} transaction evidence`);
    }
    if (!step.receipt?.transactionId) {
      throw new Error(`Complete manifest is missing ${id} transaction evidence`);
    }
    const expectedCircuit = {
      'lifecycle.cast': 'castVote',
      'lifecycle.close': 'closeVote',
      'lifecycle.reveal': 'revealVote',
      'lifecycle.finalize': 'finalizeVote',
    }[id];
    let receipt: CanonicalReceipt;
    try {
      receipt = sanitizeCanonicalReceipt(step.receipt);
    } catch {
      throw new Error(`Complete manifest has an invalid ${id} canonical receipt`);
    }
    if (
      receipt.status !== 'confirmed' ||
      receipt.action !== 'vote' ||
      receipt.network !== manifest.network ||
      receipt.circuit !== expectedCircuit ||
      !receipt.transactionId.trim() ||
      stripHexPrefix(receipt.contractAddress) !== stripHexPrefix(referendumAddress)
    ) {
      throw new Error(
        `Complete manifest ${id} receipt is not a confirmed ${expectedCircuit} receipt`,
      );
    }
    lifecycleReceipts.set(id, receipt);
  }
  const receiptTransactionIds = new Set<string>();
  for (const [id, receipt] of lifecycleReceipts) {
    if (receiptTransactionIds.has(receipt.transactionId)) {
      throw new Error(`Complete manifest has duplicate ${id} lifecycle transaction evidence`);
    }
    receiptTransactionIds.add(receipt.transactionId);
  }
  const castReceipt = lifecycleReceipts.get('lifecycle.cast');
  if (!castReceipt || action.transactionId !== castReceipt.transactionId) {
    throw new Error('Complete manifest action transaction does not match the cast receipt');
  }
  const replayStep = manifest.transcript.steps.find(
    (candidate) => candidate.id === 'lifecycle.replay-rejected',
  );
  if (replayStep?.status !== 'rejected') {
    throw new Error('Complete manifest is missing replay rejection evidence');
  }
  if (manifest.transcript.observations.length < 5) {
    throw new Error('Complete manifest is missing canonical indexer observations');
  }
  const availableObservationTransactionIds = new Set<string>();
  for (const observation of manifest.transcript.observations) {
    if (observation.indexer.available !== true || observation.transactionId === undefined) {
      continue;
    }
    if (!observation.transactionId.trim()) {
      throw new Error('Complete manifest contains an empty indexer transaction observation');
    }
    if (availableObservationTransactionIds.has(observation.transactionId)) {
      throw new Error('Complete manifest contains duplicate indexer transaction observations');
    }
    availableObservationTransactionIds.add(observation.transactionId);
  }
  for (const id of requiredReceipts) {
    const observations = manifest.transcript.observations.filter(
      (observation) => observation.stage === id && observation.indexer.available === true,
    );
    if (observations.length !== 1) {
      throw new Error(`Complete manifest is missing ${id} indexer observation`);
    }
    const observation = observations[0];
    const receipt = lifecycleReceipts.get(id);
    if (
      !receipt ||
      observation.transactionId !== receipt.transactionId ||
      observation.indexer.source !== manifest.endpoints.indexerHttp
    ) {
      throw new Error(`Complete manifest ${id} indexer observation is not bound to its receipt`);
    }
  }
  const lifecycle = manifest.lifecycle;
  if (
    !lifecycle?.replayRejected ||
    !lifecycle.finalized ||
    lifecycle.indexerObservations !== requiredReceipts.length ||
    lifecycle.castTransactionId !== lifecycleReceipts.get('lifecycle.cast')?.transactionId ||
    lifecycle.closeTransactionId !== lifecycleReceipts.get('lifecycle.close')?.transactionId ||
    lifecycle.revealTransactionId !== lifecycleReceipts.get('lifecycle.reveal')?.transactionId ||
    lifecycle.finalizeTransactionId !== lifecycleReceipts.get('lifecycle.finalize')?.transactionId
  ) {
    throw new Error(
      'Complete manifest is missing or has inconsistent finalized lifecycle evidence',
    );
  }
  if (!manifest.manifestDigest || !/^[0-9a-f]{64}$/iu.test(manifest.manifestDigest)) {
    throw new Error('Complete manifest is missing its manifest digest');
  }
  const digestInput = { ...manifest } as Record<string, unknown>;
  delete digestInput.manifestDigest;
  const expectedManifestDigest = bytesToHex(sha256(utf8ToBytes(stableJson(digestInput))));
  if (manifest.manifestDigest !== expectedManifestDigest) {
    throw new Error('Complete manifest manifest digest does not match its canonical content');
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
    manifest.dust.beforeObservedAt === null ||
    manifest.dust.afterObservedAt === null ||
    manifest.dust.valuationAt === null ||
    !manifest.dust.accounted
  ) {
    throw new Error('Complete manifest is missing DUST accounting');
  }
}

function assertPublicArtifacts(artifacts: PassportV2ManifestArtifacts): void {
  for (const [key, value] of Object.entries(artifacts)) {
    if (key === 'hashes') {
      if (
        value !== undefined &&
        (typeof value !== 'object' || value === null || Array.isArray(value))
      ) {
        throw new TypeError('Manifest artifact hashes must be an object');
      }
      continue;
    }
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

function assertRuntimeApiUrl(value: string, network: PassportV2ManifestNetwork): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError('runtime apiUrl must be an absolute public URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError('runtime apiUrl must use HTTP or HTTPS');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new TypeError('runtime apiUrl must not contain credentials, query strings, or fragments');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname.toLowerCase());
  if (network === 'preview' && parsed.protocol !== 'https:') {
    throw new TypeError('Preview runtime apiUrl must use HTTPS');
  }
  if (network === 'undeployed' && parsed.protocol === 'http:' && !local) {
    throw new TypeError('Undeployed HTTP runtime apiUrl must target a local host');
  }
}

/** Matches scripts/evidence-undeployed-v2.mjs stableJson exactly for JSON data. */
function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) as string;
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(',')}}`;
}

function assertDust(dust: PassportV2ManifestDust): void {
  for (const key of ['before', 'after', 'spent'] as const) {
    const value = dust[key];
    if (value !== null) assertDecimal(value, `dust.${key}`);
  }
  for (const key of ['beforeObservedAt', 'afterObservedAt', 'valuationAt'] as const) {
    const value = dust[key];
    if (value !== null && Number.isNaN(Date.parse(value))) {
      throw new TypeError(`dust.${key} must be an ISO timestamp`);
    }
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
    // Empty for an open-enrollment registry; only the legacy frozen model
    // pins a single root here (see VITE_CICO_ENROLLMENT_MODEL and each
    // referendum's acceptedRoots for the open-model equivalent).
    VITE_CICO_FROZEN_ROOT_FIELD: manifest.registry.frozenRootField ?? '',
    VITE_CICO_ENROLLMENT_MODEL: manifest.registry.enrollmentModel,
    VITE_CICO_REFERENDA_JSON: JSON.stringify(
      manifest.referenda.map((referendum) => ({
        referendumId: referendum.referendumId,
        contractAddress: referendum.contractAddress,
        registryContractBindingHex: referendum.registryContractBindingHex,
        registryContractAddress: referendum.registryContractAddress,
        eventIdHex: referendum.eventIdHex,
        organizerKeyHex: referendum.organizerKeyHex,
        rootPublisherKeyHex: referendum.rootPublisherKeyHex,
        initialRootField: referendum.initialRootField,
        acceptedRoots: referendum.acceptedRoots,
        opensAtUnix: referendum.opensAtUnix,
        enrollmentClosesAtUnix: referendum.enrollmentClosesAtUnix,
        closesAtUnix: referendum.closesAtUnix,
        revealClosesAtUnix: referendum.revealClosesAtUnix,
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
