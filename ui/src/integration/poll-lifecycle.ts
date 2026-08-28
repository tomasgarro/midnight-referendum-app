export type PollPhase = 'COMMIT' | 'REVEAL' | 'FINALIZED';

export interface PollLifecycle {
  readonly opensAt: string;
  readonly closesAt: string;
  /** Optional canonical phase. The clock remains the lower-bound schedule. */
  readonly phase?: PollPhase;
  readonly closed?: boolean;
}

export interface PollAvailability {
  readonly isOpen: boolean;
  readonly reason: 'not-open' | 'closed-by-clock' | 'closed-on-chain' | 'open';
}

export function getPollAvailability(
  lifecycle: PollLifecycle,
  now: Date = new Date(),
): PollAvailability {
  const opensAt = Date.parse(lifecycle.opensAt);
  const closesAt = Date.parse(lifecycle.closesAt);
  if (!Number.isFinite(opensAt) || !Number.isFinite(closesAt) || closesAt <= opensAt) {
    throw new TypeError('Poll lifecycle must contain a valid opening and closing interval');
  }
  const nowMs = now.getTime();
  if (nowMs < opensAt) return { isOpen: false, reason: 'not-open' };
  if (nowMs >= closesAt) return { isOpen: false, reason: 'closed-by-clock' };
  if (lifecycle.closed || lifecycle.phase === 'REVEAL' || lifecycle.phase === 'FINALIZED') {
    return { isOpen: false, reason: 'closed-on-chain' };
  }
  return { isOpen: true, reason: 'open' };
}

export function countOpenPolls(
  lifecycles: readonly PollLifecycle[],
  now: Date = new Date(),
): number {
  return lifecycles.reduce(
    (count, lifecycle) => count + (getPollAvailability(lifecycle, now).isOpen ? 1 : 0),
    0,
  );
}
