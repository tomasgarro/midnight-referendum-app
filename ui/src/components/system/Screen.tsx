import type { ReactNode } from 'react';
import './system.css';

export interface ScreenProps {
  /** Rendered above the scrolling body, outside it -- typically a StepHeader. */
  readonly header?: ReactNode;
  /**
   * Pinned to the bottom, clear of the home indicator. This is a flex sibling
   * of the body rather than a sticky overlay, so it can never cover the last
   * line of content the way a fixed footer does at small heights.
   */
  readonly footer?: ReactNode;
  /** `plain` sits on the white surface instead of the cream ground. */
  readonly surface?: 'ground' | 'plain';
  readonly className?: string;
  readonly children: ReactNode;
}

/** A flow screen: header, scrolling body, pinned actions. */
export function Screen({ header, footer, surface = 'ground', className, children }: ScreenProps) {
  const classes = ['sys-screen', surface === 'plain' ? 'sys-screen--plain' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-surface={surface}>
      {header}
      <div className="sys-screen__body">{children}</div>
      {footer ? <div className="sys-screen__footer">{footer}</div> : null}
    </div>
  );
}
