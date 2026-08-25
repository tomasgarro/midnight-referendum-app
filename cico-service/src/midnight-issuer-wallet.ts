import WebSocket from 'ws';

// The wallet indexer client expects this browser-shaped global in Node.
(globalThis as unknown as { WebSocket: unknown }).WebSocket ??= WebSocket;

import * as ledger from '@midnight-ntwrk/ledger-v8';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import {
  MidnightBech32m,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from '@midnight-ntwrk/wallet-sdk-address-format';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import {
  type DefaultConfiguration,
  WalletEntrySchema,
  WalletFacade,
} from '@midnight-ntwrk/wallet-sdk-facade';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import {
  createKeystore,
  PublicKey as UnshieldedPublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import type {
  MidnightIssuerRuntimeConfig,
  MidnightIssuerWalletAdapter,
} from './midnight-issuer-runtime.js';

/** Production Node wallet adapter for the dedicated Preview credential issuer. */
export async function createMidnightIssuerWalletAdapter(
  config: MidnightIssuerRuntimeConfig,
): Promise<MidnightIssuerWalletAdapter> {
  const walletSeed = Buffer.from(normalizeSecret(config.issuerSeedHex, 'issuerSeedHex'), 'hex');
  const issuerSecret = Uint8Array.from(
    Buffer.from(normalizeSecret(config.issuerRoleSecretHex, 'issuerRoleSecretHex'), 'hex'),
  );
  const hd = HDWallet.fromSeed(walletSeed);
  walletSeed.fill(0);
  if (hd.type !== 'seedOk') {
    issuerSecret.fill(0);
    throw new Error('CICO issuer seed could not be turned into an HD wallet');
  }
  const derived = hd.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  hd.hdWallet.clear();
  if (derived.type !== 'keysDerived') {
    issuerSecret.fill(0);
    throw new Error('CICO issuer wallet role keys could not be derived');
  }

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(derived.keys[Roles.Dust]);
  const configuration: DefaultConfiguration = {
    networkId: 'preview',
    costParameters: {
      feeBlocksMargin: 5,
      additionalFeeOverhead: 2_000_000_000_000_000n,
    },
    relayURL: new URL(config.relayUrl ?? 'wss://rpc.preview.midnight.network'),
    provingServerUrl: new URL(config.proofServerUrl),
    indexerClientConnection: {
      indexerHttpUrl: config.indexerHttpUrl,
      indexerWsUrl: config.indexerWsUrl,
    },
    txHistoryStorage: new InMemoryTransactionHistoryStorage(WalletEntrySchema),
  };
  const unshieldedKeystore = createKeystore(
    derived.keys[Roles.NightExternal],
    configuration.networkId,
  );
  const facade = await WalletFacade.init({
    configuration,
    shielded: (walletConfig) =>
      ShieldedWallet(walletConfig).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (walletConfig) =>
      UnshieldedWallet(walletConfig).startWithPublicKey(
        UnshieldedPublicKey.fromKeyStore(unshieldedKeystore),
      ),
    dust: (walletConfig) =>
      DustWallet(walletConfig).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      ),
  });

  let coinPublicKey: string | null = null;
  let encryptionPublicKey: string | null = null;
  let stopped = false;
  return {
    facade,
    secretKeys: { shieldedSecretKeys, dustSecretKey },
    issuerSecret,
    get coinPublicKey() {
      if (!coinPublicKey) throw new Error('CICO issuer wallet is not synchronized');
      return coinPublicKey;
    },
    get encryptionPublicKey() {
      if (!encryptionPublicKey) throw new Error('CICO issuer wallet is not synchronized');
      return encryptionPublicKey;
    },
    async start() {
      await facade.start(shieldedSecretKeys, dustSecretKey);
    },
    async waitUntilSynced() {
      const state = await facade.waitForSyncedState();
      if (!state.isSynced) throw new Error('CICO issuer wallet did not reach a synchronized state');
      coinPublicKey = ShieldedCoinPublicKey.codec
        .encode(configuration.networkId, state.shielded.coinPublicKey)
        .asString();
      encryptionPublicKey = ShieldedEncryptionPublicKey.codec
        .encode(configuration.networkId, state.shielded.encryptionPublicKey)
        .asString();
      // Exercise the network-specific codec here so a bad network config fails
      // before any credential transaction is constructed.
      MidnightBech32m.encode(configuration.networkId, state.shielded.address).asString();
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      issuerSecret.fill(0);
      await facade.stop();
    },
  };
}

function normalizeSecret(value: string, label: string): string {
  const normalized = value.trim().replace(/^0x/u, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(normalized)) {
    throw new TypeError(`${label} must be exactly 32 bytes of hexadecimal data`);
  }
  return normalized;
}
