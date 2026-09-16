import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav } from '@/views/Chrome';
import { answerCatalogue, hasValidatedPassport } from '@/views/catalogue-guide';
import { localizePoll, POLLS } from '@/views/poll-model';

const now = new Date('2026-09-15T12:00:00Z');
describe('catalogue guide boundaries', () => {
  it('returns open global and verified-country projects, not another country', () => {
    const answer = answerCatalogue(
      'What polls are open for me?',
      POLLS,
      'en',
      'FR',
      undefined,
      now,
    );
    expect(answer.pollIds).toContain('reglas-de-verificacion');
    expect(answer.pollIds).toContain('france-mobilite');
    expect(answer.pollIds).not.toContain('tierras-rurales');
    expect(
      answerCatalogue('Show global consultations', POLLS, 'en', 'FR', undefined, now).pollIds,
    ).toEqual(['reglas-de-verificacion', 'global-repair']);
  });
  it('allows explicit country browsing without pretending to establish identity', () => {
    const answer = answerCatalogue('Open polls in France', POLLS, 'en', undefined, undefined, now);
    expect(answer.pollIds).toContain('france-mobilite');
    expect(answer.scope).toBe('France + Global');
  });
  it('excludes closed, future and malformed schedules', () => {
    const invalid = POLLS.map((p) => ({ ...p, closesAt: 'invalid' }));
    expect(answerCatalogue('open polls', invalid, 'en', undefined, undefined, now).pollIds).toEqual(
      [],
    );
    expect(
      answerCatalogue('open polls', POLLS, 'en', undefined, undefined, new Date('2030-01-01'))
        .pollIds,
    ).toEqual([]);
  });
  it('uses authored summaries and follows up without inventing a project', () => {
    const poll = POLLS.find((p) => p.id === 'france-mobilite');
    expect(poll).toBeDefined();
    if (!poll) return;
    const p = localizePoll(poll, 'en');
    const answer = answerCatalogue(`Summarize ${p.title}`, POLLS, 'en');
    expect(answer.text).toBe(p.description);
    expect(answerCatalogue('What are the arguments?', POLLS, 'en', undefined, p.id).text).toContain(
      p.argumentsAgainst[0],
    );
    expect(
      answerCatalogue('Summarize the imaginary moon project', POLLS, 'en', undefined, p.id)
        .selectedId,
    ).toBeUndefined();
  });
  it('does not upgrade a demo or expired credential to a validated passport', () => {
    const c = {
      kind: 'verified-credential' as const,
      assurance: 'document-nfc',
      country: 'FR',
      issuer: 'test',
      epoch: '1',
      ageClass: '18+',
      validUntil: '2026-10-01',
    };
    expect(hasValidatedPassport(c, now)).toBe(true);
    expect(hasValidatedPassport({ ...c, kind: 'synthetic-demo-credential' }, now)).toBe(false);
    expect(hasValidatedPassport({ ...c, validUntil: '2026-01-01' }, now)).toBe(false);
  });
  it('changes the centre action when dialogue access is ready', () => {
    const change = vi.fn();
    const props = {
      tab: 'discover' as const,
      onChange: change,
      onVerify: vi.fn(),
      locale: 'en' as const,
    };
    const view = render(<BottomNav {...props} />);
    expect(screen.getByRole('button', { name: /Verify ·/ })).toBeTruthy();
    view.rerender(<BottomNav {...props} dialogueReady />);
    screen.getByRole('button', { name: 'Ask Midnight' }).click();
    expect(change).toHaveBeenCalledWith('assistant');
    expect(screen.queryByRole('button', { name: /Verify ·/ })).toBeNull();
  });
});
