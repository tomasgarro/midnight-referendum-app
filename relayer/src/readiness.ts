export interface RelayerReadinessState {
  readonly isSynced: boolean;
  readonly dustBalance: bigint;
}

export interface RelayerReadinessInput {
  readonly state: RelayerReadinessState | null;
  readonly v2Enabled: boolean;
}

export interface RelayerReadiness {
  readonly ready: boolean;
  readonly synced: boolean;
  readonly dustFunded: boolean;
  readonly v2Enabled: boolean;
  readonly reasons: readonly (
    | 'wallet_starting'
    | 'wallet_syncing'
    | 'dust_unfunded'
    | 'v2_disabled'
  )[];
}

/**
 * Readiness for the public sponsored-wallet path. Liveness and readiness are
 * intentionally separate: a running process may still be syncing, unfunded,
 * or configured without the v2 capability boundary.
 */
export function evaluateRelayerReadiness(input: RelayerReadinessInput): RelayerReadiness {
  const reasons: RelayerReadiness['reasons'][number][] = [];
  const synced = input.state?.isSynced ?? false;
  const dustFunded = (input.state?.dustBalance ?? 0n) > 0n;
  if (!input.state) reasons.push('wallet_starting');
  else if (!synced) reasons.push('wallet_syncing');
  if (!dustFunded) reasons.push('dust_unfunded');
  if (!input.v2Enabled) reasons.push('v2_disabled');
  return {
    ready: reasons.length === 0,
    synced,
    dustFunded,
    v2Enabled: input.v2Enabled,
    reasons,
  };
}
