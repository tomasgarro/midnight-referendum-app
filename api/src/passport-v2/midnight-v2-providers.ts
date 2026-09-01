import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type FinalizedTransaction,
  Transaction,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  createProofProvider,
  type MidnightProvider,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { catchError, retry, throwError } from 'rxjs';
import { browserPrivateStateProvider, inMemoryPrivateStateProvider } from '../private-state.js';
import type { REFERENDUM_V2_PRIVATE_STATE_ID, ReferendumV2PrivateState } from './midnight-v2.js';
import type { ReferendumV2Providers } from './midnight-v2-executors.js';

export type ReferendumV2CircuitKeys =
  | 'castVote'
  | 'publishCredentialRoot'
  | 'revokeCredentialRoot'
  | 'closeEnrollment'
  | 'closeVote'
  | 'revealVote'
  | 'finalizeVote';

export interface ReferendumV2WalletProviderOptions {
  /**
   * Node-only development fallback. Browser callers must use the Lace
   * proving provider returned by ConnectedAPI.getProvingProvider().
   */
  readonly proofServerUri?: string;
  readonly zkConfigBaseUrl?: string;
}

/**
 * Creates a contract-specific browser provider set for referendum-v2. The
 * wallet supplies network/indexer/keys; v2 ZK assets and encrypted private
 * state remain isolated from the legacy referendum provider.
 */
export async function createReferendumV2WalletProviders(
  api: ConnectedAPI,
  options: ReferendumV2WalletProviderOptions = {},
): Promise<ReferendumV2Providers> {
  const hasBrowserWindow = typeof window !== 'undefined';
  const explicitZkConfigBaseUrl = options.zkConfigBaseUrl?.trim();
  if (hasBrowserWindow && options.proofServerUri) {
    throw new TypeError(
      'HTTP proof providers are unavailable in a browser; use Lace wallet proving',
    );
  }
  if (!hasBrowserWindow && !explicitZkConfigBaseUrl) {
    throw new Error('createReferendumV2WalletProviders requires zkConfigBaseUrl outside a browser');
  }
  if (!hasBrowserWindow && !/^https?:\/\//iu.test(explicitZkConfigBaseUrl ?? '')) {
    throw new TypeError('zkConfigBaseUrl must be an absolute HTTP(S) URL outside a browser');
  }

  const config = await api.getConfiguration();
  setNetworkId(config.networkId);

  const rawPublicDataProvider = indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);
  const originalObservable =
    rawPublicDataProvider.contractStateObservable.bind(rawPublicDataProvider);
  const publicDataProvider: typeof rawPublicDataProvider = {
    ...rawPublicDataProvider,
    contractStateObservable(address, observableConfig) {
      return originalObservable(address, observableConfig).pipe(
        retry({ delay: 250, count: 1 }),
        catchError((error: unknown) => {
          if (observableConfig.type === 'latest') {
            return originalObservable(address, { type: 'all' });
          }
          return throwError(() => error);
        }),
      );
    },
  };
  const privateStateProvider =
    typeof window === 'undefined'
      ? inMemoryPrivateStateProvider<
          typeof REFERENDUM_V2_PRIVATE_STATE_ID,
          ReferendumV2PrivateState
        >()
      : browserPrivateStateProvider<
          typeof REFERENDUM_V2_PRIVATE_STATE_ID,
          ReferendumV2PrivateState
        >();
  const browserOrigin = hasBrowserWindow ? window.location.origin : '';
  const zkConfigBaseUrl = explicitZkConfigBaseUrl ?? `${browserOrigin}/managed/referendum-v2`;
  const zkConfigProvider = new FetchZkConfigProvider<ReferendumV2CircuitKeys>(
    zkConfigBaseUrl,
    fetch.bind(globalThis),
  );
  const proofProvider = options.proofServerUri
    ? httpClientProofProvider<ReferendumV2CircuitKeys>(options.proofServerUri, zkConfigProvider)
    : createProofProvider(await api.getProvingProvider(zkConfigProvider.asKeyMaterialProvider()));

  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await api.getShieldedAddresses();
  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    balanceTx: async (tx, _ttl) => {
      const { tx: balancedHex } = await api.balanceUnsealedTransaction(toHex(tx.serialize()), {});
      return Transaction.deserialize(
        'signature',
        'proof',
        'binding',
        fromHex(balancedHex),
      ) satisfies FinalizedTransaction;
    },
  };
  const midnightProvider: MidnightProvider = {
    submitTx: async (tx) => {
      await api.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };

  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}
