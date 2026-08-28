import { describe, expect, it } from 'vitest';
import { countOpenPolls, getPollAvailability } from '../integration/poll-lifecycle';

const lifecycle = {
  opensAt: '2026-08-01T00:00:00Z',
  closesAt: '2026-08-31T00:00:00Z',
};

describe('poll lifecycle', () => {
  it('derives open state from the clock', () => {
    expect(getPollAvailability(lifecycle, new Date('2026-08-15T00:00:00Z'))).toEqual({
      isOpen: true,
      reason: 'open',
    });
    expect(getPollAvailability(lifecycle, new Date('2026-09-01T00:00:00Z')).reason).toBe(
      'closed-by-clock',
    );
  });

  it('lets canonical phase close an otherwise open schedule', () => {
    expect(
      getPollAvailability({ ...lifecycle, phase: 'REVEAL' }, new Date('2026-08-15T00:00:00Z')),
    ).toEqual({ isOpen: false, reason: 'closed-on-chain' });
  });

  it('counts only currently open polls', () => {
    expect(
      countOpenPolls(
        [lifecycle, { ...lifecycle, closesAt: '2026-08-10T00:00:00Z' }],
        new Date('2026-08-15T00:00:00Z'),
      ),
    ).toBe(1);
  });

  it('rejects malformed intervals', () => {
    expect(() => getPollAvailability({ opensAt: 'invalid', closesAt: lifecycle.closesAt })).toThrow(
      'valid opening and closing interval',
    );
  });
});
