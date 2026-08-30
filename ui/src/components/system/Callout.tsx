import { Info, ShieldCheck, Warning, WarningOctagon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import './system.css';

export type CalloutTone = 'neutral' | 'positive' | 'warning' | 'danger';

export interface CalloutProps {
  readonly tone?: CalloutTone;
  readonly title?: string;
  /** `alert` for something that just went wrong; `status` for a standing fact. */
  readonly role?: 'alert' | 'status' | 'none';
  readonly children: ReactNode;
}

const ICONS = {
  neutral: Info,
  positive: ShieldCheck,
  warning: Warning,
  danger: WarningOctagon,
} as const;

/**
 * The one honest-disclosure component.
 *
 * Replaces the mode strip, the explain panel, the results note and the
 * independent note -- four components that said "here is something true you
 * should know" in four different visual languages, which is why the screens
 * read as cluttered even when every individual sentence was worth keeping.
 *
 * Tone carries state and never emphasis: a positive callout is not a way to
 * make a sentence more important.
 */
export function Callout({ tone = 'neutral', title, role = 'none', children }: CalloutProps) {
  const Icon = ICONS[tone];
  return (
    <div
      className={`sys-callout ${tone === 'neutral' ? '' : `sys-callout--${tone}`}`.trim()}
      data-tone={tone}
      {...(role === 'none' ? {} : { role })}
    >
      <span className="sys-callout__icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="sys-callout__body">
        {title ? <strong className="sys-callout__title">{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}
