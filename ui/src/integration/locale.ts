/**
 * The three languages the pilot speaks.
 *
 * French joins Spanish and English because the reference civic journey this
 * product follows is a French one, and a person who switches the selector to
 * French should not then read Spanish for the rest of the app.
 */
export type CicoLocale = 'en' | 'es' | 'fr';

export const SUPPORTED_LOCALES: readonly CicoLocale[] = ['es', 'en', 'fr'];

const STORAGE_KEY = 'cico-locale';

function isSupported(value: string | null | undefined): value is CicoLocale {
  return value === 'en' || value === 'es' || value === 'fr';
}

export function detectLocale(
  language = typeof navigator === 'undefined' ? 'en' : navigator.language,
): CicoLocale {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupported(stored)) return stored;
  }
  const tag = language.toLowerCase();
  if (tag.startsWith('es')) return 'es';
  if (tag.startsWith('fr')) return 'fr';
  return 'en';
}

export function persistLocale(locale: CicoLocale): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, locale);
}
