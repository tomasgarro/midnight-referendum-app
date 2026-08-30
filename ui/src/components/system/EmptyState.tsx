import type { ReactNode } from 'react';
import './system.css';

export interface EmptyStateProps {
  /** One line. "No active polls", not a paragraph explaining why. */
  readonly message: string;
  /** Only when there is genuinely something the user can do about it. */
  readonly action?: ReactNode;
}

/** One centred line. No illustration. */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="sys-empty">
      <p style={{ margin: 0 }}>{message}</p>
      {action}
    </div>
  );
}
