import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ReferendumV2Providers } from './midnight-v2-executors.js';
import {
  createReferendumV2WalletProviders,
  type ReferendumV2WalletProviderOptions,
} from './midnight-v2-providers.js';
import {
  createReferendumV2WalletlessProviders,
  type ReferendumV2WalletlessProviderOptions,
  type ReferendumV2WalletlessRuntime,
} from './midnight-v2-relayer-providers.js';

/** The only execution modes supported by the Passport-v2 action boundary. */
export const REFERENDUM_V2_EXECUTION_MODES = ['direct-wallet', 'sponsored-wallet'] as const;

export type ExecutionMode = (typeof REFERENDUM_V2_EXECUTION_MODES)[number];

/**
 * Deliberately browser-safe direct-wallet options. A proof-server URI is not
 * part of this public composition API: proving is delegated to Lace.
 */
export type ReferendumV2DirectWalletOptions = Omit<
  ReferendumV2WalletProviderOptions,
  'proofServerUri'
>;

/**
 * Deliberately browser-safe sponsored-wallet options. The lower-level
 * walletless factory still exposes its Node proof-server escape hatch for
 * operator scripts, but it cannot be selected through this browser-facing
 * composition API.
 */
export type ReferendumV2SponsoredWalletOptions = Omit<
  ReferendumV2WalletlessProviderOptions,
  'api' | 'proofServerUri' | 'zkConfigProvider'
>;

export interface ReferendumV2DirectProviderRuntime {
  readonly mode: 'direct-wallet';
  readonly providers: ReferendumV2Providers;
}

export interface ReferendumV2SponsoredProviderRuntime
  extends Pick<ReferendumV2WalletlessRuntime, 'actionContext' | 'getLastActionTrace'> {
  readonly mode: 'sponsored-wallet';
  readonly providers: ReferendumV2Providers;
}

export type ReferendumV2ProviderRuntime =
  | ReferendumV2DirectProviderRuntime
  | ReferendumV2SponsoredProviderRuntime;

export type ReferendumV2ProviderRuntimeOptions =
  | {
      readonly mode: 'direct-wallet';
      readonly api: ConnectedAPI;
      readonly options?: ReferendumV2DirectWalletOptions;
    }
  | {
      readonly mode: 'sponsored-wallet';
      readonly api: ConnectedAPI;
      readonly options: ReferendumV2SponsoredWalletOptions;
    };

/**
 * Compose the approved Passport-v2 execution modes.
 *
 * Both modes require a connected Lace API and therefore obtain the proving
 * provider from Lace. Sponsored mode uses the relay only for the already
 * proved transaction's fee funding, submission, and canonical receipt; its
 * relay options intentionally have no browser proof-server field.
 */
export async function createReferendumV2ProviderRuntime(
  options: ReferendumV2ProviderRuntimeOptions,
): Promise<ReferendumV2ProviderRuntime> {
  if (options.mode === 'direct-wallet') {
    return {
      mode: options.mode,
      providers: await createReferendumV2WalletProviders(options.api, options.options),
    };
  }

  const runtime = await createReferendumV2WalletlessProviders({
    ...options.options,
    api: options.api,
  });
  return {
    mode: options.mode,
    providers: runtime.providers,
    actionContext: runtime.actionContext,
    getLastActionTrace: runtime.getLastActionTrace,
  };
}
