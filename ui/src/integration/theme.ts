/**
 * Light, dark, or whatever the device says.
 *
 * The cream ground is the product's identity, so it is what a reader who has
 * never touched this control gets -- on any device, whatever the OS is set to.
 * `system` remains available, but as a deliberate choice rather than the
 * silent default it used to be; picking it is stored explicitly so that
 * "asked for the device" and "never asked for anything" stay distinguishable.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'cico-theme';

/**
 * What a reader with no stored preference sees. `index.html` hard-codes the
 * same answer before first paint; the two must not drift.
 */
export const DEFAULT_THEME: ThemePreference = 'light';

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return DEFAULT_THEME;
}

export function detectThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    return parseThemePreference(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private windows and blocked site data both throw on read.
    return DEFAULT_THEME;
  }
}

export function persistThemePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    // `system` is written out rather than cleared: absence now means light.
    window.localStorage.setItem(STORAGE_KEY, preference);
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
 * Follows the device while the reader has explicitly chosen `system`. Returns
 * an unsubscribe, or a no-op where `matchMedia` is unavailable.
 */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
