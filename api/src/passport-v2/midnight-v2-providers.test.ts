import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReferendumV2WalletProviders } from './midnight-v2-providers.js';

describe('referendum v2 wallet provider configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires an explicit ZK configuration URL outside a browser', async () => {
    vi.stubGlobal('window', undefined);
    const api = { getConfiguration: vi.fn() } as unknown as ConnectedAPI;

    await expect(createReferendumV2WalletProviders(api)).rejects.toThrow(
      /requires zkConfigBaseUrl outside a browser/iu,
    );
    expect(api.getConfiguration).not.toHaveBeenCalled();
  });

  it('rejects a relative ZK configuration URL outside a browser', async () => {
    vi.stubGlobal('window', undefined);
    const api = { getConfiguration: vi.fn() } as unknown as ConnectedAPI;

    await expect(
      createReferendumV2WalletProviders(api, {
        zkConfigBaseUrl: '/managed/referendum-v2',
      }),
    ).rejects.toThrow(/must be an absolute HTTP\(S\) URL outside a browser/iu);
    expect(api.getConfiguration).not.toHaveBeenCalled();
  });
});
