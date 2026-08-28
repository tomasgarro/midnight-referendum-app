import type {
  APIError,
  ConnectedAPI,
  ErrorCode,
  InitialAPI,
  WalletConnectedAPI,
} from '@midnight-ntwrk/dapp-connector-api';
import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { resolveAppMode } from '@/integration/app-mode';
import {
  discoverCompatibleWallets,
  parsePreferredWalletRdns,
  selectWallet,
  type WalletCandidate,
} from '@/integration/wallet-discovery';

const APP_MODE = resolveAppMode(import.meta.env.MODE, import.meta.env.VITE_APP_MODE);
const PREFERRED_WALLET_RDNS = parsePreferredWalletRdns(
  import.meta.env.VITE_MIDNIGHT_PREFERRED_WALLET_RDNS,
);
const CONFIGURED_NETWORK_ID = import.meta.env.VITE_MIDNIGHT_NETWORK?.trim();
const TARGET_NETWORK_ID =
  APP_MODE === 'undeployed'
    ? CONFIGURED_NETWORK_ID || 'undeployed'
    : APP_MODE === 'preview'
      ? CONFIGURED_NETWORK_ID || 'preview'
      : 'preview';

export type WalletConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'wrong-network'
  | 'reconnecting'
  | 'error';

export type WalletErrorCode = ErrorCode | 'WrongNetwork' | 'Unknown';

export interface WalletErrorInfo {
  readonly code: WalletErrorCode;
  readonly message: string;
  readonly recoverable: boolean;
  readonly retryable: boolean;
}

const CONNECTOR_ERROR_MESSAGES: Record<ErrorCode, Omit<WalletErrorInfo, 'code'>> = {
  InternalError: {
    message: 'La wallet encontró un error interno. Revisá la wallet y probá de nuevo.',
    recoverable: true,
    retryable: true,
  },
  InvalidRequest: {
    message: 'La solicitud a la wallet no es válida. Actualizá la app y probá de nuevo.',
    recoverable: false,
    retryable: false,
  },
  PermissionRejected: {
    message: 'La wallet no concedió los permisos solicitados. Podés continuar sin esa función.',
    recoverable: true,
    retryable: false,
  },
  Rejected: {
    message: 'Rechazaste la solicitud en la wallet. Podés intentarlo otra vez.',
    recoverable: true,
    retryable: true,
  },
  Disconnected: {
    message: 'La conexión con la wallet se perdió. Volvé a conectarla para continuar.',
    recoverable: true,
    retryable: true,
  },
};

const READ_ONLY_HINTS = [
  'getConfiguration',
  'getConnectionStatus',
  'getShieldedAddresses',
] as const satisfies readonly (keyof WalletConnectedAPI)[];

const ACTION_HINTS = [
  'getProvingProvider',
  'balanceUnsealedTransaction',
  'submitTransaction',
] as const satisfies readonly (keyof WalletConnectedAPI)[];

const CONNECTOR_ERROR_CODES = new Set<ErrorCode>([
  'InternalError',
  'InvalidRequest',
  'PermissionRejected',
  'Rejected',
  'Disconnected',
]);

export function isDAppConnectorError(error: unknown): error is APIError {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as Record<string, unknown>;
  return (
    candidate.type === 'DAppConnectorAPIError' &&
    typeof candidate.code === 'string' &&
    CONNECTOR_ERROR_CODES.has(candidate.code as ErrorCode)
  );
}

/**
 * Converts connector failures into a stable, user-safe error taxonomy. The
 * wallet-provided `reason` is deliberately not rendered: it crosses an
 * extension boundary and is not a stable or trusted UI string.
 */
export function classifyWalletError(error: unknown): WalletErrorInfo {
  if (isDAppConnectorError(error)) {
    return { code: error.code, ...CONNECTOR_ERROR_MESSAGES[error.code] };
  }
  return {
    code: 'Unknown',
    message: 'No se pudo completar la conexión con la wallet. Probá de nuevo.',
    recoverable: true,
    retryable: true,
  };
}

function connectorErrorInfo(code: ErrorCode): WalletErrorInfo {
  return { code, ...CONNECTOR_ERROR_MESSAGES[code] };
}

function networkLabel(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return 'desconocida';
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._:-]/g, '')
      .slice(0, 64) || 'desconocida'
  );
}

function wrongNetworkInfo(actual: unknown, expected: string): WalletErrorInfo {
  return {
    code: 'WrongNetwork',
    message: `La wallet está conectada a ${networkLabel(actual)}, pero esta app requiere ${networkLabel(expected)}. Cambiá de red en la wallet y reintentá.`,
    recoverable: true,
    retryable: true,
  };
}

