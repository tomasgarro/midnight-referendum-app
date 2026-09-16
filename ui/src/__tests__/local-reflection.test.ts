import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  eraseReflection,
  type LocalReflection,
  REFLECTION_KEY,
  readReflection,
  saveReflection,
} from '@/pulse/local-reflection';

const reflection: LocalReflection = {
  version: 1,
  savedAt: '2026-09-16T12:00:00Z',
  priorities: ['housing'],
  tradeoffs: [],
  explanationAreas: ['costs'],
  budget: 'low',
  funding: 'phase',
};
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it('persists only after an explicit save and deletes the saved answers', () => {
  expect(readReflection()).toBeNull();
  expect(saveReflection(reflection)).toBe(true);
  expect(readReflection()).toEqual(reflection);
  expect(eraseReflection()).toBe(true);
  expect(readReflection()).toBeNull();
});
it('rejects corrupt or unsupported snapshots and strips unknown fields', () => {
  for (const raw of [
    '{',
    'null',
    JSON.stringify({ ...reflection, priorities: ['invented'] }),
    JSON.stringify({ ...reflection, version: 9 }),
  ]) {
    localStorage.setItem(REFLECTION_KEY, raw);
    expect(readReflection()).toBeNull();
  }
  localStorage.setItem(
    REFLECTION_KEY,
    JSON.stringify({ ...reflection, secret: 'must-not-import' }),
  );
  expect(readReflection()).toEqual(reflection);
});
it('reports storage refusal instead of claiming it saved', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(saveReflection(reflection)).toBe(false);
});
