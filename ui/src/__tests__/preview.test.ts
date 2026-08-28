import { describe, expect, it } from 'vitest';
import {
  findRuntimeReferendum,
  getPreviewReadiness,
  getPublicReadiness,
  resolvePassportV2ActionRoute,
} from '../integration/preview';

describe('Preview readiness', () => {
  const base = {
    appMode: 'preview' as const,
    contractAddress: 'mn_contract_test',
    walletConnected: true,
    providersReady: true,
    providersError: null,
  };

  it('requires a deployed contract before wallet approval', () => {
    const readiness = getPreviewReadiness({ ...base, contractAddress: null });
    expect(readiness.state).toBe('blocked');
    expect(readiness.message).toContain('VITE_MIDNIGHT_CONTRACT_ADDRESS');
  });

  it('reports wallet and provider prerequisites separately', () => {
    expect(getPreviewReadiness({ ...base, walletConnected: false }).label).toBe(
      'Preview requiere wallet',
    );
    expect(getPreviewReadiness({ ...base, providersReady: false }).state).toBe('loading');
    expect(
      getPreviewReadiness({ ...base, providersError: 'indexer unavailable' }).message,
    ).toContain('indexer unavailable');
  });

  it('does not demand a wallet when the relayer sponsors the fee', () => {
    // The whole point of the relayer path: a citizen with no wallet can vote.
    const readiness = getPreviewReadiness({ ...base, walletConnected: false, relayerMode: true });
    expect(readiness.state).toBe('ready');
  });

  it('still blocks relayer mode when the relayer itself is unreachable', () => {
    const readiness = getPreviewReadiness({
      ...base,
      walletConnected: false,
      relayerMode: true,
      providersError: 'No se pudo contactar el relayer: fetch failed',
    });
    expect(readiness.state).toBe('blocked');
    expect(readiness.message).toContain('relayer');
  });

  it('still requires a contract in relayer mode', () => {
    const readiness = getPreviewReadiness({
      ...base,
      contractAddress: null,
      walletConnected: false,
      relayerMode: true,
    });
    expect(readiness.state).toBe('blocked');
  });

  it('does not block demo mode on Preview prerequisites', () => {
    const readiness = getPreviewReadiness({
      ...base,
      appMode: 'demo',
      contractAddress: null,
      walletConnected: false,
    });
    expect(readiness.state).toBe('demo');
    expect(readiness.label).toBe('Solo lectura local');
    expect(readiness.message).toContain('no confirma votos');
  });

  it('uses the local Undeployed label and still requires a contract', () => {
    const readiness = getPreviewReadiness({
      ...base,
      appMode: 'undeployed',
      contractAddress: null,
    });
    expect(readiness.state).toBe('blocked');
    expect(readiness.label).toBe('Undeployed local requiere contrato');
    expect(readiness.message).toContain('Undeployed local');
  });

  it('prioritizes provider failures over a disconnected wallet', () => {
    const readiness = getPreviewReadiness({
      ...base,
      walletConnected: false,
      providersError: 'indexer unavailable',
    });
    expect(readiness.label).toBe('Preview no disponible');
    expect(readiness.message).toContain('indexer unavailable');
  });

  it('blocks v2 action routing until a verified credential exists', () => {
    const readiness = getPreviewReadiness({
      ...base,
      v2RuntimeConfigured: true,
      credentialVerified: false,
    });
    expect(readiness.state).toBe('blocked');
    expect(readiness.label).toBe('Preview requiere credencial');
    expect(readiness.message).toContain('No se usará una fixture');
  });

  it('keeps public readiness independent from wallet state', () => {
    const readiness = getPublicReadiness({
      appMode: 'preview',
      contractAddress: 'contract',
      publicProviderReady: true,
    });
    expect(readiness.state).toBe('ready');
    expect(readiness.message).toContain('sin conectar una wallet');
  });

  it('resolves an unambiguous namespaced referendum identity', () => {
    expect(
      findRuntimeReferendum(
        [{ referendumId: 'tierras-rurales:country' }, { referendumId: 'fiscal' }],
        'tierras-rurales',
      )?.referendumId,
    ).toBe('tierras-rurales:country');
    expect(
      findRuntimeReferendum(
        [{ referendumId: 'poll:world' }, { referendumId: 'poll:country' }],
        'poll',
      ),
    ).toBeNull();
  });

  it('never falls back to legacy when an enabled v2 route is incomplete', () => {
    expect(
      resolvePassportV2ActionRoute({
        runtimeConfigured: true,
        credentialVerified: false,
        actionPortAvailable: false,
        referendumId: null,
      }),
    ).toMatchObject({ mode: 'blocked' });
    expect(
      resolvePassportV2ActionRoute({
        runtimeConfigured: true,
        credentialVerified: true,
        actionPortAvailable: true,
        referendumId: 'poll:world',
      }),
    ).toEqual({ mode: 'v2', referendumId: 'poll:world' });
    expect(
      resolvePassportV2ActionRoute({
        runtimeConfigured: false,
        credentialVerified: false,
        actionPortAvailable: false,
        referendumId: null,
      }),
    ).toEqual({ mode: 'legacy' });
  });
});
