import { describe, expect, it } from 'vitest';
import { isSyntheticMode, parseAppMode } from '../integration/app-mode';

describe('app mode', () => {
  it('recognizes only the three supported modes and fails unknown values to local demo', () => {
    expect(parseAppMode('demo')).toBe('demo');
    expect(parseAppMode('showcase')).toBe('showcase');
    expect(parseAppMode('preview')).toBe('preview');
    expect(parseAppMode('production')).toBe('demo');
    expect(parseAppMode(undefined)).toBe('demo');
  });

  it('keeps every non-Preview mode behind the synthetic runtime boundary', () => {
    expect(isSyntheticMode('demo')).toBe(true);
    expect(isSyntheticMode('showcase')).toBe(true);
    expect(isSyntheticMode('preview')).toBe(false);
  });
});
