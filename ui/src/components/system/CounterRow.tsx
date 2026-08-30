import './system.css';

export interface Counter {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  /** At most one counter is live; it takes the accent. */
  readonly live?: boolean;
}

export interface CounterRowProps {
  readonly counters: readonly Counter[];
}

/**
 * Small pill counters -- "5 abiertas · 12 cerradas".
 *
 * Not stat blocks. The numbers here are context for the list below them, not
 * the point of the screen, and sizing them like a dashboard metric was part of
 * what made every screen feel equally loud.
 */
export function CounterRow({ counters }: CounterRowProps) {
  if (counters.length === 0) return null;

  return (
    <div className="sys-counters">
      {counters.map((counter) => (
        <span
          key={counter.id}
          className={`sys-counter ${counter.live ? 'sys-counter--live' : ''}`.trim()}
          data-counter={counter.id}
        >
          {counter.count} {counter.label}
        </span>
      ))}
    </div>
  );
}
