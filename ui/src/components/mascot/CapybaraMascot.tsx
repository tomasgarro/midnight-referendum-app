import type { CSSProperties } from 'react';
/*
 * WebP at 640px, not PNG at 1024px.
 *
 * All seven variants are statically imported, so every build shipped all seven
 * whether or not a screen used them: 5.78 MB of 1024-square PNGs for artwork
 * that is never drawn larger than 190 CSS px. At 640 square there is still
 * more than 3x the pixels a 190px slot needs on a 3x display, and the set is
 * 395 KB. The 1024px PNGs stay in the repository as the editable source.
 */
import achievementSrc from '@/assets/mascot/capybara-achievement.webp';
import climbingSrc from '@/assets/mascot/capybara-climbing.webp';
import passportSrc from '@/assets/mascot/capybara-passport.webp';
import readingSrc from '@/assets/mascot/capybara-reading.webp';
import thinkingSrc from '@/assets/mascot/capybara-thinking.webp';
import waitingSrc from '@/assets/mascot/capybara-waiting.webp';
import wavingSrc from '@/assets/mascot/capybara-waving.webp';
import './CapybaraMascot.css';

export type CapybaraMascotVariant =
  | 'waving'
  | 'reading'
  | 'thinking'
  | 'achievement'
  | 'climbing'
  | 'passport'
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
    width: 640,
    height: 640,
    label: 'Capybara waving hello',
  },
  reading: {
    src: readingSrc,
    width: 640,
    height: 640,
    label: 'Capybara reading a book',
  },
  thinking: {
    src: thinkingSrc,
    width: 640,
    height: 640,
    label: 'Capybara thinking',
  },
  achievement: {
    src: achievementSrc,
    width: 640,
    height: 640,
    label: 'Capybara holding a small flag on a hill',
  },
  climbing: {
    src: climbingSrc,
    width: 640,
    height: 640,
    label: 'Capybara climbing a gentle hill',
  },
  passport: {
    src: passportSrc,
    width: 640,
    height: 700,
    label: 'Capybara holding a passport',
  },
  waiting: {
    src: waitingSrc,
    width: 640,
    height: 640,
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
