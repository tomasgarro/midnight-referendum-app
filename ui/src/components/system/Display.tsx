import type { ReactNode } from 'react';
import './system.css';

export interface DisplayProps {
  /** The ink line. */
  readonly children: ReactNode;
  /**
   * The accent line, rendered below. Both lines are the display face -- the
   * two-tone headline is two lines, never a serif word dropped into a sans one.
   */
  readonly accent?: ReactNode;
  readonly id?: string;
}

/** The one display headline. A screen gets exactly one. */
export function Display({ children, accent, id }: DisplayProps) {
  return (
    <h1 className="sys-display" id={id}>
      {children}
      {accent ? <span className="sys-display__accent">{accent}</span> : null}
    </h1>
  );
}

export interface EyebrowProps {
  readonly children: ReactNode;
}

/** Uppercase label above a headline or group. */
export function Eyebrow({ children }: EyebrowProps) {
  return <p className="sys-eyebrow">{children}</p>;
}
