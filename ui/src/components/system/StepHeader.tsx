import { ArrowLeft, X } from '@phosphor-icons/react';
import './system.css';

export interface StepHeaderProps {
  readonly step: number;
  readonly total: number;
  /** Rendered as "Paso 2/4" / "Step 2 of 4" -- supplied so the copy stays localized. */
  readonly label: string;
  readonly onBack?: () => void;
  readonly onClose?: () => void;
  readonly backLabel?: string;
  readonly closeLabel?: string;
}

/**
 * Step counter and a way out.
 *
 * Deliberately not a labelled stepper bar. The four-stage bar it replaces cost
 * roughly a third of a 375px screen to tell the user four words they could not
 * act on; the count carries the same information in one line.
 *
 * The progress is announced rather than left to the visual: screen readers get
 * the full "Step 2 of 4" label, not "2/4".
 */
export function StepHeader({
  step,
  total,
  label,
  onBack,
  onClose,
  backLabel = 'Back',
  closeLabel = 'Close',
}: StepHeaderProps) {
  return (
    <div className="sys-stepheader" data-step={step} data-total={total}>
      {onBack ? (
        <button
          type="button"
          className="sys-stepheader__btn sys-stepheader__btn--back"
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeft size={20} />
        </button>
      ) : null}
      <span className="sys-stepheader__count">{label}</span>
      <span className="sys-stepheader__spacer" />
      {onClose ? (
        <button
          type="button"
          className="sys-stepheader__btn"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={20} />
        </button>
      ) : null}
    </div>
  );
}
