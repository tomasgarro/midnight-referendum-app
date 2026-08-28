import type { CanonicalReceipt } from '../passport-v2/types.js';
import { sanitizeCanonicalReceipt } from './canonical.js';

export interface WalletlessActionRequest {
  readonly actionId: string;
  readonly idempotencyKey: string;
  readonly requestHash?: string;
  readonly actionCapability: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly circuit: string;
  readonly action: 'credential' | 'vote' | 'cohort';
  readonly tx: string;
}

export interface WalletlessActionJob {
  readonly actionId: string;
  readonly status: 'pending' | 'confirmed' | 'failed' | 'recovery_required';
  readonly requestHash: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly circuit: string;
  readonly transactionId?: string;
  readonly receipt?: CanonicalReceipt;
  readonly errorCode?: string;
}

export interface WalletlessActionClientOptions {
  /** HTTPS outside localhost; this is an action endpoint, not a proof endpoint. */
  readonly baseUrl: string;
  /** Short-lived bearer token; never put a long-lived secret in Vite config. */
  readonly authorization?: string;
  readonly fetchImpl?: typeof fetch;
}

/** Provider-neutral HTTP boundary for a future CivicActionPort adapter. */
export class WalletlessActionClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: WalletlessActionClientOptions) {
    assertSecureUrl(options.baseUrl);
    this.baseUrl = options.baseUrl.replace(/\/+$/u, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async submit(request: WalletlessActionRequest): Promise<WalletlessActionJob> {
    const response = await this.fetchImpl(`${this.baseUrl}/v2/actions`, {
      method: 'POST',
      headers: this.headers(request.idempotencyKey, request.requestHash, request.actionCapability),
      body: JSON.stringify({
        action: request.action,
        actionId: request.actionId,
        circuit: request.circuit,
        contractAddress: request.contractAddress,
        idempotencyKey: request.idempotencyKey,
        ...(request.requestHash ? { requestHash: request.requestHash } : {}),
        network: request.network,
        tx: request.tx,
      }),
    });
    return parseJob(await this.readResponse(response));
  }

  async getAction(actionId: string): Promise<WalletlessActionJob | null> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/v2/actions/${encodeURIComponent(actionId)}`,
      { headers: this.headers() },
    );
    if (response.status === 404) return null;
    return parseJob(await this.readResponse(response));
  }

  async getReceipt(actionId: string): Promise<CanonicalReceipt | null> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/v2/receipts/${encodeURIComponent(actionId)}`,
      { headers: this.headers() },
    );
    if (response.status === 404 || response.status === 202) return null;
    return sanitizeCanonicalReceipt(await this.readResponse(response));
  }

  private headers(
    idempotencyKey?: string,
    requestHash?: string,
    actionCapability?: string,
  ): Record<string, string> {
    return {
      accept: 'application/json',
      ...(this.options.authorization
        ? {
            authorization: this.options.authorization.startsWith('Bearer ')
              ? this.options.authorization
              : `Bearer ${this.options.authorization}`,
          }
        : {}),
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      ...(requestHash ? { 'x-request-hash': requestHash } : {}),
      ...(actionCapability ? { 'x-action-capability': actionCapability } : {}),
    };
  }

  private async readResponse(response: Response): Promise<unknown> {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Do not copy backend text into a browser-facing error.
    }
    if (!response.ok) {
      const code =
        isRecord(payload) && typeof payload.error === 'string' ? payload.error : 'relay_error';
      throw new WalletlessActionHttpError(response.status, code);
    }
    return payload;
  }
}

export class WalletlessActionHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Walletless action request failed (${status})`);
    this.name = 'WalletlessActionHttpError';
  }
}

function parseJob(value: unknown): WalletlessActionJob {
  if (!isRecord(value)) throw new Error('Invalid walletless action response');
  if (
    typeof value.actionId !== 'string' ||
    !['pending', 'confirmed', 'failed', 'recovery_required'].includes(String(value.status)) ||
    typeof value.requestHash !== 'string' ||
    typeof value.network !== 'string' ||
    typeof value.contractAddress !== 'string' ||
    typeof value.circuit !== 'string' ||
    (value.transactionId !== undefined && typeof value.transactionId !== 'string') ||
    (value.errorCode !== undefined && typeof value.errorCode !== 'string')
  ) {
    throw new Error('Invalid walletless action response');
  }
  const receipt = value.receipt === undefined ? undefined : sanitizeCanonicalReceipt(value.receipt);
  return {
    actionId: value.actionId,
    status: value.status as WalletlessActionJob['status'],
    requestHash: value.requestHash,
    network: value.network,
    contractAddress: value.contractAddress,
    circuit: value.circuit,
    ...(value.transactionId ? { transactionId: value.transactionId } : {}),
    ...(receipt ? { receipt } : {}),
    ...(value.errorCode ? { errorCode: value.errorCode } : {}),
  };
}

function assertSecureUrl(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Walletless action URL is invalid');
  }
  const local =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('Walletless action URL must use HTTPS outside localhost');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
