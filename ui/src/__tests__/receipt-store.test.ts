import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPassportReceipts,
  loadPassportReceipts,
  savePassportReceipt,
} from '../integration/receipt-store';

describe('Passport-scoped receipt store', () => {
  const profileA = 'passport-7f4a';
  const profileB = 'passport-2c91';

  afterEach(async () => {
    await clearPassportReceipts(profileA);
    await clearPassportReceipts(profileB);
  });

  it('keeps simulated receipts isolated by the derived Passport profile key', async () => {
    await savePassportReceipt(profileA, {
      id: 'demo-receipt-a',
      createdAt: '2026-08-27T12:00:00.000Z',
      status: 'simulated',
      network: 'local-demo',
    });

    await expect(loadPassportReceipts(profileA)).resolves.toEqual([
      expect.objectContaining({ id: 'demo-receipt-a', status: 'simulated' }),
    ]);
    await expect(loadPassportReceipts(profileB)).resolves.toEqual([]);
  });

  it('deduplicates repeated canonical receipt ids without storing private voting data', async () => {
    await savePassportReceipt(profileA, {
      id: 'tx-confirmed-1',
      pollId: 'tierras-rurales',
      createdAt: '2026-08-27T12:00:00.000Z',
      status: 'confirmed',
      network: 'Preview',
      explorerUrl: 'https://explorer.example/tx/1',
    });
    await savePassportReceipt(profileA, {
      id: 'tx-confirmed-1',
      pollId: 'tierras-rurales',
      createdAt: '2026-08-27T12:01:00.000Z',
      status: 'confirmed',
      network: 'Preview',
      explorerUrl: 'https://explorer.example/tx/1',
    });

    const stored = await loadPassportReceipts(profileA);
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toHaveProperty('choice');
    expect(stored[0]).not.toHaveProperty('voterSecret');
    expect(stored[0]).not.toHaveProperty('credentialOpening');
  });

  it('does not create a store entry without an approved profile key', async () => {
    await savePassportReceipt('', {
      id: 'should-not-save',
      createdAt: '2026-08-27T12:00:00.000Z',
      status: 'simulated',
      network: 'local-demo',
    });

    await expect(loadPassportReceipts('')).resolves.toEqual([]);
  });
});
