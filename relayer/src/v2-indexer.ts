import {
  type CanonicalReceipt,
  canonicalReceiptFromIndexer,
  type MidnightRuntimeNetwork,
} from 'midnight-referendum-api';
import { V2ActionError, type V2IndexerReceiptResolver } from './v2-types.js';

const ACTION_RECEIPT_QUERY = `
  query V2ActionReceipt($offset: TransactionOffset!) {
    transactions(offset: $offset) {
      hash
      contractActions { address }
      block { height hash timestamp }
      ... on RegularTransaction {
        identifiers
        transactionResult { status }
      }
    }
  }
`;

export interface MidnightIndexerReceiptResolverOptions {
  readonly indexerHttpUrl: string;
  readonly explorerBaseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

/** Raised when the indexer has a definitive failure, not while it is lagging. */
export class IndexerRejectedError extends V2ActionError {
  constructor(code: 'indexer_contract_mismatch' | 'indexer_rejected', message: string) {
    super(code, message, 409);
    this.name = 'IndexerRejectedError';
  }
}

/**
 * Direct GraphQL resolver. The SDK's `watchForTxData` intentionally omits
 * contract action addresses, so this narrow query also proves that the
 * transaction touched the requested allowlisted contract before a receipt is
 * persisted. Circuit identity remains the configured allowlist boundary: the
 * indexer does not expose Compact circuit names.
 */
export class MidnightIndexerReceiptResolver implements V2IndexerReceiptResolver {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: MidnightIndexerReceiptResolverOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 5_000;
  }

  async resolve(input: {
    readonly transactionId: string;
    readonly network: string;
    readonly contractAddress: string;
    readonly circuit: string;
    readonly action: 'credential' | 'vote' | 'cohort';
  }): Promise<CanonicalReceipt | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.options.indexerHttpUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          operationName: 'V2ActionReceipt',
          query: ACTION_RECEIPT_QUERY,
          variables: { offset: { identifier: input.transactionId } },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`indexer HTTP ${response.status}`);
      const payload = (await response.json()) as unknown;
      if (!isRecord(payload) || (Array.isArray(payload.errors) && payload.errors.length > 0)) {
        throw new Error('indexer returned a GraphQL error');
      }
      const transaction = transactionFrom(payload);
      if (!transaction) return null;
      if (!transaction.identifiers.includes(input.transactionId)) return null;
      if (transaction.status !== 'SUCCESS') {
        throw new IndexerRejectedError('indexer_rejected', 'indexer rejected the transaction');
      }
      if (!transaction.contractActions.some((action) => action.address === input.contractAddress)) {
        throw new IndexerRejectedError(
          'indexer_contract_mismatch',
          'indexed transaction does not touch the requested contract',
        );
      }
      if (!isNetwork(input.network)) throw new Error('unsupported network');
      return canonicalReceiptFromIndexer(
        {
          status: 'confirmed',
          transactionId: input.transactionId,
          transactionHash: transaction.hash,
          contractAddress: input.contractAddress,
          blockHeight: transaction.block.height,
          blockHash: transaction.block.hash,
          blockTimestamp: transaction.block.timestamp,
        },
        {
          action: input.action,
          network: input.network,
          contractAddress: input.contractAddress,
          circuit: input.circuit,
          explorerBaseUrl: this.options.explorerBaseUrl,
        },
      );
    } catch (error) {
      if (error instanceof IndexerRejectedError) throw error;
      // Network, timeout, malformed payload, and GraphQL failures are lag or
      // outage signals. The service keeps the job pending and retries.
      if (error instanceof Error && error.name === 'AbortError') return null;
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

interface IndexerTransaction {
  readonly hash: string;
  readonly identifiers: readonly string[];
  readonly status: string;
  readonly contractActions: readonly { address: string }[];
  readonly block: { height: number; hash: string; timestamp: number };
}

function transactionFrom(value: Record<string, unknown>): IndexerTransaction | null {
  const data = value.data;
  if (!isRecord(data) || !Array.isArray(data.transactions)) return null;
  const transaction = data.transactions[0];
  if (!isRecord(transaction)) return null;
  const actions = transaction.contractActions;
  const block = transaction.block;
  const identifiers = transaction.identifiers;
  const result = transaction.transactionResult;
  if (
    typeof transaction.hash !== 'string' ||
    !Array.isArray(actions) ||
    !Array.isArray(identifiers) ||
    !identifiers.every((id) => typeof id === 'string') ||
    !isRecord(block) ||
    !Number.isSafeInteger(block.height) ||
    typeof block.hash !== 'string' ||
    !Number.isSafeInteger(block.timestamp) ||
    !isRecord(result) ||
    typeof result.status !== 'string'
  ) {
    throw new Error('indexer returned malformed transaction data');
  }
  const contractActions = actions.filter(isRecord);
  if (!contractActions.every((action) => typeof action.address === 'string')) {
    throw new Error('indexer returned malformed contract actions');
  }
  return {
    hash: transaction.hash,
    identifiers: identifiers as string[],
    status: result.status,
    contractActions: contractActions as { address: string }[],
    block: {
      height: block.height as number,
      hash: block.hash,
      timestamp: block.timestamp as number,
    },
  };
}

function isNetwork(value: string): value is MidnightRuntimeNetwork {
  return value === 'preview' || value === 'devnet' || value === 'undeployed' || value === 'mainnet';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
