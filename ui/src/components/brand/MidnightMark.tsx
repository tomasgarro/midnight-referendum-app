import type { SVGProps } from 'react';

type MarkProps = Omit<SVGProps<SVGSVGElement>, 'title'> & {
  readonly size?: number;
  readonly title?: string;
};

/**
 * The compact product mark is intentionally code-native. It inherits the
 * shell's semantic surface, ink, line, and accent tokens, so the same mark is
 * legible in both themes without carrying a baked-in cream background.
 */
export function MidnightMark({ size = 40, title = 'midnight.vote', ...props }: MarkProps) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="14"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 29.5h27v6.25c0 1.24-1.01 2.25-2.25 2.25h-22.5a2.25 2.25 0 0 1-2.25-2.25V29.5Z"
        fill="var(--accent)"
        stroke="var(--ink)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 29.5h29l-3.7-4.4H13.2l-3.7 4.4Z"
        fill="var(--surface-sunken)"
        stroke="var(--ink)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m17.3 24.7 2.1-11.4 11.3 2.1-2.1 11.4"
        fill="var(--surface)"
        stroke="var(--ink)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m21 19.3 2.1 2.1 4.3-4.5"
        stroke="var(--mark-warm, #efad38)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 33.2h17"
        stroke="var(--accent-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/**
 * A deliberately simpler variant for the raised center action. It has no
 * product tile, text, or secondary badge: the icon's only meaning is voting.
 */
export function VotingMark({ size = 44, ...props }: Omit<MarkProps, 'title'>) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10.5 29.5h27v6.25c0 1.24-1.01 2.25-2.25 2.25h-22.5a2.25 2.25 0 0 1-2.25-2.25V29.5Z"
        fill="var(--accent)"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 29.5h29l-3.7-4.4H13.2l-3.7 4.4Z"
        fill="var(--surface-sunken)"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m17.3 24.7 2.1-11.4 11.3 2.1-2.1 11.4"
        fill="var(--surface)"
        stroke="var(--ink)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m21 19.3 2.1 2.1 4.3-4.5"
        stroke="var(--mark-warm, #efad38)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
