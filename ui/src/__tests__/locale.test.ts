import { beforeEach, describe, expect, it } from 'vitest';
import { detectLocale, persistLocale } from '../integration/locale';

describe('showcase locale', () => {
  beforeEach(() => window.localStorage.clear());

  it('detects each supported language and falls back to English', () => {
    expect(detectLocale('es-AR')).toBe('es');
    expect(detectLocale('en-GB')).toBe('en');
    // French is a pilot language now, not a fallback to English.
    expect(detectLocale('fr-FR')).toBe('fr');
    expect(detectLocale('fr-CA')).toBe('fr');
    expect(detectLocale('de-DE')).toBe('en');
  });

  it('persists the explicit choice over browser language', () => {
    persistLocale('es');
    expect(detectLocale('en-US')).toBe('es');
  });
});
