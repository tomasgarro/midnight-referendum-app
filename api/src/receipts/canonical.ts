import type {
  CanonicalReceipt,
  CivicActionKind,
  MidnightRuntimeNetwork,
} from '../passport-v2/types.js';

/**
 * The small public observation needed to turn an indexer result into a
 * receipt.  A wallet submission response is deliberately not accepted here:
 * the indexer must supply the block and successful ledger result.
 */
export interface IndexerConfirmedTransaction {
  readonly status: 'confirmed';
  readonly transactionId: string;
  readonly transactionHash: string;
  readonly contractAddress: string;
  readonly blockHeight: number;
  readonly blockHash: string;
  readonly blockTimestamp: string | number;
  readonly explorerUrl?: string;
}

export interface CanonicalReceiptContext {
  readonly action: CivicActionKind;
  readonly network: MidnightRuntimeNetwork;
  readonly contractAddress: string;
  readonly circuit: string;
  readonly explorerBaseUrl?: string;
}

export function canonicalReceiptFromIndexer(
  observation: IndexerConfirmedTransaction,
  context: CanonicalReceiptContext,
): CanonicalReceipt {
  if (observation.status !== 'confirmed') {
    throw new Error('Only an indexer-confirmed transaction can become a receipt');
  }
  if (observation.contractAddress !== context.contractAddress) {
    throw new Error('Indexer transaction does not touch the requested contract');
  }

  const transactionId = nonEmpty(observation.transactionId, 'transactionId');
  const transactionHash = nonEmpty(observation.transactionHash, 'transactionHash');
  const contractAddress = nonEmpty(observation.contractAddress, 'contractAddress');
  const circuit = nonEmpty(context.circuit, 'circuit');
  const blockHash = nonEmpty(observation.blockHash, 'blockHash');
  if (!Number.isSafeInteger(observation.blockHeight) || observation.blockHeight < 0) {
    throw new Error('Indexer returned an invalid block height');
  }

  const blockTimestamp = isoTimestamp(observation.blockTimestamp);
  const explorerUrl =
    observation.explorerUrl ?? explorerFor(context.explorerBaseUrl, transactionId);
  return {
    status: 'confirmed',
    action: context.action,
    network: context.network,
    transactionId,
    transactionHash,
    contractAddress,
    circuit,
    blockHeight: observation.blockHeight,
    blockHash,
    blockTimestamp,
    ...(explorerUrl ? { explorerUrl } : {}),
  };
}

/** Runtime guard used at every durable/public receipt boundary. */
export function isCanonicalReceipt(value: unknown): value is CanonicalReceipt {
  try {
    sanitizeCanonicalReceipt(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns only the public receipt fields.  This prevents provider responses
 * from smuggling raw witness, ballot, or Passport fields into persistence or
 * the HTTP response.
 */
export function sanitizeCanonicalReceipt(value: unknown): CanonicalReceipt {
  if (!isRecord(value)) throw new TypeError('receipt must be an object');
  if (
    value.status !== 'confirmed' ||
    !isAction(value.action) ||
    !isNetwork(value.network) ||
    typeof value.transactionId !== 'string' ||
    typeof value.transactionHash !== 'string' ||
    typeof value.contractAddress !== 'string' ||
    typeof value.circuit !== 'string' ||
    !Number.isSafeInteger(value.blockHeight) ||
    (value.blockHeight as number) < 0 ||
    typeof value.blockHash !== 'string' ||
    typeof value.blockTimestamp !== 'string' ||
    !value.transactionId ||
    !value.transactionHash ||
    !value.contractAddress ||
    !value.circuit ||
    !value.blockHash ||
    !value.blockTimestamp ||
    (value.explorerUrl !== undefined && typeof value.explorerUrl !== 'string')
  ) {
    throw new TypeError('receipt is not a canonical confirmed public receipt');
  }
  return {
    status: 'confirmed',
    action: value.action,
    network: value.network,
    transactionId: value.transactionId,
    transactionHash: value.transactionHash,
    contractAddress: value.contractAddress,
    circuit: value.circuit,
    blockHeight: value.blockHeight as number,
    blockHash: value.blockHash,
    blockTimestamp: value.blockTimestamp,
    ...(value.explorerUrl !== undefined ? { explorerUrl: value.explorerUrl } : {}),
  };
}

function nonEmpty(value: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Indexer returned an invalid ${label}`);
  }
  return value;
}

function isoTimestamp(value: string | number): string {
  const milliseconds =
    typeof value === 'number' && value < 1_000_000_000_000 ? value * 1_000 : value;
  const date = new Date(milliseconds);
  if (!Number.isFinite(date.getTime()))
    throw new Error('Indexer returned an invalid block timestamp');
  return date.toISOString();
}

function explorerFor(baseUrl: string | undefined, transactionId: string): string | undefined {
  if (!baseUrl?.trim()) return undefined;
  return `${baseUrl.replace(/\/+$/u, '')}/${encodeURIComponent(transactionId)}`;
}

function isAction(value: unknown): value is CivicActionKind {
  return value === 'credential' || value === 'vote' || value === 'cohort';
}

function isNetwork(value: unknown): value is MidnightRuntimeNetwork {
  return value === 'preview' || value === 'devnet' || value === 'undeployed' || value === 'mainnet';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
