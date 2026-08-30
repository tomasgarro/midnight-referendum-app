import { asContractAddress, type PublicDataProvider } from '@midnight-ntwrk/midnight-js-types';
import {
  type CanonicalReceipt,
  type CredentialRegistryV1Executor,
  type CredentialRegistryV1PrivateState,
  type CredentialRegistryV1State,
  parseCredentialRegistryV1,
  parseReferendumV2,
  type ReferendumV2Executor,
  type ReferendumV2PrivateState,
  type ReferendumV2State,
} from 'midnight-referendum-api';

/**
 * Reads canonical registry/referendum ledger state through the indexer.
 * Caller-supplied roots are never trusted; every decision is made from a
 * fresh canonical read.
 */
export interface CredentialRootPublisherReader {
  readRegistry(registryContractAddress: string): Promise<CredentialRegistryV1State>;
  readReferendum(referendumContractAddress: string): Promise<ReferendumV2State>;
}

export class MidnightCredentialRootPublisherReader implements CredentialRootPublisherReader {
  constructor(private readonly publicDataProvider: PublicDataProvider) {}

  async readRegistry(registryContractAddress: string): Promise<CredentialRegistryV1State> {
    const address = asContractAddress(registryContractAddress);
    const canonical = await this.publicDataProvider.queryContractState(address);
    if (!canonical) throw new Error('Canonical credential registry state is unavailable');
    return parseCredentialRegistryV1(canonical.data);
  }

  async readReferendum(referendumContractAddress: string): Promise<ReferendumV2State> {
    const address = asContractAddress(referendumContractAddress);
    const canonical = await this.publicDataProvider.queryContractState(address);
    if (!canonical) throw new Error('Canonical referendum state is unavailable');
    return parseReferendumV2(canonical.data);
  }
}

/** One open referendum this publisher is authorized to admit roots into. */
export interface CredentialRootPublisherReferendumTarget {
  readonly contractAddress: string;
  readonly executor: ReferendumV2Executor;
  /** Private root-publisher secret for this referendum; mirrors organizerSecret. */
  readonly rootPublisherSecret: Uint8Array;
}

export interface CredentialRootPublisherLogger {
  info(message: string, details?: Record<string, unknown>): void;
  warn(message: string, details?: Record<string, unknown>): void;
  error(message: string, details?: Record<string, unknown>): void;
}

export interface CredentialRootPublisherOptions {
  readonly registryExecutor: CredentialRegistryV1Executor;
  readonly registryContractAddress: string;
  readonly reader: CredentialRootPublisherReader;
  readonly referenda: readonly CredentialRootPublisherReferendumTarget[];
  /** Minimum number of newly-enrolled credentials before publishing a root; default 16. */
  readonly minBatchSize?: number;
  /** Publish an under-sized batch anyway once it has waited this long; default 900_000 (15 min). */
  readonly maxWaitMs?: number;
  /** How often `start()` runs a publish cycle; default 60_000 (1 min). */
  readonly intervalMs?: number;
  readonly now?: () => number;
  readonly logger?: CredentialRootPublisherLogger;
}

export interface CredentialRootPublisherReferendumOutcome {
  readonly contractAddress: string;
  readonly status: 'published' | 'failed';
  readonly transactionId?: string;
  readonly error?: string;
}

export type CredentialRootPublishSkipReason =
  | 'no-referenda-configured'
  | 'unchanged'
  | 'no-new-credentials'
  | 'below-minimum-batch'
  | 'attestation-failed';

export interface CredentialRootPublishSkipped {
  readonly published: false;
  readonly reason: CredentialRootPublishSkipReason;
  readonly batchSize?: number;
  readonly error?: string;
}

export interface CredentialRootPublishSucceeded {
  readonly published: true;
  /** The registry root's field element, as a decimal string; roots are public data. */
  readonly rootField: string;
  readonly batchSize: number;
  /** Honest, explicit flag: this batch was smaller than minBatchSize (forced by wait/deadline). */
  readonly belowMinimum: boolean;
  readonly attestationTransactionId: string;
  readonly referenda: readonly CredentialRootPublisherReferendumOutcome[];
}

