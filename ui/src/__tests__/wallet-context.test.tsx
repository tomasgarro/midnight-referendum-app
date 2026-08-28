import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletWidget } from '../components/wallet-widget';
import { useWallet } from '../hooks/use-wallet';
import {
  discoverCompatibleWallets,
  discoverWallets,
  isCompatibleWalletApi,
  parsePreferredWalletRdns,
  selectWallet,
} from '../integration/wallet-discovery';
import { classifyWalletError, WalletProvider } from '../providers/wallet-context';

function TestConsumer() {
  const {
    status,
    walletName,
    networkId,
    shieldedAddress,
    error,
    errorCode,
    actionPermissionsGranted,
    connect,
    reconnect,
    requestActionPermissions,
    disconnect,
  } = useWallet();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="wallet">{walletName ?? 'none'}</span>
      <span data-testid="network">{networkId ?? 'none'}</span>
      <span data-testid="address">{shieldedAddress ?? 'none'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="error-code">{errorCode ?? 'none'}</span>
      <span data-testid="action-permissions">{actionPermissionsGranted ? 'yes' : 'no'}</span>
      <button type="button" onClick={() => void connect()}>
        connect
      </button>
      <button type="button" onClick={disconnect}>
        disconnect
      </button>
      <button type="button" onClick={() => void reconnect()}>
        reconnect
      </button>
      <button type="button" onClick={() => void requestActionPermissions()}>
        request action permissions
      </button>
    </div>
  );
}

function connectorError(code: string, reason = 'wallet-private-detail') {
  return { type: 'DAppConnectorAPIError', code, reason };
}

function connectedApi(address: string, status = 'connected', networkId = 'preview') {
  return {
    getConfiguration: vi.fn().mockResolvedValue({
      indexerUri: 'http://localhost:8088/api/v3/graphql',
      indexerWsUri: 'ws://localhost:8088/api/v3/graphql/ws',
      substrateNodeUri: 'http://localhost:9944',
      networkId,
    }),
    getConnectionStatus: vi.fn().mockResolvedValue({ status, networkId }),
    hintUsage: vi.fn().mockResolvedValue(undefined),
    getShieldedAddresses: vi.fn().mockResolvedValue({
      shieldedAddress: address,
      shieldedCoinPublicKey: 'coinpub123',
      shieldedEncryptionPublicKey: 'encpub123',
    }),
  };
}

