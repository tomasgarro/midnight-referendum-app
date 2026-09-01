import { describe, expect, it } from 'vitest';
import { summarizeRelayerFunding } from './funding-status.js';

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
