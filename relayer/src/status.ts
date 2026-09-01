import { MidnightBech32m } from '@midnight-ntwrk/wallet-sdk-address-format';
import * as rx from 'rxjs';
import { loadConfig } from './config.js';
import { summarizeRelayerFunding, summarizeRelayerSync } from './funding-status.js';
import { startRelayerWallet } from './wallet.js';

const config = loadConfig();
const waitMs = Number.parseInt(process.env.RELAYER_STATUS_WAIT_MS ?? '480000', 10);
if (!Number.isSafeInteger(waitMs) || waitMs < 1_000 || waitMs > 30 * 60_000) {
  throw new TypeError('RELAYER_STATUS_WAIT_MS must be between 1000 and 1800000 milliseconds');
}

console.log(`network: ${config.networkId}`);
console.log('synchronizing read-only wallet status…');
const wallet = await startRelayerWallet(config);

try {
  let latest: Awaited<ReturnType<typeof wallet.facade.waitForSyncedState>> | null = null;
  const state = await rx
    .firstValueFrom(
      wallet.facade.state().pipe(
        rx.tap((value) => {
          latest = value;
        }),
        rx.filter((value) => value.isSynced),
        rx.timeout({ first: waitMs }),
      ),
    )
    .catch(() => latest);

  if (!state) throw new Error('The wallet produced no state; check the configured indexer');

  const bech32 = (item: unknown) =>
    MidnightBech32m.encode(config.networkId, item as never).asString();
  const status = summarizeRelayerFunding({
    isSynced: state.isSynced,
    nightCoins: state.unshielded.availableCoins.map((coin) => ({
      registeredForDustGeneration: coin.meta.registeredForDustGeneration,
    })),
    dustCoins: state.dust.availableCoins.length,
    dustBalance: state.dust.balance(new Date()),
  });

  console.log(`unshielded address: ${bech32(state.unshielded.address)}`);
  console.log(
    JSON.stringify(
      {
        ...status,
        syncProgress: summarizeRelayerSync({
          shielded: state.shielded.progress,
          unshielded: state.unshielded.progress,
          dust: state.dust.progress,
        }),
      },
      null,
      2,
    ),
  );
  if (!status.synced) {
    console.error(`Wallet did not synchronize within ${waitMs}ms; funding status is inconclusive.`);
    process.exitCode = 2;
  }
} finally {
  await wallet.stop().catch(() => undefined);
}