function unknownInfo(message: string): WalletErrorInfo {
  return {
    code: 'Unknown',
    message,
    recoverable: true,
    retryable: true,
  };
}

export interface WalletState {
  status: WalletConnectionStatus;
  connectedApi: ConnectedAPI | null;
  /** Display-only metadata from the selected DApp Connector instance. */
  walletName: string | null;
  walletRdns: string | null;
  walletApiVersion: string | null;
  shieldedAddress: string | null;
  coinPublicKey: string | null;
  encryptionPublicKey: string | null;
  networkId: string | null;
  dustBalance: bigint | null;
  dustCap: bigint | null;
  error: string | null;
  errorCode: WalletErrorCode | null;
  errorRecoverable: boolean;
  errorRetryable: boolean;
  actionPermissionsGranted: boolean;
}

export interface WalletContextValue extends WalletState {
  connect: (wallet?: InitialAPI) => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => void;
  /** Explicitly enters the live-action boundary before wallet discovery. */
  enableWalletDiscovery: () => WalletCandidate[];
  refreshBalances: () => Promise<void>;
  /** Requests transaction/proving permissions only at an explicit action boundary. */
  requestActionPermissions: () => Promise<boolean>;
  refreshWallets: () => WalletCandidate[];
  availableWallets: WalletCandidate[];
}

export const WalletContext = createContext<WalletContextValue | null>(null);

const EMPTY_WALLET_STATE: WalletState = {
  status: 'disconnected',
  connectedApi: null,
  walletName: null,
  walletRdns: null,
  walletApiVersion: null,
  shieldedAddress: null,
  coinPublicKey: null,
  encryptionPublicKey: null,
  networkId: null,
  dustBalance: null,
  dustCap: null,
  error: null,
  errorCode: null,
  errorRecoverable: false,
  errorRetryable: false,
  actionPermissionsGranted: false,
};

function findWallet(
  wallets: readonly WalletCandidate[],
  requested?: InitialAPI,
): InitialAPI | undefined {
  if (requested) {
    return wallets.some((candidate) => candidate.wallet === requested) ? requested : undefined;
  }
  return selectWallet(
    wallets.map((candidate) => candidate.wallet),
    PREFERRED_WALLET_RDNS,
  );
}

