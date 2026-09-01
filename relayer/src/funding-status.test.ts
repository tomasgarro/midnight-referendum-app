import { describe, expect, it } from 'vitest';
import { summarizeRelayerFunding, summarizeRelayerSync } from './funding-status.js';

describe('summarizeRelayerFunding', () => {
  it('distinguishes an unfunded synchronized wallet from an unsynchronized view', () => {
    expect(
      summarizeRelayerFunding({ isSynced: true, nightCoins: [], dustCoins: 0, dustBalance: 0n }),
    ).toMatchObject({ synced: true, readyToRegister: false, readyToSubmit: false });
    expect(
      summarizeRelayerFunding({ isSynced: false, nightCoins: [], dustCoins: 0, dustBalance: 0n }),
    ).toMatchObject({ synced: false, readyToRegister: false, readyToSubmit: false });
  });

  it('reports unregistered NIGHT as registration-ready but not submission-ready', () => {
    expect(
      summarizeRelayerFunding({
        isSynced: true,
        nightCoins: [{ registeredForDustGeneration: false }],
        dustCoins: 0,
        dustBalance: 0n,
      }),
    ).toEqual({
      synced: true,
      nightCoins: 1,
      registeredNightCoins: 0,
      unregisteredNightCoins: 1,
      dustCoins: 0,
      dustBalance: '0',
      readyToRegister: true,
      readyToSubmit: false,
    });
  });

  it('reports positive synchronized DUST as submission-ready', () => {
    expect(
      summarizeRelayerFunding({
        isSynced: true,
        nightCoins: [{ registeredForDustGeneration: true }],
        dustCoins: 2,
        dustBalance: 42n,
      }),
    ).toMatchObject({
      registeredNightCoins: 1,
      unregisteredNightCoins: 0,
      dustCoins: 2,
      dustBalance: '42',
      readyToRegister: false,
      readyToSubmit: true,
    });
  });
});

describe('summarizeRelayerSync', () => {
  it('reports only JSON-safe public sync cursors', () => {
    expect(
      summarizeRelayerSync({
        shielded: {
          appliedIndex: 10n,
          highestRelevantWalletIndex: 9n,
          highestIndex: 12n,
          highestRelevantIndex: 11n,
          isConnected: true,
        },
        unshielded: { appliedId: 7n, highestTransactionId: 8n, isConnected: false },
        dust: {
          appliedIndex: 4n,
          highestRelevantWalletIndex: 3n,
          highestIndex: 6n,
          highestRelevantIndex: 5n,
          isConnected: true,
        },
      }),
    ).toEqual({
      shielded: {
        appliedIndex: '10',
        highestRelevantWalletIndex: '9',
        highestIndex: '12',
        highestRelevantIndex: '11',
        isConnected: true,
      },
      unshielded: { appliedId: '7', highestTransactionId: '8', isConnected: false },
      dust: {
        appliedIndex: '4',
        highestRelevantWalletIndex: '3',
        highestIndex: '6',
        highestRelevantIndex: '5',
        isConnected: true,
      },
    });
  });
});
