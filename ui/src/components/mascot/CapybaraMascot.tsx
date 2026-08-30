import type { CSSProperties } from 'react';
import achievementSrc from '@/assets/mascot/capybara-achievement.png';
import climbingSrc from '@/assets/mascot/capybara-climbing.png';
import readingSrc from '@/assets/mascot/capybara-reading.png';
import thinkingSrc from '@/assets/mascot/capybara-thinking.png';
import waitingSrc from '@/assets/mascot/capybara-waiting.png';
import wavingSrc from '@/assets/mascot/capybara-waving.png';
import './CapybaraMascot.css';

export type CapybaraMascotVariant =
  | 'waving'
  | 'reading'
  | 'thinking'
  | 'achievement'
  | 'climbing'
  | 'waiting';

export type CapybaraMascotSize = 'sm' | 'md' | 'lg' | number;

interface MascotAsset {
  src: string;
  width: number;
  height: number;
  label: string;
}

const MASCOT_ASSETS: Record<CapybaraMascotVariant, MascotAsset> = {
  waving: {
    src: wavingSrc,
    width: 1024,
    height: 1024,
    label: 'Capybara waving hello',
  },
  reading: {
    src: readingSrc,
    width: 1024,
    height: 1024,
    label: 'Capybara reading a book',
  },
  thinking: {
    src: thinkingSrc,
    width: 1024,
    height: 1024,
    label: 'Capybara thinking',
  },
  achievement: {
    src: achievementSrc,
    width: 1024,
    height: 1024,
    label: 'Capybara holding a small flag on a hill',
  },
  climbing: {
    src: climbingSrc,
    width: 1024,
    height: 1024,
    label: 'Capybara climbing a gentle hill',
  },
  waiting: {
    src: waitingSrc,
    width: 1024,
    height: 1024,
    label: 'Capybara waiting beside an hourglass',
  },
};

export interface CapybaraMascotProps {
  variant: CapybaraMascotVariant;
  /** Supply localized copy when the mascot adds meaning. */
  alt?: string;
  /** Use only when nearby text already communicates the same state. */
  decorative?: boolean;
  size?: CapybaraMascotSize;
  priority?: boolean;
  className?: string;
}

export function CapybaraMascot({
  variant,
  alt,
  decorative = false,
  size = 'md',
  priority = false,
  className = '',
}: CapybaraMascotProps) {
  const asset = MASCOT_ASSETS[variant];
  const numericSize = typeof size === 'number' ? Math.max(48, size) : undefined;
  const style = numericSize
    ? ({ '--capybara-mascot-size': `${numericSize}px` } as CSSProperties)
    : undefined;

  return (
    <span
      className={`capybara-mascot ${className}`.trim()}
      data-mascot="future-capybara"
      data-size={numericSize ? 'custom' : size}
      data-variant={variant}
      aria-hidden={decorative || undefined}
      style={style}
    >
      <img
        src={asset.src}
        alt={decorative ? '' : (alt ?? asset.label)}
        width={asset.width}
        height={asset.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
      />
    </span>
  );
}
