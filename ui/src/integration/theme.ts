/**
 * Light, dark, or whatever the device says.
 *
 * The palette's cream ground is the product's identity, and it was being
 * silently replaced by the dark palette on any device set to dark -- a choice
 * the reader never made here and could not undo here. `system` stays the
 * default, so nothing changes for anyone who has not asked; the other two are
 * an explicit override that wins in both directions.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'cico-theme';

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function detectThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    return parseThemePreference(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private windows and blocked site data both throw on read.
    return 'system';
  }
}

export function persistThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    if (preference === 'system') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // A theme that cannot be remembered is still worth applying for this visit.
  }
}

export function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference;
}

/**
 * Stamps the resolved theme on the document element. The stylesheet keys the
 * dark palette on this attribute alone, so nothing is themed until it is set --
 * which is why `index.html` sets it before first paint rather than waiting for
 * React.
 */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved;
  }
  return resolved;
}

/**
 * Follows the device while the reader has expressed no preference. Returns an
 * unsubscribe, or a no-op where `matchMedia` is unavailable.
 */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
