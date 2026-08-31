import { useEffect, useState } from 'react';
import './system.css';

/**
 * Turns "AR" into the regional-indicator pair "🇦🇷".
 *
 * Regional indicators are U+1F1E6..U+1F1FF, offset from ASCII 'A'.
 */
function toFlagEmoji(alpha2: string): string {
  const code = alpha2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + (letter.charCodeAt(0) - 65)));
}

let cachedSupport: boolean | null = null;

/**
 * Windows renders regional-indicator pairs as two boxed letters, not a flag.
 * Rather than ship 250 SVGs or reach for a flag CDN the artifact CSP would
 * block anyway, measure once whether this platform draws a real flag: on a
 * supporting platform the pair collapses to one glyph and is narrower than the
 * two letters it is made of.
 */
function detectFlagSupport(): boolean {
  if (cachedSupport !== null) return cachedSupport;
  if (typeof document === 'undefined') return false;
  // jsdom intentionally has no canvas renderer and logs a noisy "not
  // implemented" error before returning null. The code fallback is exactly
  // what the test environment should exercise, so avoid calling it there.
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      cachedSupport = false;
      return cachedSupport;
    }
    context.font = '20px sans-serif';
    const flag = context.measureText('\u{1F1E6}\u{1F1F7}').width;
    const letters = context.measureText('\u{1F1E6}').width * 2;
    cachedSupport = flag > 0 && flag < letters * 0.9;
    return cachedSupport;
  } catch {
    cachedSupport = false;
    return cachedSupport;
  }
}

/**
 * True only where the platform draws real flag glyphs. Callers use it to drop
 * a redundant trailing country code: on Windows the "flag" already *is* the
 * code, and printing it twice on one row is the duplication this picker was
 * built to remove.
 */
export function useFlagSupport(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(detectFlagSupport()), []);
  return supported;
}

export interface CountryFlagProps {
  readonly alpha2: string;
  readonly size?: 'sm' | 'md';
}

/**
 * A flag where the platform can draw one, and the country code where it
 * cannot. Always decorative: every use in this app sits beside the country's
 * written name, so announcing it twice would only slow a screen reader down.
 */
export function CountryFlag({ alpha2, size = 'md' }: CountryFlagProps) {
  const supported = useFlagSupport();
  const emoji = toFlagEmoji(alpha2);

  return (
    <span className="sys-flag" data-size={size} data-mode={supported ? 'emoji' : 'code'}>
      {supported && emoji ? emoji : alpha2.toUpperCase()}
    </span>
  );
}