export function WalletProvider({
  children,
  runtimeEnabled = true,
}: {
  children: ReactNode;
  /** Public demo/showcase builds pass false so injected wallets cannot be contacted. */
  runtimeEnabled?: boolean;
}) {
  const [state, setState] = useState<WalletState>(EMPTY_WALLET_STATE);
  const [availableWallets, setAvailableWallets] = useState<WalletCandidate[]>([]);
  const connectionAttempt = useRef(0);
  const connectedApiRef = useRef<ConnectedAPI | null>(null);
  const lastWalletRef = useRef<InitialAPI | null>(null);
  const lastWalletRdnsRef = useRef<string | null>(null);

  const refreshWallets = useCallback(() => {
    if (!runtimeEnabled) {
      setAvailableWallets([]);
      return [];
    }
    const discoveredWallets = discoverCompatibleWallets();
    setAvailableWallets(discoveredWallets);
    return discoveredWallets;
  }, [runtimeEnabled]);

  const enableWalletDiscovery = useCallback(() => refreshWallets(), [refreshWallets]);

  const refreshBalances = useCallback(async () => {
    if (!state.connectedApi || typeof state.connectedApi.getDustBalance !== 'function') return;
    try {
      const dust = await state.connectedApi.getDustBalance();
      setState((prev) => ({ ...prev, dustBalance: dust.balance, dustCap: dust.cap }));
    } catch {
      // A wallet may expose the connector without exposing balance APIs yet.
      // Connection should remain usable; the transaction flow will surface any
      // balancing error from the wallet itself.
    }
  }, [state.connectedApi]);

  const connect = useCallback(
    async (requestedWallet?: InitialAPI) => {
      const attempt = ++connectionAttempt.current;
      if (!runtimeEnabled) {
        connectedApiRef.current = null;
        setState({
          ...EMPTY_WALLET_STATE,
          status: 'error',
          error: 'La wallet está deshabilitada en este showcase público.',
          errorCode: 'Unknown',
          errorRecoverable: false,
          errorRetryable: false,
        });
        return;
      }
      connectedApiRef.current = null;
      setState({
        ...EMPTY_WALLET_STATE,
        status: 'connecting',
      });

      const discoveredWallets = discoverCompatibleWallets();
      setAvailableWallets(discoveredWallets);
      const wallet = findWallet(discoveredWallets, requestedWallet);
      if (!wallet) {
        if (attempt !== connectionAttempt.current) return;
        const info = unknownInfo(
          discoveredWallets.length > 1 && !requestedWallet
            ? 'Encontramos varias wallets de Midnight. Elegí una para continuar.'
            : 'No encontramos una wallet de Midnight. Instalá una wallet compatible para continuar.',
        );
        setState({
          ...EMPTY_WALLET_STATE,
          status: 'error',
          error: info.message,
          errorCode: info.code,
          errorRecoverable: info.recoverable,
          errorRetryable: info.retryable,
        });
        return;
      }
      lastWalletRef.current = wallet;
      lastWalletRdnsRef.current = wallet.rdns;

      try {
        const api = await wallet.connect(TARGET_NETWORK_ID);
        // Only hint permissions needed to render a connected read-only
        // session. Proving/balancing/submission permissions are requested by
        // requestActionPermissions immediately before a transaction flow.
        try {
          await api.hintUsage([...READ_ONLY_HINTS]);
        } catch {
          // Hints are advisory. A wallet may not implement them or may deny a
          // read-only hint while still allowing a usable connection.
        }
        const connection = await api.getConnectionStatus();
        if (connection.status !== 'connected') {
          throw connectorErrorInfo('Disconnected');
        }
        if (connection.networkId !== TARGET_NETWORK_ID) {
          if (attempt !== connectionAttempt.current) return;
          const info = wrongNetworkInfo(connection.networkId, TARGET_NETWORK_ID);
          connectedApiRef.current = null;
          setState({
            ...EMPTY_WALLET_STATE,
            status: 'wrong-network',
            error: info.message,
            errorCode: info.code,
            errorRecoverable: info.recoverable,
            errorRetryable: info.retryable,
          });
          return;
        }
        const config = await api.getConfiguration();
        if (config.networkId !== TARGET_NETWORK_ID) {
          if (attempt !== connectionAttempt.current) return;
          const info = wrongNetworkInfo(config.networkId, TARGET_NETWORK_ID);
          connectedApiRef.current = null;
          setState({
            ...EMPTY_WALLET_STATE,
            status: 'wrong-network',
            error: info.message,
            errorCode: info.code,
            errorRecoverable: info.recoverable,
            errorRetryable: info.retryable,
          });
          return;
        }
        const addresses = await api.getShieldedAddresses();
        let dustBalance: bigint | null = null;
        let dustCap: bigint | null = null;
        try {
          const dust = await api.getDustBalance();
          dustBalance = dust.balance;
          dustCap = dust.cap;
        } catch {
          // Keep the wallet connected when balance discovery is unavailable.
        }

        if (attempt !== connectionAttempt.current) return;
        connectedApiRef.current = api;
        setState({
          status: 'connected',
          connectedApi: api,
          walletName: wallet.name,
          walletRdns: wallet.rdns,
          walletApiVersion: wallet.apiVersion,
          shieldedAddress: addresses.shieldedAddress,
          coinPublicKey: addresses.shieldedCoinPublicKey,
          encryptionPublicKey: addresses.shieldedEncryptionPublicKey,
          networkId: config.networkId,
          dustBalance,
          dustCap,
          error: null,
          errorCode: null,
          errorRecoverable: false,
          errorRetryable: false,
          actionPermissionsGranted: false,
        });
      } catch (err: unknown) {
        if (attempt !== connectionAttempt.current) return;
        const info =
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: unknown }).code === 'Disconnected'
            ? connectorErrorInfo('Disconnected')
            : classifyWalletError(err);
        const status: WalletConnectionStatus =
          info.code === 'Disconnected' ? 'reconnecting' : 'error';
        connectedApiRef.current = null;
        setState({
          ...EMPTY_WALLET_STATE,
          status,
          error: info.message,
          errorCode: info.code,
          errorRecoverable: info.recoverable,
          errorRetryable: info.retryable,
        });
      }
    },
    [runtimeEnabled],
  );

  const reconnect = useCallback(() => {
    const lastWallet = lastWalletRef.current;
    const preferredRdns = lastWalletRdnsRef.current;
    const replacement = discoverCompatibleWallets().find(
      (candidate) =>
        candidate.wallet === lastWallet ||
        (preferredRdns !== null && candidate.rdns.toLowerCase() === preferredRdns.toLowerCase()),
    );
    return connect(replacement?.wallet);
  }, [connect]);

  const disconnect = useCallback(() => {
    connectionAttempt.current += 1;
    connectedApiRef.current = null;
    lastWalletRef.current = null;
    lastWalletRdnsRef.current = null;
    setState(EMPTY_WALLET_STATE);
  }, []);

  const requestActionPermissions = useCallback(async (): Promise<boolean> => {
    const api = connectedApiRef.current;
    if (!api) {
      const info = unknownInfo('Conectá una wallet antes de iniciar una acción.');
      setState((prev) => ({
        ...prev,
        error: info.message,
        errorCode: info.code,
        errorRecoverable: info.recoverable,
        errorRetryable: info.retryable,
      }));
      return false;
    }

    try {
      await api.hintUsage([...ACTION_HINTS]);
      if (connectedApiRef.current !== api) return false;
      setState((prev) =>
        prev.connectedApi === api
          ? {
              ...prev,
              actionPermissionsGranted: true,
              error: null,
              errorCode: null,
              errorRecoverable: false,
              errorRetryable: false,
            }
          : prev,
      );
      return true;
    } catch (err: unknown) {
      if (connectedApiRef.current !== api) return false;
      const info = classifyWalletError(err);
      if (info.code === 'Disconnected') {
        connectionAttempt.current += 1;
        connectedApiRef.current = null;
        setState({
          ...EMPTY_WALLET_STATE,
          status: 'reconnecting',
          error: info.message,
          errorCode: info.code,
          errorRecoverable: info.recoverable,
          errorRetryable: info.retryable,
        });
      } else {
        setState((prev) =>
          prev.connectedApi === api
            ? {
                ...prev,
                error: info.message,
                errorCode: info.code,
                errorRecoverable: info.recoverable,
                errorRetryable: info.retryable,
              }
            : prev,
        );
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (!runtimeEnabled) setAvailableWallets([]);
  }, [runtimeEnabled]);

  useEffect(() => {
    if (!runtimeEnabled) {
      connectionAttempt.current += 1;
      connectedApiRef.current = null;
      lastWalletRef.current = null;
      lastWalletRdnsRef.current = null;
      setState((prev) => (prev.status === 'disconnected' ? prev : EMPTY_WALLET_STATE));
    }
  }, [runtimeEnabled]);

  const checkConnection = useCallback(async () => {
    const api = state.connectedApi;
    if (!api || connectedApiRef.current !== api) return;
    try {
      const connection = await api.getConnectionStatus();
      if (connectedApiRef.current !== api) return;
      if (connection.status === 'disconnected') {
        const info = connectorErrorInfo('Disconnected');
        connectionAttempt.current += 1;
        connectedApiRef.current = null;
        setState({
          ...EMPTY_WALLET_STATE,
          status: 'reconnecting',
          error: info.message,
          errorCode: info.code,
          errorRecoverable: info.recoverable,
          errorRetryable: info.retryable,
        });
        return;
      }
      if (connection.networkId !== TARGET_NETWORK_ID) {
        const info = wrongNetworkInfo(connection.networkId, TARGET_NETWORK_ID);
        connectionAttempt.current += 1;
        connectedApiRef.current = null;
        setState({
          ...EMPTY_WALLET_STATE,
          status: 'wrong-network',
          error: info.message,
          errorCode: info.code,
          errorRecoverable: info.recoverable,
          errorRetryable: info.retryable,
        });
      }
    } catch (err: unknown) {
      if (connectedApiRef.current !== api) return;
      const info = classifyWalletError(err);
      if (info.code === 'Disconnected') {
        connectionAttempt.current += 1;
        connectedApiRef.current = null;
        setState({
          ...EMPTY_WALLET_STATE,
          status: 'reconnecting',
          error: info.message,
          errorCode: info.code,
          errorRecoverable: info.recoverable,
          errorRetryable: info.retryable,
        });
      } else {
        setState((prev) =>
          prev.connectedApi === api
            ? {
                ...prev,
                error: info.message,
                errorCode: info.code,
                errorRecoverable: info.recoverable,
                errorRetryable: info.retryable,
              }
            : prev,
        );
      }
    }
  }, [state.connectedApi]);

  useEffect(() => {
    if (!runtimeEnabled || state.status !== 'connected' || !state.connectedApi) return;
    const timer = window.setInterval(() => void checkConnection(), 15_000);
    return () => window.clearInterval(timer);
  }, [checkConnection, runtimeEnabled, state.connectedApi, state.status]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        reconnect,
        disconnect,
        enableWalletDiscovery,
        refreshBalances,
        requestActionPermissions,
        refreshWallets,
        availableWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
