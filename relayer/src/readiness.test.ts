import { describe, expect, it } from 'vitest';
import { evaluateRelayerReadiness } from './readiness.js';

describe('relayer sponsored-path readiness', () => {
  it('does not report ready before the wallet has produced state', () => {
    expect(evaluateRelayerReadiness({ state: null, v2Enabled: true })).toMatchObject({
      ready: false,
      synced: false,
      dustFunded: false,
      reasons: ['wallet_starting', 'dust_unfunded'],
    });
  });

  it('keeps an active but unsynced wallet out of the public path', () => {
    expect(
      evaluateRelayerReadiness({
        state: { isSynced: false, dustBalance: 10n },
        v2Enabled: true,
      }),
    ).toMatchObject({ ready: false, reasons: ['wallet_syncing'] });
  });

  it('requires positive DUST and the v2 capability service', () => {
    expect(
      evaluateRelayerReadiness({
        state: { isSynced: true, dustBalance: 0n },
        v2Enabled: false,
      }),
    ).toMatchObject({ ready: false, reasons: ['dust_unfunded', 'v2_disabled'] });
  });

  it('reports ready only for a synced, funded v2 wallet', () => {
    expect(
      evaluateRelayerReadiness({
        state: { isSynced: true, dustBalance: 1n },
        v2Enabled: true,
      }),
    ).toEqual({
      ready: true,
      synced: true,
      dustFunded: true,
      v2Enabled: true,
      reasons: [],
    });
  });
});
