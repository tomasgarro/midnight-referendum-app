import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  DEFAULT_THEME,
  detectThemePreference,
  parseThemePreference,
  persistThemePreference,
  resolveTheme,
} from '../integration/theme';

/**
 * Reports the device as dark, so every assertion below about "light anyway"
 * is a real one rather than an accident of the test environment.
 */
function mockDarkDevice() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('theme preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockDarkDevice();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
  });

  it('defaults a fresh reader to light on a dark device', () => {
    expect(DEFAULT_THEME).toBe('light');
    expect(detectThemePreference()).toBe('light');
    expect(applyTheme(detectThemePreference())).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('treats junk and absent values as the default rather than the device', () => {
    expect(parseThemePreference(null)).toBe('light');
    expect(parseThemePreference(undefined)).toBe('light');
    expect(parseThemePreference('cream')).toBe('light');
  });

  it('still follows the device once system is explicitly chosen', () => {
    persistThemePreference('system');
    expect(window.localStorage.getItem('cico-theme')).toBe('system');
    expect(detectThemePreference()).toBe('system');
    expect(resolveTheme('system')).toBe('dark');
    expect(applyTheme('system')).toBe('dark');
  });

  it('round-trips an explicit override in both directions', () => {
    persistThemePreference('dark');
    expect(detectThemePreference()).toBe('dark');
    expect(applyTheme('dark')).toBe('dark');

    persistThemePreference('light');
    expect(detectThemePreference()).toBe('light');
    expect(applyTheme('light')).toBe('light');
  });
});
