import type { HTMLAttributes, ReactNode } from 'react';
import './system.css';

export type CardTone = 'default' | 'sunken' | 'raised';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: CardTone;
  /** Removes padding for cards whose children are full-bleed rows. */
  readonly flush?: boolean;
  readonly children: ReactNode;
}

/** A surface. Radius is locked at 20 by the shape rule; there is no size prop. */
export function Card({ tone = 'default', flush = false, className, children, ...rest }: CardProps) {
  const classes = [
    'sys-card',
    tone === 'sunken' ? 'sys-card--sunken' : '',
    tone === 'raised' ? 'sys-card--raised' : '',
    flush ? 'sys-card--flush' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-tone={tone} {...rest}>
      {children}
    </div>
  );
}
