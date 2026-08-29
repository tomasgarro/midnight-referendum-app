import { nativeToken } from '@midnight-ntwrk/ledger-v8';
import * as rx from 'rxjs';
import { loadConfig } from './config.js';
import { type RelayerWallet, startRelayerWallet } from './wallet.js';

const GENESIS_SEED = `${'0'.repeat(63)}1`;
const FUNDING_AMOUNT = 50_000n * 10n ** 6n;
const WAIT_MS = 8 * 60 * 1_000;

const config = loadConfig();
if (config.networkId !== 'undeployed') {
  throw new Error('Genesis funding is available only on the Undeployed local network');
}

console.log('funding the generated relay wallet from the Undeployed genesis wallet…');
const recipient = await startRelayerWallet(config);
const genesis = await startRelayerWallet({ ...config, seedHex: GENESIS_SEED });

try {
  await ensureDustRegistration(genesis, 'genesis');
  const existing = await waitForState(
    recipient,
    (state) => state.unshielded.availableCoins.length > 0,
    3_000,
  ).catch(() => null);
  if (!existing) {
    const receiverAddress = await recipient.facade.unshielded.getAddress();
    const recipe = await genesis.facade.transferTransaction(
      [
        {
          type: 'unshielded',
          outputs: [
            {
              type: nativeToken().raw,
              receiverAddress,
              amount: FUNDING_AMOUNT,
            },
          ],
        },
      ],
      genesis.secretKeys,
      { ttl: new Date(Date.now() + 30 * 60 * 1_000) },
    );
    const signed = await genesis.facade.signRecipe(recipe, (payload) =>
      genesis.unshieldedKeystore.signData(payload),
    );
    const finalized = await genesis.facade.finalizeRecipe(signed);
    const transactionId = await genesis.facade.submitTransaction(finalized);
    console.log(`local NIGHT funding submitted: ${transactionId}`);
    await waitForState(recipient, (state) => state.unshielded.availableCoins.length > 0);
    // Funding consumes genesis DUST and may create a new NIGHT change output.
    // Register that change and wait for fresh DUST before the private operator
    // starts Registry/Referendum transactions with the same local fee wallet.
  } else {
    console.log('relay wallet already has local NIGHT; transfer skipped');
  }

  await ensureDustRegistration(genesis, 'genesis post-funding');

  await ensureDustRegistration(recipient, 'relay');
  const ready = await waitForState(
    recipient,
    (state) => state.dust.availableCoins.length > 0 && state.dust.balance(new Date()) > 0n,
  );
  console.log(
    `relay wallet ready: NIGHT UTXOs=${ready.unshielded.availableCoins.length} DUST coins=${ready.dust.availableCoins.length}`,
  );
} finally {
  await recipient.stop().catch(() => undefined);
  await genesis.stop().catch(() => undefined);
}

async function ensureDustRegistration(wallet: RelayerWallet, label: string): Promise<void> {
  const state = await waitForState(
    wallet,
    (candidate) => candidate.unshielded.availableCoins.length > 0,
  );
  const unregistered = state.unshielded.availableCoins.filter(
    (coin) => !coin.meta.registeredForDustGeneration,
  );
  if (unregistered.length > 0) {
    const recipe = await wallet.facade.registerNightUtxosForDustGeneration(
      unregistered,
      wallet.unshieldedKeystore.getPublicKey(),
      (payload) => wallet.unshieldedKeystore.signData(payload),
    );
    const finalized = await wallet.facade.finalizeRecipe(recipe);
    const transactionId = await wallet.facade.submitTransaction(finalized);
    console.log(`${label} DUST registration submitted: ${transactionId}`);
  }
  await waitForState(
    wallet,
    (candidate) =>
      candidate.dust.availableCoins.length > 0 && candidate.dust.balance(new Date()) > 0n,
  );
}

async function waitForState(
  wallet: RelayerWallet,
  predicate: (state: Awaited<ReturnType<RelayerWallet['facade']['waitForSyncedState']>>) => boolean,
  timeoutMs = WAIT_MS,
) {
  return rx.firstValueFrom(
    wallet.facade.state().pipe(rx.filter(predicate), rx.timeout({ first: timeoutMs })),
  );
}
