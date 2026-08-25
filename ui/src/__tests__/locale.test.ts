import { beforeEach, describe, expect, it } from 'vitest';
import { detectLocale, persistLocale } from '../integration/locale';

describe('showcase locale', () => {
  beforeEach(() => window.localStorage.clear());

  it('detects Spanish and otherwise defaults to English', () => {
    expect(detectLocale('es-AR')).toBe('es');
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale('fr-FR')).toBe('en');
  });

  it('persists the explicit choice over browser language', () => {
    persistLocale('es');
    expect(detectLocale('en-US')).toBe('es');
  });
});
