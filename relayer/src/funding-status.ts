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