export type CredentialRootPublishResult =
  | CredentialRootPublishSkipped
  | CredentialRootPublishSucceeded;

/**
 * What the publisher can honestly say about the current batch.
 *
 * This exists so the UI can explain the wait between enrolling and being able
 * to vote. Every field is either observed or null -- never a placeholder zero,
 * because "we have not looked yet" and "nothing has happened" are different
 * facts and the second one is reassuring in a way the first has not earned.
 */
export interface CredentialRootPublisherStatus {
  /**
   * Credentials enrolled since the last published root, as of the last
   * completed cycle. Null before the first cycle has run.
   */
  readonly pendingCount: number | null;
  /** Publishing happens once the batch reaches this size... */
  readonly minBatchSize: number;
  /** ...or once an under-sized batch has waited this long, whichever is first. */
  readonly maxWaitMs: number;
  /** When the current pending root first appeared. Null when nothing is pending. */
  readonly pendingSinceMs: number | null;
  /**
   * The deadline the wait is bounded by: an under-sized batch publishes anyway
   * at this point. Null when nothing is pending.
   */
  readonly publishesNoLaterThanMs: number | null;
  /** When the last root was successfully published. Null before the first one. */
  readonly lastPublishedAtMs: number | null;
  /** When this snapshot was taken, so a caller can reason about staleness. */
  readonly observedAtMs: number;
}

const DEFAULT_MIN_BATCH_SIZE = 16;
const DEFAULT_MAX_WAIT_MS = 900_000;
const DEFAULT_INTERVAL_MS = 60_000;

const noopLogger: CredentialRootPublisherLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/**
 * Periodically admits the credential registry's current root into every
 * configured open referendum, so that people who enroll after a referendum
 * deploys can still vote.
 *
 * Every publish is preceded, in a separate transaction, by
 * `CredentialRegistryV1Executor.attestRegistryRoot`. That attestation is the
 * only on-chain proof that an admitted root really came from the registry
 * (Midnight has no cross-contract calls, so the referendum cannot check this
 * itself — see docs/ROOT-ATTESTATION-AUDIT.md). A failed attestation must
 * never be followed by a publish.
 *
 * To protect voter anonymity, a root that admits very few new credentials is
 * withheld until either `minBatchSize` is reached, `maxWaitMs` has elapsed
 * since the root started pending, or an enrollment deadline is imminent for
 * one of the configured referenda. An under-sized batch that is published
 * anyway is flagged `belowMinimum: true` rather than hidden.
 */
export class CredentialRootPublisher {
  private readonly registryExecutor: CredentialRegistryV1Executor;
  private readonly registryContractAddress: string;
  private readonly reader: CredentialRootPublisherReader;
  private readonly referenda: readonly CredentialRootPublisherReferendumTarget[];
  private readonly minBatchSize: number;
  private readonly maxWaitMs: number;
  private readonly intervalMs: number;
  private readonly now: () => number;
  private readonly logger: CredentialRootPublisherLogger;

  private queue: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval> | null = null;
  private registryJoined = false;
  private readonly joinedReferenda = new Set<string>();

  /** Root field of the last root this publisher successfully admitted; null before the first publish. */
  private lastPublishedRootField: bigint | null = null;
  /** Registry credentialCount as of the last successful publish. */
  private lastPublishedCredentialCount = 0n;
  /** Root field currently waiting to be published (may be below the batch minimum). */
  private pendingRootField: bigint | null = null;
  private pendingSinceMs: number | null = null;
  /** Batch size seen by the last completed cycle; null before the first one. */
  private lastObservedBatchSize: number | null = null;
  private lastPublishedAtMs: number | null = null;

  private lastResult: CredentialRootPublishResult | undefined;
  private lastError: unknown;

