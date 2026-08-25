import type { AppProviders, ReferendumV2Providers } from 'midnight-referendum-api';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useWallet } from '@/hooks/use-wallet';

interface MidnightProvidersContextValue {
  providers: AppProviders | null;
  referendumV2Providers: ReferendumV2Providers | null;
  isReady: boolean;
  error: string | null;
}

const MidnightProvidersContext = createContext<MidnightProvidersContextValue | null>(null);

const REAL_RUNTIME_ENABLED = import.meta.env.VITE_APP_MODE === 'preview';
/** Set to run the wallet-less sponsored-relayer path. */
const RELAYER_URL = REAL_RUNTIME_ENABLED ? import.meta.env.VITE_RELAYER_URL?.trim() || '' : '';
const PROOF_SERVER_URL =
  import.meta.env.VITE_MIDNIGHT_PROOF_SERVER_URL?.trim() || 'http://localhost:6300';
const NETWORK_ID = import.meta.env.VITE_MIDNIGHT_NETWORK?.trim() || 'preview';
const INDEXER_URL =
  import.meta.env.VITE_MIDNIGHT_INDEXER_URL?.trim() ||
  'https://indexer.preview.midnight.network/api/v4/graphql';
const INDEXER_WS_URL =
  import.meta.env.VITE_MIDNIGHT_INDEXER_WS_URL?.trim() ||
  'wss://indexer.preview.midnight.network/api/v4/graphql/ws';

export const RELAYER_MODE = RELAYER_URL !== '';

export function MidnightProvidersProvider({ children }: { children: ReactNode }) {
  const { connectedApi, status } = useWallet();
  const [providers, setProviders] = useState<AppProviders | null>(null);
  const [referendumV2Providers, setReferendumV2Providers] = useState<ReferendumV2Providers | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Demo is a hard runtime boundary, not only presentation. Even stale or
    // inherited deployment variables must not activate a wallet, relayer,
    // indexer, or proof-server path in a public synthetic build.
    if (!REAL_RUNTIME_ENABLED) {
      setProviders(null);
      setReferendumV2Providers(null);
      setError(null);
      return;
    }

    // Relayer mode is the default civic path: the citizen has no wallet, so
    // providers must come up without one. The wallet path stays available for
    // organizer actions and as a fallback when no relayer is configured.
    if (RELAYER_URL) {
      import('midnight-referendum-api')
        .then(({ createRelayerProviders }) =>
          createRelayerProviders({
            relayerUrl: RELAYER_URL,
            proofServerUri: PROOF_SERVER_URL,
            networkId: NETWORK_ID,
            indexerUri: INDEXER_URL,
            indexerWsUri: INDEXER_WS_URL,
          }),
        )
        .then((p) => {
          if (!cancelled) {
            setProviders(p);
            // The legacy two-step relayer is intentionally not reused for v2.
            // V2 remains wallet-backed until the atomic proven-transaction job exists.
            setReferendumV2Providers(null);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setReferendumV2Providers(null);
            setError(
              err instanceof Error
                ? `No se pudo contactar el relayer: ${err.message}`
                : 'No se pudo contactar el relayer',
            );
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (status !== 'connected' || !connectedApi) {
      setProviders(null);
      setReferendumV2Providers(null);
      setError(null);
      return;
    }

    import('midnight-referendum-api')
      .then(({ createProviders, createReferendumV2WalletProviders }) =>
        Promise.all([
          createProviders(connectedApi, {
            proofServerUri: import.meta.env.VITE_MIDNIGHT_PROOF_SERVER_URL?.trim() || undefined,
          }),
          createReferendumV2WalletProviders(connectedApi, {
            proofServerUri: import.meta.env.VITE_MIDNIGHT_PROOF_SERVER_URL?.trim() || undefined,
          }),
        ]),
      )
      .then(([legacy, referendumV2]) => {
        if (!cancelled) {
          setProviders(legacy);
          setReferendumV2Providers(referendumV2);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setReferendumV2Providers(null);
          setError(err instanceof Error ? err.message : 'Failed to create providers');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connectedApi, status]);

  return (
    <MidnightProvidersContext.Provider
      value={{
        providers,
        referendumV2Providers,
        isReady: providers !== null,
        error,
      }}
    >
      {children}
    </MidnightProvidersContext.Provider>
  );
}

export function useMidnightProviders(): MidnightProvidersContextValue {
  const context = useContext(MidnightProvidersContext);
  if (!context) {
    throw new Error('useMidnightProviders must be used within a MidnightProvidersProvider');
  }
  return context;
}
