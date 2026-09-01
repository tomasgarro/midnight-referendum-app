import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProviders, createRelayerProviders } from './index.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('legacy provider boundaries', () => {
  it('does not allow an HTTP proof provider in the browser wallet path', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } });
    const api = { getConfiguration: vi.fn() } as unknown as ConnectedAPI;

    await expect(createProviders(api, { proofServerUri: 'https://proof.test' })).rejects.toThrow(
      /HTTP proof providers are unavailable in a browser/iu,
    );
    expect(api.getConfiguration).not.toHaveBeenCalled();
  });

  it('does not allow the compatibility relayer provider in the browser', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://app.test' } });

    await expect(
      createRelayerProviders({
        relayerUrl: 'https://relay.test',
        proofServerUri: 'https://proof.test',
        networkId: 'preview',
        indexerUri: 'https://indexer.test/graphql',
        indexerWsUri: 'wss://indexer.test/graphql',
      }),
    ).rejects.toThrow(/legacy relayer provider is unavailable in a browser/iu);
  });
});
