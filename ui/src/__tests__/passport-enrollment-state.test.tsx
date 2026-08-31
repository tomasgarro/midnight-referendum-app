import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { CredentialJourneyTutorial } from '../components/passport-v2/CredentialJourneyTutorial';
import {
  clearPassportAttempt,
  loadPassportAttempt,
  PASSPORT_ATTEMPT_STORAGE_KEY,
  savePassportAttempt,
} from '../integration/passport-enrollment-state';

describe('opaque Passport enrollment state', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('persists only the opaque attempt handle and expiry', () => {
    savePassportAttempt({
      enrollmentId: 'opaque-attempt-7',
      expiresAt: '2026-09-01T12:00:00.000Z',
    });

    expect(window.sessionStorage.getItem(PASSPORT_ATTEMPT_STORAGE_KEY)).toBe(
      '{"enrollmentId":"opaque-attempt-7","expiresAt":"2026-09-01T12:00:00.000Z"}',
    );
    expect(window.sessionStorage.getItem(PASSPORT_ATTEMPT_STORAGE_KEY)).not.toMatch(
      /proof|mrz|nfc|document|passportNumber|holderBinding/i,
    );
    expect(loadPassportAttempt(new Date('2026-08-30T12:00:00.000Z').getTime())).toEqual({
      enrollmentId: 'opaque-attempt-7',
      expiresAt: '2026-09-01T12:00:00.000Z',
    });
  });

  it('drops malformed and expired attempts', () => {
    window.sessionStorage.setItem(PASSPORT_ATTEMPT_STORAGE_KEY, '{"proof":"secret"}');
    expect(loadPassportAttempt()).toBeNull();
    expect(window.sessionStorage.getItem(PASSPORT_ATTEMPT_STORAGE_KEY)).toBeNull();

    savePassportAttempt({
      enrollmentId: 'expired-attempt',
      expiresAt: '2026-08-29T12:00:00.000Z',
    });
    expect(loadPassportAttempt(new Date('2026-08-30T12:00:00.000Z').getTime())).toBeNull();
    expect(window.sessionStorage.getItem(PASSPORT_ATTEMPT_STORAGE_KEY)).toBeNull();
  });

  it('clears an attempt when the user cancels or restarts', () => {
    savePassportAttempt({
      enrollmentId: 'cancelled-attempt',
      expiresAt: '2026-09-01T12:00:00.000Z',
    });
    clearPassportAttempt();
    expect(loadPassportAttempt(new Date('2026-08-30T12:00:00.000Z').getTime())).toBeNull();
  });

  it('keeps unreviewed tutorial media gated while exposing a transcript', async () => {
    const user = userEvent.setup();
    const { container } = render(<CredentialJourneyTutorial />);

    expect(
      container.querySelector('[data-tutorial-media-gate="rights-review-required"]'),
    ).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
    // The tutorial is a disclosure now: the poster and the "media unavailable"
    // notice advertised a video the component never had.
    await user.click(screen.getByText(/Qué pasa en el teléfono/i));
    expect(screen.getByText(/Escaneá el QR/i)).toBeTruthy();
  });
});
