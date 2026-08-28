import { describe, expect, it, vi } from 'vitest';
import { MidnightIndexerReceiptResolver } from './v2-indexer.js';

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const input = {
  transactionId: 'tx-1',
  network: 'preview',
  contractAddress: 'contract-1',
  circuit: 'castVote',
  action: 'vote' as const,
};

function indexedTransaction(overrides: Record<string, unknown> = {}) {
  return {
    hash: 'hash-1',
    identifiers: ['tx-1'],
    contractActions: [{ address: 'contract-1' }],
    block: { height: 7, hash: 'block-7', timestamp: 1_700_000_000 },
    transactionResult: { status: 'SUCCESS' },
    ...overrides,
  };
}

describe('Midnight indexer receipt resolver', () => {
  it('requires a successful transaction touching the configured contract', async () => {
    const fetchImpl = vi.fn(async () =>
      response({ data: { transactions: [indexedTransaction()] } }),
    );
    const resolver = new MidnightIndexerReceiptResolver({
      indexerHttpUrl: 'http://indexer.test/graphql',
      fetchImpl,
      explorerBaseUrl: 'https://explorer.test/tx',
    });

    await expect(resolver.resolve(input)).resolves.toMatchObject({
      status: 'confirmed',
      transactionId: 'tx-1',
      transactionHash: 'hash-1',
      blockHeight: 7,
      network: 'preview',
      explorerUrl: 'https://explorer.test/tx/tx-1',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://indexer.test/graphql',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('keeps an absent transaction pending and rejects definitive failures or contract mismatches', async () => {
    const pending = new MidnightIndexerReceiptResolver({
      indexerHttpUrl: 'http://indexer.test/graphql',
      fetchImpl: vi.fn(async () => response({ data: { transactions: [] } })),
    });
    await expect(pending.resolve(input)).resolves.toBeNull();

    const rejected = new MidnightIndexerReceiptResolver({
      indexerHttpUrl: 'http://indexer.test/graphql',
      fetchImpl: vi.fn(async () =>
        response({
          data: {
            transactions: [indexedTransaction({ transactionResult: { status: 'FAILURE' } })],
          },
        }),
      ),
    });
    await expect(rejected.resolve(input)).rejects.toMatchObject({
      code: 'indexer_rejected',
    });

    const wrongContract = new MidnightIndexerReceiptResolver({
      indexerHttpUrl: 'http://indexer.test/graphql',
      fetchImpl: vi.fn(async () =>
        response({
          data: {
            transactions: [
              indexedTransaction({ contractActions: [{ address: 'other-contract' }] }),
            ],
          },
        }),
      ),
    });
    await expect(wrongContract.resolve(input)).rejects.toMatchObject({
      code: 'indexer_contract_mismatch',
    });
  });

  it('treats timeouts and GraphQL/network failures as retryable lag', async () => {
    const timeout = new MidnightIndexerReceiptResolver({
      indexerHttpUrl: 'http://indexer.test/graphql',
      timeoutMs: 1,
      fetchImpl: vi.fn(
        (_url, options) =>
          new Promise<Response>((_resolve, reject) => {
            options?.signal?.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }),
      ),
    });
    await expect(timeout.resolve(input)).resolves.toBeNull();

    const unavailable = new MidnightIndexerReceiptResolver({
      indexerHttpUrl: 'http://indexer.test/graphql',
      fetchImpl: vi.fn(async () => {
        throw new Error('connection refused');
      }),
    });
    await expect(unavailable.resolve(input)).rejects.toThrow('connection refused');
  });
});
