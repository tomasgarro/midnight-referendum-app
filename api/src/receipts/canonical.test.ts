import { describe, expect, it } from 'vitest';
import {
  canonicalReceiptFromIndexer,
  isCanonicalReceipt,
  sanitizeCanonicalReceipt,
} from './canonical.js';

const context = {
  action: 'vote' as const,
  network: 'preview' as const,
  contractAddress: '00contract',
  circuit: 'castVote',
};

describe('canonical receipt boundary', () => {
  it('creates a receipt only from a successful indexed public observation', () => {
    expect(
      canonicalReceiptFromIndexer(
        {
          status: 'confirmed',
          transactionId: 'tx-1',
          transactionHash: 'hash-1',
          contractAddress: '00contract',
          blockHeight: 4,
          blockHash: 'block-4',
          blockTimestamp: 1_700_000_000,
        },
        context,
      ),
    ).toEqual({
      status: 'confirmed',
      action: 'vote',
      network: 'preview',
      transactionId: 'tx-1',
      transactionHash: 'hash-1',
      contractAddress: '00contract',
      circuit: 'castVote',
      blockHeight: 4,
      blockHash: 'block-4',
      blockTimestamp: '2023-11-14T22:13:20.000Z',
    });
  });

  it('rejects a transaction that was indexed for another contract', () => {
    expect(() =>
      canonicalReceiptFromIndexer(
        {
          status: 'confirmed',
          transactionId: 'tx-1',
          transactionHash: 'hash-1',
          contractAddress: 'other',
          blockHeight: 4,
          blockHash: 'block-4',
          blockTimestamp: new Date().toISOString(),
        },
        context,
      ),
    ).toThrow('does not touch');
  });

  it('strips provider-added fields at the public boundary', () => {
    const receipt = sanitizeCanonicalReceipt({
      status: 'confirmed',
      action: 'vote',
      network: 'preview',
      transactionId: 'tx-1',
      transactionHash: 'hash-1',
      contractAddress: 'contract',
      circuit: 'castVote',
      blockHeight: 1,
      blockHash: 'block',
      blockTimestamp: '2026-08-24T00:00:00.000Z',
      choice: 'YES',
      proof: 'must-not-escape',
    });
    expect(receipt).not.toHaveProperty('choice');
    expect(isCanonicalReceipt(receipt)).toBe(true);
  });

  it('preserves an honest Undeployed runtime label without treating it as a Passport network', () => {
    const receipt = sanitizeCanonicalReceipt({
      status: 'confirmed',
      action: 'vote',
      network: 'undeployed',
      transactionId: 'tx-local',
      transactionHash: 'hash-local',
      contractAddress: 'contract-local',
      circuit: 'castVote',
      blockHeight: 1,
      blockHash: 'block-local',
      blockTimestamp: '2026-08-24T00:00:00.000Z',
    });
    expect(receipt.network).toBe('undeployed');
  });
});
