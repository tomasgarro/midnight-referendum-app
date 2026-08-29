import { sha256 } from '@noble/hashes/sha256.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { sanitizeCanonicalReceipt } from '../receipts/canonical.js';
import { deriveRegistryContractBinding } from './crypto.js';
import type { CanonicalReceipt } from './types.js';

/** Versioned public output of the v2 operator command. */
export const PASSPORT_V2_MANIFEST_KIND = 'midnight-passport-v2-runtime' as const;
/** Version 2 is the evidence-bearing format; v1 journals are not complete. */
export const PASSPORT_V2_MANIFEST_VERSION = 2 as const;

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
  const requiredReceipts = [
    'lifecycle.cast',
    'lifecycle.close',
    'lifecycle.reveal',
    'lifecycle.finalize',
  ] as const;
  if (
    new Set(manifest.transcript.steps.map((step) => step.id)).size !==
    manifest.transcript.steps.length
  ) {
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
