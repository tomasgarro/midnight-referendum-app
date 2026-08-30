import './system.css';
import { StatRow } from './StatRow';

export type WaitStatus = 'pending' | 'ready' | 'unknown';

export interface WaitStateProps {
  readonly status: WaitStatus;
  /** Enrolments in the current batch. `null` whenever the count is not observable. */
  readonly count: number | null;
  readonly total: number;
  /** e.g. "anotados" / "enrolled". */
  readonly unitLabel: string;
  /** e.g. "Como máximo" / "No later than". */
  readonly deadlineLabel: string;
  /** Already-formatted local time, e.g. "16:45". */
  readonly deadlineValue: string;
}

/**
 * Batch progress and a hard deadline, for the wait between enrolling and being
 * able to vote.
 *
 * The wait is real: the credential-root publisher fires when the batch fills or
 * when CICO_ROOT_PUBLISH_MAX_WAIT_MS elapses, whichever comes first. Until this
 * existed the user saw a screen that had simply stopped, which reads as a
 * broken demo rather than a system working correctly.
 *
 * `unknown` is a first-class state, not a zero. When the status endpoint cannot
 * be read the count is a dash and the track stays empty, because a 0% bar
 * claims we observed no progress when in fact we observed nothing at all. The
 * deadline still shows -- it comes from configuration, so it is known even when
 * the live count is not.
 */
export function WaitState({
  status,
  count,
  total,
  unitLabel,
  deadlineLabel,
  deadlineValue,
}: WaitStateProps) {
  const observed = status !== 'unknown' && count !== null;
  const pct = observed && total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;

  return (
    <div
      className={`sys-wait ${status === 'unknown' ? 'sys-wait--unknown' : ''}`.trim()}
      data-status={status}
    >
      <div className="sys-wait__figures">
        <span className="sys-wait__count">
          {observed ? count : '—'}
          <span className="sys-wait__count-total"> / {total}</span>
        </span>
        <span className="sys-wait__unit">{unitLabel}</span>
      </div>
      <div
        className="sys-wait__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={unitLabel}
        {...(observed ? { 'aria-valuenow': count } : {})}
      >
        {observed ? <div className="sys-wait__fill" style={{ width: `${pct}%` }} /> : null}
      </div>
      <StatRow label={deadlineLabel} value={deadlineValue} />
    </div>
  );
}
