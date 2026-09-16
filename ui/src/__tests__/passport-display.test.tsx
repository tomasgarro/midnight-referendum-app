import type { CivicPassportSession } from 'midnight-referendum-api';
import { describe, expect, it } from 'vitest';
import { passportDisplay } from '@/views/passport-display';

const session: CivicPassportSession = {
  sessionId: 'test',
  origin: 'https://example.test',
  network: 'stagenet',
  status: 'connected',
  capabilities: ['session', 'profile'],
  accountAddress: 'mn_addr_stagenet_1234567890abcdefgh',
};
describe('Passport heading', () => {
  it('prefers a returned .night identity over an address', () => {
    expect(
      passportDisplay(
        { ...session, profile: { alias: 'alice.night', displayName: 'Alice' } },
        'en',
      ),
    ).toBe('alice.night');
    expect(passportDisplay({ ...session, profile: { displayName: 'alice.night' } }, 'en')).toBe(
      'alice.night',
    );
  });
  it('uses the returned address without inventing a domain or exposing a session identifier', () => {
    expect(passportDisplay(session, 'en')).toBe('mn_addr_stag…abcdefgh');
    expect(
      passportDisplay(
        { ...session, accountAddress: undefined, profile: { displayName: 'Ciudadano demo' } },
        'en',
      ),
    ).toBe('Demo Passport');
    expect(passportDisplay({ ...session, status: 'disconnected' }, 'en')).toBe(
      'Your citizen Passport',
    );
  });
});
