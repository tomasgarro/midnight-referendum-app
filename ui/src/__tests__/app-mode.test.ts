import { describe, expect, it } from 'vitest';
import { isSyntheticMode, parseAppMode, resolveAppMode } from '../integration/app-mode';

describe('app mode', () => {
  it('recognizes only the three supported modes and fails unknown values to local demo', () => {
    expect(parseAppMode('demo')).toBe('demo');
    expect(parseAppMode('showcase')).toBe('showcase');
    expect(parseAppMode('preview')).toBe('preview');
    expect(parseAppMode('undeployed')).toBe('undeployed');
    expect(parseAppMode('production')).toBe('demo');
    expect(parseAppMode(undefined)).toBe('demo');
  });

  it('keeps every non-Preview mode behind the synthetic runtime boundary', () => {
    expect(isSyntheticMode('demo')).toBe(true);
    expect(isSyntheticMode('showcase')).toBe(true);
    expect(isSyntheticMode('preview')).toBe(false);
  });

  it('lets showcase and undeployed build modes override a copied environment mode', () => {
    expect(resolveAppMode('showcase', 'demo')).toBe('showcase');
    expect(resolveAppMode('undeployed', 'preview')).toBe('undeployed');
    expect(resolveAppMode('demo', 'undeployed')).toBe('demo');
    expect(resolveAppMode('development', 'preview')).toBe('preview');
  });
});