  constructor(options: CredentialRootPublisherOptions) {
    if (!options.registryContractAddress.trim()) {
      throw new TypeError('registryContractAddress must not be empty');
    }
    this.registryExecutor = options.registryExecutor;
    this.registryContractAddress = options.registryContractAddress;
    this.reader = options.reader;
    this.referenda = options.referenda;
    this.minBatchSize = requirePositiveInteger(
      options.minBatchSize ?? DEFAULT_MIN_BATCH_SIZE,
      'minBatchSize',
    );
    this.maxWaitMs = requirePositiveInteger(options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS, 'maxWaitMs');
    this.intervalMs = requirePositiveInteger(
      options.intervalMs ?? DEFAULT_INTERVAL_MS,
      'intervalMs',
    );
    this.now = options.now ?? (() => Date.now());
    this.logger = options.logger ?? noopLogger;
    for (const target of this.referenda) {
      requireBytes32(target.rootPublisherSecret, 'rootPublisherSecret');
    }
  }

  /** Runs a single publish cycle now. Safe to call directly (e.g. from tests). */
  publishOnce(): Promise<CredentialRootPublishResult> {
    return this.exclusive(() => this.cycle());
  }

  /** Starts the periodic timer. A no-op if already started; never runs two cycles at once. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.publishOnce().catch((error) => {
        this.lastError = error;
        this.logger.error('credential-root-publisher: publish cycle failed', {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getLastResult(): CredentialRootPublishResult | undefined {
    return this.lastResult;
  }

  getLastError(): unknown {
    return this.lastError;
  }

  /**
   * A snapshot of the current batch, for the enrollment wait in the UI.
   *
   * Read-only: this never triggers a cycle, so it reports what the last cycle
   * observed rather than what is true right now. `observedAtMs` is included so
   * a caller can see how fresh that is.
   */
  getStatus(): CredentialRootPublisherStatus {
    return {
      pendingCount: this.lastObservedBatchSize,
      minBatchSize: this.minBatchSize,
      maxWaitMs: this.maxWaitMs,
      pendingSinceMs: this.pendingSinceMs,
      publishesNoLaterThanMs:
        this.pendingSinceMs === null ? null : this.pendingSinceMs + this.maxWaitMs,
      lastPublishedAtMs: this.lastPublishedAtMs,
      observedAtMs: this.now(),
    };
  }

  private async cycle(): Promise<CredentialRootPublishResult> {
    try {
      const result = await this.runCycle();
      this.lastResult = result;
      return result;
    } catch (error) {
      this.lastError = error;
      throw error;
    }
  }