describe('WalletContext', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as unknown as Record<string, unknown>).midnight;
  });

  it('supports a provider-neutral wallet preference by connector RDNS', () => {
    const first = { rdns: 'com.example.first' } as never;
    const preferred = { rdns: 'io.example.preferred' } as never;

    expect(parsePreferredWalletRdns(' IO.Example.Preferred, com.example.first ')).toEqual([
      'io.example.preferred',
      'com.example.first',
    ]);
    expect(selectWallet([first, preferred], ['io.example.preferred'])).toBe(preferred);
    expect(selectWallet([first, preferred])).toBe(first);
  });

  it('ignores malformed injected entries before selecting a connector', () => {
    const valid = {
      apiVersion: '4.0.1',
      connect: vi.fn(),
      icon: '',
      name: 'Example Wallet',
      rdns: 'com.example.wallet',
    };
    const source = {
      midnight: {
        malformed: { connect: vi.fn() },
        valid,
      },
    } as unknown as Window;

    expect(discoverWallets(source)).toEqual([valid]);
    expect(isCompatibleWalletApi(valid)).toBe(true);
    expect(isCompatibleWalletApi({ ...valid, apiVersion: '3.1.0' })).toBe(false);
    expect(isCompatibleWalletApi({ ...valid, apiVersion: '4.foo' })).toBe(false);
    expect(isCompatibleWalletApi({ ...valid, apiVersion: '4.0' })).toBe(false);
    expect(isCompatibleWalletApi({ ...valid, apiVersion: ' 4.0.1+build.7 ' })).toBe(true);
    expect(isCompatibleWalletApi({ ...valid, apiVersion: '4.0.1-beta.1' })).toBe(true);
  });

  it('sanitizes connector metadata and flags duplicate wallet identifiers', () => {
    const source = {
      midnight: {
        first: {
          apiVersion: '4.0.1',
          connect: vi.fn(),
          icon: 'javascript:alert(1)',
          name: '  First   Wallet\n',
          rdns: 'COM.EXAMPLE.WALLET',
        },
        second: {
          apiVersion: '4.0.1',
          connect: vi.fn(),
          icon: 'https://wallet.example/icon.png',
          name: 'Second Wallet',
          rdns: 'com.example.wallet',
        },
      },
    } as unknown as Window;

    expect(discoverCompatibleWallets(source)).toMatchObject([
      {
        name: 'First Wallet',
        icon: null,
        duplicateRdns: true,
      },
      {
        name: 'Second Wallet',
        icon: 'https://wallet.example/icon.png',
        duplicateRdns: true,
      },
    ]);
  });

  it('never contacts an injected wallet when the runtime is explicitly disabled', async () => {
    const connect = vi.fn();
    (window as unknown as Record<string, unknown>).midnight = { blocked: { connect } };
    localStorage.setItem('midnight-referendum_wallet_autoconnect', 'true');
    const user = userEvent.setup();

    render(
      <WalletProvider runtimeEnabled={false}>
        <TestConsumer />
      </WalletProvider>,
    );

    expect(connect).not.toHaveBeenCalled();
    await user.click(screen.getByText('connect'));
    expect(connect).not.toHaveBeenCalled();
    expect(screen.getByTestId('error').textContent).toContain('deshabilitada');
  });

  it('starts disconnected', () => {
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    expect(screen.getByTestId('status').textContent).toBe('disconnected');
    expect(screen.getByTestId('address').textContent).toBe('none');
  });

  it('shows an actionable error when no wallet is found', async () => {
    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    await user.click(screen.getByText('connect'));
    expect(screen.getByTestId('status').textContent).toBe('error');
    expect(screen.getByTestId('error').textContent).toContain('wallet compatible');
  });

  it('classifies connector errors without exposing the wallet reason', () => {
    const info = classifyWalletError(connectorError('PermissionRejected', '<secret>'));
    expect(info).toMatchObject({
      code: 'PermissionRejected',
      recoverable: true,
      retryable: false,
    });
    expect(info.message).not.toContain('<secret>');
    expect(classifyWalletError(connectorError('Rejected')).retryable).toBe(true);
    expect(classifyWalletError(new Error('wallet internals')).code).toBe('Unknown');
  });

  it('requires a user choice when several compatible wallets are injected', async () => {
    const mockApi = {
      getConfiguration: vi.fn().mockResolvedValue({
        indexerUri: 'http://localhost:8088/api/v3/graphql',
        indexerWsUri: 'ws://localhost:8088/api/v3/graphql/ws',
        substrateNodeUri: 'http://localhost:9944',
        networkId: 'preview',
      }),
      getConnectionStatus: vi.fn().mockResolvedValue({
        status: 'connected',
        networkId: 'preview',
      }),
      hintUsage: vi.fn().mockResolvedValue(undefined),
      getShieldedAddresses: vi.fn().mockResolvedValue({
        shieldedAddress: 'mn_shield_test1chosen',
        shieldedCoinPublicKey: 'coinpub123',
        shieldedEncryptionPublicKey: 'encpub123',
      }),
    };
    const firstConnect = vi.fn().mockResolvedValue(mockApi);
    const secondConnect = vi.fn().mockResolvedValue(mockApi);
    (window as unknown as Record<string, unknown>).midnight = {
      first: {
        name: 'First Wallet',
        apiVersion: '4.0.1',
        icon: '',
        rdns: 'com.example.first',
        connect: firstConnect,
      },
      second: {
        name: 'Second Wallet',
        apiVersion: '4.0.1',
        icon: '',
        rdns: 'com.example.second',
        connect: secondConnect,
      },
    };

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
        <WalletWidget compact />
      </WalletProvider>,
    );
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Wallet' })).toBeTruthy());
    const trigger = screen.getByRole('button', { name: 'Wallet' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Elegí tu wallet' })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Elegí tu wallet' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole('dialog', { name: 'Elegí tu wallet' })).toBeNull();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: /Second Wallet Connector/ }));
    await vi.waitFor(() => expect(screen.getByTestId('status').textContent).toBe('connected'));
    expect(firstConnect).not.toHaveBeenCalled();
    expect(secondConnect).toHaveBeenCalledWith('preview');
  });

  it('groups duplicate RDNS instances until the user chooses a concrete connector', async () => {
    const mockApi = {
      getConfiguration: vi.fn().mockResolvedValue({
        indexerUri: 'http://localhost:8088/api/v3/graphql',
        indexerWsUri: 'ws://localhost:8088/api/v3/graphql/ws',
        substrateNodeUri: 'http://localhost:9944',
        networkId: 'preview',
      }),
      getConnectionStatus: vi.fn().mockResolvedValue({ status: 'connected', networkId: 'preview' }),
      hintUsage: vi.fn().mockResolvedValue(undefined),
      getShieldedAddresses: vi.fn().mockResolvedValue({
        shieldedAddress: 'mn_shield_duplicate',
        shieldedCoinPublicKey: 'coinpub123',
        shieldedEncryptionPublicKey: 'encpub123',
      }),
    };
    const firstConnect = vi.fn().mockResolvedValue(mockApi);
    const secondConnect = vi.fn().mockResolvedValue(mockApi);
    (window as unknown as Record<string, unknown>).midnight = {
      first: {
        name: 'Lace',
        apiVersion: '4.0.1',
        icon: '',
        rdns: 'com.example.shared',
        connect: firstConnect,
      },
      second: {
        name: 'Lace',
        apiVersion: '4.0.1',
        icon: '',
        rdns: 'com.example.shared',
        connect: secondConnect,
      },
    };

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
        <WalletWidget compact />
      </WalletProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Wallet' }));
    expect(screen.getByRole('alert').textContent).toMatch(/comparten un identificador/i);
    expect(screen.getByRole('button', { name: /2 conexiones/i })).toBeTruthy();
    expect(firstConnect).not.toHaveBeenCalled();
    expect(secondConnect).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /2 conexiones/i }));
    await user.click(screen.getByRole('button', { name: /conexión 2/i }));
    await vi.waitFor(() => expect(screen.getByTestId('status').textContent).toBe('connected'));
    expect(firstConnect).not.toHaveBeenCalled();
    expect(secondConnect).toHaveBeenCalledWith('preview');
  });

  it('connects successfully with a Preview wallet', async () => {
    const mockApi = {
      getConfiguration: vi.fn().mockResolvedValue({
        indexerUri: 'http://localhost:8088/api/v3/graphql',
        indexerWsUri: 'ws://localhost:8088/api/v3/graphql/ws',
        substrateNodeUri: 'http://localhost:9944',
        networkId: 'preview',
      }),
      getConnectionStatus: vi.fn().mockResolvedValue({
        status: 'connected',
        networkId: 'preview',
      }),
      hintUsage: vi.fn().mockResolvedValue(undefined),
      getShieldedAddresses: vi.fn().mockResolvedValue({
        shieldedAddress: 'mn_shield_test1abc123',
        shieldedCoinPublicKey: 'coinpub123',
        shieldedEncryptionPublicKey: 'encpub123',
      }),
    };

    (window as unknown as Record<string, unknown>).midnight = {
      mnLace: {
        name: 'Lace',
        apiVersion: '4.0.0',
        icon: '',
        rdns: 'lace',
        connect: vi.fn().mockResolvedValue(mockApi),
      },
    };

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    await user.click(screen.getByText('connect'));
    await vi.waitFor(() => expect(screen.getByTestId('status').textContent).toBe('connected'));
    expect(screen.getByTestId('wallet').textContent).toBe('Lace');
    expect(screen.getByTestId('network').textContent).toBe('preview');
    expect(screen.getByTestId('address').textContent).toContain('mn_shield_test1abc123');
    expect(mockApi.hintUsage).toHaveBeenCalledWith([
      'getConfiguration',
      'getConnectionStatus',
      'getShieldedAddresses',
    ]);
  });

  it('requests proving and submission permissions only at an explicit action boundary', async () => {
    const api = connectedApi('mn_shield_action');
    const wallet = {
      name: 'Lace',
      apiVersion: '4.0.1',
      icon: '',
      rdns: 'com.example.lace',
      connect: vi.fn().mockResolvedValue(api),
    };
    (window as unknown as Record<string, unknown>).midnight = { wallet };

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    await user.click(screen.getByText('connect'));
    await vi.waitFor(() => expect(screen.getByTestId('status').textContent).toBe('connected'));
    expect(api.hintUsage).toHaveBeenCalledTimes(1);
    expect(api.hintUsage).not.toHaveBeenCalledWith([
      'getProvingProvider',
      'balanceUnsealedTransaction',
      'submitTransaction',
    ]);

    await user.click(screen.getByText('request action permissions'));
    await vi.waitFor(() =>
      expect(screen.getByTestId('action-permissions').textContent).toBe('yes'),
    );
    expect(api.hintUsage).toHaveBeenLastCalledWith([
      'getProvingProvider',
      'balanceUnsealedTransaction',
      'submitTransaction',
    ]);
  });

  it('keeps the latest concurrent wallet attempt authoritative', async () => {
    let resolveFirst!: (api: ReturnType<typeof connectedApi>) => void;
    let resolveSecond!: (api: ReturnType<typeof connectedApi>) => void;
    const first = new Promise<ReturnType<typeof connectedApi>>((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise<ReturnType<typeof connectedApi>>((resolve) => {
      resolveSecond = resolve;
    });
    const connect = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    (window as unknown as Record<string, unknown>).midnight = {
      wallet: {
        name: 'Race Wallet',
        apiVersion: '4.0.1',
        icon: '',
        rdns: 'com.example.race',
        connect,
      },
    };

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    await user.click(screen.getByText('connect'));
    await user.click(screen.getByText('connect'));
    await act(async () => {
      resolveSecond(connectedApi('mn_shield_second'));
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(screen.getByTestId('address').textContent).toContain('second'));
    await act(async () => {
      resolveFirst(connectedApi('mn_shield_first'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('address').textContent).toContain('second');
    expect(screen.getByTestId('status').textContent).toBe('connected');
  });

  it('rejects a connector that reports the wrong network before exposing it', async () => {
    const wrongNetworkApi = {
      hintUsage: vi.fn().mockResolvedValue(undefined),
      getConnectionStatus: vi.fn().mockResolvedValue({
        status: 'connected',
        networkId: 'mainnet',
      }),
      getConfiguration: vi.fn(),
      getShieldedAddresses: vi.fn(),
    };
    (window as unknown as Record<string, unknown>).midnight = {
      wrongNetwork: {
        name: 'Wrong Network Wallet',
        apiVersion: '4.0.1',
        icon: '',
        rdns: 'com.example.wrong-network',
        connect: vi.fn().mockResolvedValue(wrongNetworkApi),
      },
    };

    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    await user.click(screen.getByText('connect'));
    await vi.waitFor(() => expect(screen.getByTestId('status').textContent).toBe('wrong-network'));
    expect(screen.getByTestId('error').textContent).toContain('mainnet');
    expect(wrongNetworkApi.getConfiguration).not.toHaveBeenCalled();
    expect(screen.getByTestId('wallet').textContent).toBe('none');
  });

  it('exposes reconnecting when the connector reports a lost connection', async () => {
    const wallet = {
      name: 'Disconnected Wallet',
      apiVersion: '4.0.1',
      icon: '',
      rdns: 'com.example.disconnected',
      connect: vi.fn().mockRejectedValue(connectorError('Disconnected')),
    };
    (window as unknown as Record<string, unknown>).midnight = { wallet };
    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    await user.click(screen.getByText('connect'));
    await vi.waitFor(() => expect(screen.getByTestId('status').textContent).toBe('reconnecting'));
    expect(screen.getByTestId('error-code').textContent).toBe('Disconnected');
    expect(screen.getByTestId('error').textContent).not.toContain('wallet-private-detail');
  });

  it('detects a network drift during the periodic connection check', async () => {
    let tick: (() => void) | null = null;
    const intervalSpy = vi.spyOn(window, 'setInterval').mockImplementation(((
      callback: TimerHandler,
    ) => {
      tick = callback as () => void;
      return 1;
    }) as typeof window.setInterval);
    try {
      const api = connectedApi('mn_shield_drift');
      api.getConnectionStatus
        .mockResolvedValueOnce({ status: 'connected', networkId: 'preview' })
        .mockResolvedValueOnce({ status: 'connected', networkId: 'mainnet' });
      (window as unknown as Record<string, unknown>).midnight = {
        wallet: {
          name: 'Drift Wallet',
          apiVersion: '4.0.1',
          icon: '',
          rdns: 'com.example.drift',
          connect: vi.fn().mockResolvedValue(api),
        },
      };
      // The polling callback is captured so this test stays fast without
      // changing the production polling interval.
      const interactiveUser = userEvent.setup();
      render(
        <WalletProvider>
          <TestConsumer />
        </WalletProvider>,
      );
      await interactiveUser.click(screen.getByText('connect'));
      await vi.waitFor(() => expect(screen.getByTestId('status').textContent).toBe('connected'));
      expect(tick).not.toBeNull();
      api.getConnectionStatus.mockResolvedValueOnce({ status: 'connected', networkId: 'mainnet' });
      await act(async () => {
        tick?.();
        await Promise.resolve();
      });
      await vi.waitFor(() =>
        expect(screen.getByTestId('status').textContent).toBe('wrong-network'),
      );
      expect(screen.getByTestId('error-code').textContent).toBe('WrongNetwork');
    } finally {
      intervalSpy.mockRestore();
    }
  });

  it('disconnects and clears state', async () => {
    const user = userEvent.setup();
    render(
      <WalletProvider>
        <TestConsumer />
      </WalletProvider>,
    );
    await user.click(screen.getByText('disconnect'));
    expect(screen.getByTestId('status').textContent).toBe('disconnected');
    expect(screen.getByTestId('address').textContent).toBe('none');
  });
});
