import './system.css';

export interface JourneyProgressProps {
  /** 1-based position of the current screen within the journey. */
  readonly current: number;
  /** Total screens in the journey. */
  readonly total: number;
  /**
   * The name of the stage the current screen belongs to. Announced to screen
   * readers; never drawn, because the drawn label is what made the old
   * four-pill stepper cost a third of the viewport.
   */
  readonly stageLabel: string;
  /** Localized "Step 2 of 6" phrasing, used as the accessible name. */
  readonly label: string;
}

/**
 * One bar, filling.
 *
 * Replaces the four numbered circles with their four written labels. That
 * stepper had three problems the reviewer named in one word -- it "clogs":
 * it occupied roughly 120px above every card, it competed with the card's own
 * "Paso 1 · consentimiento" eyebrow for the authority to say where you were,
 * and its four discrete stops could not move when a screen advanced inside a
 * stage, so the privacy screen showed step 1 exactly like the welcome screen
 * before it.
 *
 * A continuous fill has none of those failure modes: every screen advances it,
 * it reads at 4px, and there is one place in the product that says how far
 * along you are. The stage names survive as the accessible label, so a screen
 * reader still hears "Step 2 of 6, Passport" rather than a bare percentage.
 */
export function JourneyProgress({ current, total, stageLabel, label }: JourneyProgressProps) {
  const clamped = Math.min(Math.max(current, 1), total);
  const percent = Math.round((clamped / total) * 100);

  return (
    <div
      className="sys-journey-progress"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={clamped}
      aria-valuetext={`${label} — ${stageLabel}`}
      aria-label={label}
    >
      <span className="sys-journey-progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
