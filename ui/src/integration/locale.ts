export type CicoLocale = 'en' | 'es';

const STORAGE_KEY = 'cico-locale';

export function detectLocale(
  language = typeof navigator === 'undefined' ? 'en' : navigator.language,
): CicoLocale {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  }
  return language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function persistLocale(locale: CicoLocale): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, locale);
}
