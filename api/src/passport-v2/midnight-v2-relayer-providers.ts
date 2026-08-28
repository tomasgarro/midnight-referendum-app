import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { catchError, retry, throwError } from 'rxjs';
import { browserPrivateStateProvider, inMemoryPrivateStateProvider } from '../private-state.js';
import {
  WalletlessActionClient,
  type WalletlessActionJob,
} from '../receipts/walletless-action-client.js';
import type { REFERENDUM_V2_PRIVATE_STATE_ID, ReferendumV2PrivateState } from './midnight-v2.js';
import type { ReferendumV2Providers } from './midnight-v2-executors.js';
import type { ReferendumV2CircuitKeys } from './midnight-v2-providers.js';
import type { CivicActionKind } from './types.js';

export interface WalletlessActionCapabilityRequest {
  readonly actionId: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly circuit: string;
  readonly action: CivicActionKind;
  /** Opaque issuer handle. It is sent to the capability issuer, never the relay. */
  readonly credentialAuthorization: string;
}

export interface WalletlessActionCapabilityIssuer {
  issue(request: WalletlessActionCapabilityRequest): Promise<string>;
}

export interface HttpWalletlessActionCapabilityIssuerOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
}

/** Narrow browser-to-CICO client. The opaque credential handle never reaches the relay. */
export class HttpWalletlessActionCapabilityIssuer implements WalletlessActionCapabilityIssuer {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpWalletlessActionCapabilityIssuerOptions) {
    assertLocalOrSecureUrl(options.baseUrl, 'capability issuer');
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async issue(request: WalletlessActionCapabilityRequest): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/action-capabilities`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok || !isRecord(payload) || typeof payload.actionCapability !== 'string') {
      throw new Error(`CICO action capability request failed (${response.status})`);
    }
    return payload.actionCapability;
  }
}

export interface WalletlessActionScope {
  readonly credentialAuthorization: string;
  readonly contractAddress: string;
  readonly circuit: ReferendumV2CircuitKeys;
  readonly action: CivicActionKind;
}

/** Binds credential authorization to exactly one provider invocation. */
export interface WalletlessActionExecutionContext {
  run<T>(scope: WalletlessActionScope, operation: () => Promise<T>): Promise<T>;
}

interface PendingActionRecord {
  readonly actionId: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
}

export interface WalletlessPendingActionStore {
  get(key: string): Promise<PendingActionRecord | null>;
  put(key: string, record: PendingActionRecord): Promise<void>;
  delete(key: string): Promise<void>;
}

export class InMemoryWalletlessPendingActionStore implements WalletlessPendingActionStore {
  private readonly records = new Map<string, PendingActionRecord>();

  async get(key: string): Promise<PendingActionRecord | null> {
    const value = this.records.get(key);
    return value ? { ...value } : null;
  }

  async put(key: string, record: PendingActionRecord): Promise<void> {
    this.records.set(key, { ...record });
  }

  async delete(key: string): Promise<void> {
    this.records.delete(key);
  }
}

export interface ReferendumV2WalletlessProviderOptions {
  readonly relayUrl: string;
  readonly proofServerUri: string;
  readonly networkId: 'undeployed' | 'preview';
  readonly indexerUri: string;
  readonly indexerWsUri: string;
  readonly capabilityIssuer: WalletlessActionCapabilityIssuer;
  readonly zkConfigBaseUrl?: string;
  readonly pendingStore?: WalletlessPendingActionStore;
  readonly pollIntervalMs?: number;
  readonly submissionTimeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export interface ReferendumV2WalletlessRuntime {
  readonly providers: ReferendumV2Providers;
  readonly actionContext: WalletlessActionExecutionContext;
}

/**
 * Builds the primary seedless v2 provider set. Midnight.js constructs and
 * proves locally, then this provider forwards only the serialized proven,
 * unbound transaction to the atomic relay. Balancing and submission never
 * become two browser-visible operations.
 */
export async function createReferendumV2WalletlessProviders(
  options: ReferendumV2WalletlessProviderOptions,
): Promise<ReferendumV2WalletlessRuntime> {
  assertLocalOrSecureUrl(options.relayUrl, 'relay');
  assertLocalOrSecureUrl(options.proofServerUri, 'proof server');
  setNetworkId(options.networkId);

  const fetchImpl = options.fetchImpl ?? fetch;
  const relay = new WalletlessActionClient({ baseUrl: options.relayUrl, fetchImpl });
  const publicKeys = await relayJson<{ coinPublicKey: string; encryptionPublicKey: string }>(
    `${options.relayUrl.replace(/\/+$/u, '')}/keys`,
    fetchImpl,
  );
  const rawPublicDataProvider = indexerPublicDataProvider(options.indexerUri, options.indexerWsUri);
  const originalObservable =
    rawPublicDataProvider.contractStateObservable.bind(rawPublicDataProvider);
  const publicDataProvider: typeof rawPublicDataProvider = {
    ...rawPublicDataProvider,
    contractStateObservable(address, observableConfig) {
      return originalObservable(address, observableConfig).pipe(
        retry({ delay: 250, count: 1 }),
        catchError((error: unknown) =>
          observableConfig.type === 'latest'
            ? originalObservable(address, { type: 'all' })
            : throwError(() => error),
        ),
      );
    },
  };
  const privateStateProvider =
    typeof window === 'undefined'
      ? inMemoryPrivateStateProvider<
          typeof REFERENDUM_V2_PRIVATE_STATE_ID,
          ReferendumV2PrivateState
        >()
      : browserPrivateStateProvider<
          typeof REFERENDUM_V2_PRIVATE_STATE_ID,
          ReferendumV2PrivateState
        >();
  const browserOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const zkConfigBaseUrl = options.zkConfigBaseUrl ?? `${browserOrigin}/managed/referendum-v2`;
  if (typeof window === 'undefined' && !/^https?:\/\//iu.test(zkConfigBaseUrl)) {
    throw new TypeError('zkConfigBaseUrl must be absolute outside a browser');
  }
  const zkConfigProvider = new FetchZkConfigProvider<ReferendumV2CircuitKeys>(
    zkConfigBaseUrl,
    fetchImpl,
  );
  const proofProvider = httpClientProofProvider<ReferendumV2CircuitKeys>(
    options.proofServerUri,
    zkConfigProvider,
  );
  const pendingStore = options.pendingStore ?? new InMemoryWalletlessPendingActionStore();
  const pollIntervalMs = boundedDelay(options.pollIntervalMs ?? 500, 'pollIntervalMs');
  const submissionTimeoutMs = boundedDelay(
    options.submissionTimeoutMs ?? 120_000,
    'submissionTimeoutMs',
  );
  let activeScope: WalletlessActionScope | null = null;

  const actionContext: WalletlessActionExecutionContext = {
    async run(scope, operation) {
      if (activeScope) throw new Error('A walletless action scope is already active');
      activeScope = { ...scope };
      try {
        return await operation();
      } finally {
        activeScope = null;
      }
    },
  };

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => publicKeys.coinPublicKey,
    getEncryptionPublicKey: () => publicKeys.encryptionPublicKey,
    // The relay, not the browser, performs the one atomic balance/finalize step.
    balanceTx: async (provenTx) => provenTx as unknown as FinalizedTransaction,
  };
  const midnightProvider: MidnightProvider = {
    async submitTx(provenTx) {
      const scope = activeScope;
      if (!scope) throw new Error('Walletless submission has no credential-bound action scope');
      const tx = toHex(provenTx.serialize()).toLowerCase();
      const pendingKey = await digestText(
        `midnight-referendum:pending-v2:1:${scope.contractAddress}:${scope.circuit}:${scope.credentialAuthorization}`,
      );
      const previous = await pendingStore.get(pendingKey);
      if (previous) {
        const recovered = await relay.getAction(previous.actionId);
        if (recovered && recovered.requestHash === previous.requestHash) {
          const transactionId = await waitForTransactionId(
            relay,
            recovered,
            pollIntervalMs,
            submissionTimeoutMs,
          );
          await pendingStore.delete(pendingKey);
          return transactionId;
        }
        await pendingStore.delete(pendingKey);
      }

      const actionId = randomId();
      const idempotencyKey = randomId();
      const requestHash = await walletlessActionRequestHash({
        action: scope.action,
        contractAddress: scope.contractAddress,
        circuit: scope.circuit,
        network: options.networkId,
        tx,
      });
      const actionCapability = await options.capabilityIssuer.issue({
        actionId,
        idempotencyKey,
        requestHash,
        network: options.networkId,
        contractAddress: scope.contractAddress,
        circuit: scope.circuit,
        action: scope.action,
        credentialAuthorization: scope.credentialAuthorization,
      });
      await pendingStore.put(pendingKey, { actionId, idempotencyKey, requestHash });
      const job = await relay.submit({
        actionId,
        idempotencyKey,
        requestHash,
        actionCapability,
        network: options.networkId,
        contractAddress: scope.contractAddress,
        circuit: scope.circuit,
        action: scope.action,
        tx,
      });
      const transactionId = await waitForTransactionId(
        relay,
        job,
        pollIntervalMs,
        submissionTimeoutMs,
      );
      await pendingStore.delete(pendingKey);
      return transactionId;
    },
  };

  return {
    providers: {
      privateStateProvider,
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    },
    actionContext,
  };
}

async function waitForTransactionId(
  relay: WalletlessActionClient,
  initial: WalletlessActionJob,
  intervalMs: number,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let job: WalletlessActionJob | null = initial;
  while (job && !job.transactionId) {
    if (job.status === 'failed' || job.status === 'recovery_required') {
      throw new Error(`Walletless relay stopped with ${job.errorCode ?? job.status}`);
    }
    if (Date.now() >= deadline) throw new Error('Walletless relay submission is still pending');
    await delay(intervalMs);
    job = await relay.getAction(initial.actionId);
  }
  if (!job?.transactionId) throw new Error('Walletless relay lost the accepted action');
  return job.transactionId;
}

/** Browser/WebCrypto equivalent of the relay's deterministic request digest. */
export async function walletlessActionRequestHash(input: {
  readonly network: string;
  readonly contractAddress: string;
  readonly circuit: string;
  readonly action: CivicActionKind;
  readonly tx: string;
}): Promise<string> {
  return digestText(
    `midnight-referendum:v2-action:1:${stableJson({
      action: input.action,
      contractAddress: input.contractAddress,
      circuit: input.circuit,
      network: input.network,
      tx: input.tx,
      version: 1,
    })}`,
  );
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(',')}}`;
}

async function digestText(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomId(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error('Secure random UUID support is required');
  return globalThis.crypto.randomUUID();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function boundedDelay(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 10 || value > 10 * 60_000) {
    throw new TypeError(`${label} is outside the supported range`);
  }
  return value;
}

async function relayJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Walletless relay key endpoint returned ${response.status}`);
  return (await response.json()) as T;
}

function assertLocalOrSecureUrl(value: string, label: string): void {
  const url = new URL(value);
  const local =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new TypeError(`${label} URL must use HTTPS outside localhost`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
