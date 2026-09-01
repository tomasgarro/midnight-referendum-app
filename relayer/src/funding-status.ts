export interface RelayerFundingState {
  readonly isSynced: boolean;
  readonly nightCoins: readonly {
    readonly registeredForDustGeneration: boolean;
  }[];
  readonly dustCoins: number;
  readonly dustBalance: bigint;
}

export interface RelayerFundingStatus {
  readonly synced: boolean;
  readonly nightCoins: number;
  readonly registeredNightCoins: number;
  readonly unregisteredNightCoins: number;
  readonly dustCoins: number;
  readonly dustBalance: string;
  readonly readyToRegister: boolean;
  readonly readyToSubmit: boolean;
}

interface IndexedSyncProgress {
  readonly appliedIndex: bigint;
  readonly highestRelevantWalletIndex: bigint;
  readonly highestIndex: bigint;
  readonly highestRelevantIndex: bigint;
  readonly isConnected: boolean;
}

interface TransactionSyncProgress {
  readonly appliedId: bigint;
  readonly highestTransactionId: bigint;
  readonly isConnected: boolean;
}

export interface RelayerSyncProgress {
  readonly shielded: Record<keyof IndexedSyncProgress, string | boolean>;
  readonly unshielded: Record<keyof TransactionSyncProgress, string | boolean>;
  readonly dust: Record<keyof IndexedSyncProgress, string | boolean>;
}

/**
 * Reduces wallet state to a public, choice-free operational status. No seed,
 * key material, token amounts other than DUST, or transaction data crosses
 * this boundary.
 */
export function summarizeRelayerFunding(state: RelayerFundingState): RelayerFundingStatus {
  const registeredNightCoins = state.nightCoins.filter(
    (coin) => coin.registeredForDustGeneration,
  ).length;
  const unregisteredNightCoins = state.nightCoins.length - registeredNightCoins;
  return {
    synced: state.isSynced,
    nightCoins: state.nightCoins.length,
    registeredNightCoins,
    unregisteredNightCoins,
    dustCoins: state.dustCoins,
    dustBalance: state.dustBalance.toString(),
    readyToRegister: state.isSynced && unregisteredNightCoins > 0,
    readyToSubmit: state.isSynced && state.dustBalance > 0n,
  };
}

/** Converts public sync cursors to JSON-safe strings without wallet contents. */
export function summarizeRelayerSync(progress: {
  readonly shielded: IndexedSyncProgress;
  readonly unshielded: TransactionSyncProgress;
  readonly dust: IndexedSyncProgress;
}): RelayerSyncProgress {
  const indexed = (value: IndexedSyncProgress) => ({
    appliedIndex: value.appliedIndex.toString(),
    highestRelevantWalletIndex: value.highestRelevantWalletIndex.toString(),
    highestIndex: value.highestIndex.toString(),
    highestRelevantIndex: value.highestRelevantIndex.toString(),
    isConnected: value.isConnected,
  });
  return {
    shielded: indexed(progress.shielded),
    unshielded: {
      appliedId: progress.unshielded.appliedId.toString(),
      highestTransactionId: progress.unshielded.highestTransactionId.toString(),
      isConnected: progress.unshielded.isConnected,
    },
    dust: indexed(progress.dust),
  };
}
