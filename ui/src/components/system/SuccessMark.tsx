import { Check } from '@phosphor-icons/react';
import './system.css';

export interface SuccessMarkProps {
  /** Rendered for assistive technology; the burst itself is decorative. */
  readonly label: string;
  readonly size?: 'sm' | 'md' | 'lg';
}

/**
 * The completion mark: a filled accent disc, a white check, eight rays.
 *
 * The success screen it replaces opened with a bare outlined circle at the top
 * of a card, the same shape the consent screen used for its hero icon, so the
 * one moment in the journey worth marking looked like every other step. The
 * rays exist to make it read as an event rather than a state, and they are the
 * only decorative flourish in the flow.
 *
 * The motion is a 420ms scale-and-settle on the disc with the rays expanding
 * behind it, once, on mount. It clears the frequency gate because a citizen
 * sees it at most twice: once for the credential and once for a receipt.
 * Under prefers-reduced-motion it renders finished, with no animation at all.
 */
export function SuccessMark({ label, size = 'md' }: SuccessMarkProps) {
  const check = size === 'lg' ? 40 : size === 'sm' ? 22 : 30;
  return (
    <span className="sys-success" data-size={size} role="img" aria-label={label}>
      <span className="sys-success__rays" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative ray ring
          <i key={index} style={{ '--ray': `${index * 45}deg` } as React.CSSProperties} />
        ))}
      </span>
      <span className="sys-success__disc" aria-hidden="true">
        <Check size={check} weight="bold" />
      </span>
    </span>
  );
}
