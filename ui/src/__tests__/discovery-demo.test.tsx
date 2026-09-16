import { describe, expect, it } from 'vitest';
import {
  answerCatalogue,
  canUseCatalogueDialogue,
  hasValidatedPassport,
} from '@/views/catalogue-guide';
import { canUseDemoPass } from '@/views/discovery-presentation';
import { DEFAULT_POLL, localizePoll, POLLS } from '@/views/poll-model';

const now = new Date('2026-09-15T12:00:00Z');
const demo = {
  kind: 'synthetic-demo-credential' as const,
  issuer: 'test',
  country: 'CH',
  ageClass: '18+',
  assurance: 'fixture',
  epoch: 'test',
  validUntil: '2026-12-01',
};
describe('demo discovery', () => {
  it('opens dialogue for a demo without claiming verification or enabling it in real mode', () => {
    expect(canUseCatalogueDialogue(demo, true, now)).toBe(true);
    expect(canUseCatalogueDialogue(demo, false, now)).toBe(false);
    expect(hasValidatedPassport(demo, now)).toBe(false);
    expect(canUseCatalogueDialogue({ ...demo, validUntil: '2020-01-01' }, true, now)).toBe(false);
  });
  it('lists Swiss and global consultations without other-country fixtures', () => {
    const result = answerCatalogue(
      'What polls are open for me?',
      POLLS,
      'en',
      'CH',
      undefined,
      now,
    );
    expect(result.pollIds).toEqual([
      'reglas-de-verificacion',
      'switzerland-rail',
      'switzerland-housing',
      'switzerland-nature',
      'switzerland-bitcoin',
      'global-repair',
    ]);
    expect(DEFAULT_POLL.id).toBe('reglas-de-verificacion');
  });
  it('checks age, country and expiry on each simulated participation', () => {
    const swiss = POLLS.find((p) => p.id === 'switzerland-rail');
    if (!swiss) throw Error('Missing fixture');
    expect(canUseDemoPass(swiss, demo, now)).toBe(true);
    expect(canUseDemoPass(swiss, { ...demo, ageClass: 'under-18' }, now)).toBe(false);
    expect(canUseDemoPass(swiss, { ...demo, country: 'IT' }, now)).toBe(false);
    expect(canUseDemoPass(swiss, { ...demo, validUntil: '2020-01-01' }, now)).toBe(false);
    expect(canUseDemoPass(DEFAULT_POLL, { ...demo, ageClass: 'under-18' }, now)).toBe(false);
  });
  it('localizes new fixtures in all three supported languages', () => {
    const swiss = POLLS.find((p) => p.id === 'switzerland-rail');
    if (!swiss) throw Error('Missing fixture');
    expect(localizePoll(swiss, 'fr').title).toBe('Mieux relier nos communautés');
    expect(localizePoll(swiss, 'en').title).toBe('Better connections, closer communities');
    expect(localizePoll(swiss, 'es').title).toBe('Mejores conexiones, comunidades más cerca');
  });
});
