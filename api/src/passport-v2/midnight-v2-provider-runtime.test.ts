import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createReferendumV2ProviderRuntime,
  REFERENDUM_V2_EXECUTION_MODES,
} from './midnight-v2-provider-runtime.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function walletApi(overrides: Partial<ConnectedAPI> = {}): ConnectedAPI {
  return {
    getConfiguration: vi.fn(async () => ({
      indexerUri: 'http://localhost:8088/api/v4/graphql',
      indexerWsUri: 'ws://localhost:8088/api/v4/graphql/ws',
      substrateNodeUri: 'http://localhost:9944',
      networkId: 'undeployed',
    })),
    getShieldedAddresses: vi.fn(async () => ({
      shieldedCoinPublicKey: 'coin-key',
      shieldedEncryptionPublicKey: 'encryption-key',
    })),
    getProvingProvider: vi.fn(async () => ({}) as never),
    ...overrides,
  } as unknown as ConnectedAPI;
}

describe('referendum v2 provider runtime composition', () => {
  it('exposes exactly the direct and sponsored execution modes', () => {
    expect(REFERENDUM_V2_EXECUTION_MODES).toEqual(['direct-wallet', 'sponsored-wallet']);
  });

  it('dispatches direct-wallet to Lace-backed providers', async () => {
    vi.stubGlobal('window', undefined);
    const api = walletApi();

    const runtime = await createReferendumV2ProviderRuntime({
      mode: 'direct-wallet',
      api,
      options: { zkConfigBaseUrl: 'http://localhost:4173/managed/referendum-v2' },
    });

    expect(runtime.mode).toBe('direct-wallet');
    expect(runtime.providers.walletProvider).toBeDefined();
    expect(api.getProvingProvider).toHaveBeenCalledOnce();
  });

  it('dispatches sponsored-wallet to Lace proving plus the atomic relay', async () => {
    vi.stubGlobal('window', undefined);
    const api = walletApi();
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith('/keys')) {
        return response(200, { coinPublicKey: 'coin-key', encryptionPublicKey: 'encryption-key' });
      }
      throw new Error(`unexpected URL ${String(input)}`);
    }) as typeof fetch;

    const runtime = await createReferendumV2ProviderRuntime({
      mode: 'sponsored-wallet',
      api,
      options: {
        relayUrl: 'http://localhost:8790',
        networkId: 'undeployed',
        indexerUri: 'http://localhost:8088/api/v4/graphql',
        indexerWsUri: 'ws://localhost:8088/api/v4/graphql/ws',
        capabilityIssuer: { issue: vi.fn(async () => 'capability') },
        zkConfigBaseUrl: 'http://localhost:4173/managed/referendum-v2',
        fetchImpl,
      },
    });

    expect(runtime.mode).toBe('sponsored-wallet');
    if (runtime.mode !== 'sponsored-wallet') {
      throw new Error('Expected the sponsored-wallet runtime');
    }
    expect(runtime.actionContext).toBeDefined();
    expect(runtime.getLastActionTrace()).toBeNull();
    expect(api.getProvingProvider).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
