import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './system.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  /** Full-width. The pinned action on a flow screen is always a block button. */
  readonly block?: boolean;
  readonly size?: 'md' | 'sm';
  readonly children: ReactNode;
}

/**
 * The only button in the system.
 *
 * A screen gets one `primary`. Its secondary action is a `link`, never a second
 * filled button -- two filled buttons make neither of them the answer. `danger`
 * is text-only for the same reason: a destructive action should not out-shout
 * the thing the user actually came to do.
 */
export function Button({
  variant = 'primary',
  block = false,
  size = 'md',
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'sys-btn',
    `sys-btn--${variant}`,
    block ? 'sys-btn--block' : '',
    size === 'sm' ? 'sys-btn--sm' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} data-variant={variant} type={type} {...rest}>
      {children}
    </button>
  );
}
