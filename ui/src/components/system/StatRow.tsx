import type { ReactNode } from 'react';
import './system.css';

export interface StatRowProps {
  readonly label: string;
  readonly value: ReactNode;
}

/**
 * One fact, as a label and a value.
 *
 * This is the unit RariMe's proof request is built from, and it is what
 * replaces our paragraph-shaped consent copy: "Age 18+" is read in a glance,
 * where the sentence that says the same thing is not read at all.
 */
export function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="sys-statrow">
      <span className="sys-statrow__key">{label}</span>
      <span className="sys-statrow__value">{value}</span>
    </div>
  );
}

export interface StatGroupProps {
  /** Uppercase group heading, e.g. "Se verifica" / "What is checked". */
  readonly label?: string;
  readonly children: ReactNode;
}

/** A labelled run of StatRows. */
export function StatGroup({ label, children }: StatGroupProps) {
  return (
    <div className="sys-statgroup">
      {label ? <p className="sys-statgroup__label">{label}</p> : null}
      {children}
    </div>
  );
}