  private async runCycle(): Promise<CredentialRootPublishResult> {
    if (this.referenda.length === 0) {
      return { published: false, reason: 'no-referenda-configured' };
    }

    const registryState = await this.reader.readRegistry(this.registryContractAddress);
    const currentRootField = registryState.currentRoot.field;

    if (this.lastPublishedRootField !== null && this.lastPublishedRootField === currentRootField) {
      this.lastObservedBatchSize = 0;
      return { published: false, reason: 'unchanged' };
    }

    if (this.pendingRootField !== currentRootField) {
      this.pendingRootField = currentRootField;
      this.pendingSinceMs = this.now();
    }

    const batchSize = registryState.credentialCount - this.lastPublishedCredentialCount;
    this.lastObservedBatchSize = Number(batchSize > 0n ? batchSize : 0n);
    if (batchSize <= 0n) {
      return { published: false, reason: 'no-new-credentials' };
    }

    const meetsMinimum = batchSize >= BigInt(this.minBatchSize);
    const waitedMs = this.now() - (this.pendingSinceMs ?? this.now());
    const waitedLongEnough = waitedMs >= this.maxWaitMs;

    if (!meetsMinimum && !waitedLongEnough) {
      const deadlineImminent = await this.isEnrollmentDeadlineImminent();
      if (!deadlineImminent) {
        return {
          published: false,
          reason: 'below-minimum-batch',
          batchSize: Number(batchSize),
        };
      }
    }

    const belowMinimum = !meetsMinimum;

    let attestReceipt: CanonicalReceipt;
    try {
      attestReceipt = await this.attest(registryState.currentRoot);
    } catch (error) {
      this.logger.warn('credential-root-publisher: attestation failed, refusing to publish', {
        message: error instanceof Error ? error.message : String(error),
      });
      return { published: false, reason: 'attestation-failed' };
    }

    const referendumOutcomes: CredentialRootPublisherReferendumOutcome[] = [];
    for (const target of this.referenda) {
      try {
        const receipt = await this.publishToReferendum(target, registryState.currentRoot);
        referendumOutcomes.push({
          contractAddress: target.contractAddress,
          status: 'published',
          transactionId: receipt.transactionId,
        });
      } catch (error) {
        this.logger.error('credential-root-publisher: publish to referendum failed', {
          contractAddress: target.contractAddress,
          message: error instanceof Error ? error.message : String(error),
        });
        referendumOutcomes.push({
          contractAddress: target.contractAddress,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.lastPublishedRootField = currentRootField;
    this.lastPublishedCredentialCount = registryState.credentialCount;
    this.pendingRootField = null;
    this.pendingSinceMs = null;
    this.lastObservedBatchSize = 0;
    this.lastPublishedAtMs = this.now();

    if (belowMinimum) {
      this.logger.warn('credential-root-publisher: published an under-sized batch', {
        batchSize: Number(batchSize),
        minBatchSize: this.minBatchSize,
      });
    }

    return {
      published: true,
      rootField: currentRootField.toString(),
      batchSize: Number(batchSize),
      belowMinimum,
      attestationTransactionId: attestReceipt.transactionId,
      referenda: referendumOutcomes,
    };
  }

  private async isEnrollmentDeadlineImminent(): Promise<boolean> {
    const nowSeconds = BigInt(Math.floor(this.now() / 1000));
    const thresholdSeconds = BigInt(Math.ceil(this.maxWaitMs / 1000));
    for (const target of this.referenda) {
      try {
        const state = await this.reader.readReferendum(target.contractAddress);
        if (state.enrollmentClosed) continue;
        const remaining = state.enrollmentClosesAtUnix - nowSeconds;
        if (remaining <= thresholdSeconds) return true;
      } catch (error) {
        this.logger.warn('credential-root-publisher: could not read referendum deadline', {
          contractAddress: target.contractAddress,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return false;
  }

  private async attest(root: CredentialRegistryV1State['currentRoot']): Promise<CanonicalReceipt> {
    if (!this.registryJoined) {
      await this.registryExecutor.join(this.registryContractAddress, attestationPrivateState());
      this.registryJoined = true;
    }
    return this.registryExecutor.attestRegistryRoot(root);
  }

  private async publishToReferendum(
    target: CredentialRootPublisherReferendumTarget,
    root: CredentialRegistryV1State['currentRoot'],
  ): Promise<CanonicalReceipt> {
    if (!this.joinedReferenda.has(target.contractAddress)) {
      await target.executor.join(
        target.contractAddress,
        rootPublisherPrivateState(target.rootPublisherSecret),
      );
      this.joinedReferenda.add(target.contractAddress);
    }
    return target.executor.publishCredentialRoot(root);
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

function attestationPrivateState(): CredentialRegistryV1PrivateState {
  const empty = () => new Uint8Array(32);
  return {
    issuerSecret: empty(),
    holderBinding: empty(),
    credentialBlind: empty(),
    credentialCountry: empty(),
    credentialAgeClass: 0n,
    credentialAssurance: 0n,
    credentialClaimEpoch: 0n,
    credentialValidUntil: 0n,
  };
}

function rootPublisherPrivateState(rootPublisherSecret: Uint8Array): ReferendumV2PrivateState {
  return {
    role: 'organizer',
    rootPublisherSecret: new Uint8Array(rootPublisherSecret),
  };
}

function requireBytes32(value: Uint8Array, label: string): Uint8Array {
  if (!(value instanceof Uint8Array) || value.length !== 32) {
    throw new TypeError(`${label} must be exactly 32 bytes`);
  }
  return value;
}

function requirePositiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return value;
}
