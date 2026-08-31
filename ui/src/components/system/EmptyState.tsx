import type { ReactNode } from 'react';
import './system.css';

export interface EmptyStateProps {
  /** One line. "No active polls", not a paragraph explaining why. */
  readonly message: string;
  /** Short noun phrase above the message. Omit when the message stands alone. */
  readonly title?: string;
  /** A line icon, not an illustration. Decorative. */
  readonly icon?: ReactNode;
  /** Only when there is genuinely something the user can do about it. */
  readonly action?: ReactNode;
}

/**
 * A centred line, optionally with a mark and a title above it.
 *
 * The bare sentence is still the default, because most empty states in this
 * app are "this filter matched nothing" and deserve nothing more. The icon and
 * title exist for the two places where the emptiness is a state the reader
 * arrived in rather than a filter they chose -- an untouched receipt list, most
 * of all -- and where a bare grey sentence reads like a failure to load.
 */
export function EmptyState({ message, title, icon, action }: EmptyStateProps) {
  return (
    <div className="sys-empty">
      {icon ? (
        <span className="sys-empty__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {title ? <p className="sys-empty__title">{title}</p> : null}
      <p className="sys-empty__message">{message}</p>
      {action}
    </div>
  );
}
