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

  it('shows the trimmed scan walkthrough alongside the written steps', async () => {
    const user = userEvent.setup();
    const { container } = render(<CredentialJourneyTutorial />);

    // The clip is three trimmed moments from the provider walkthrough, cropped
    // to the illustration. It is silent and carries no audio track, so the
    // written steps remain the accessible path.
    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.hasAttribute('muted') || video?.muted).toBeTruthy();
    expect(container.querySelectorAll('video source')).toHaveLength(2);
    // The tutorial is a disclosure now: the poster and the "media unavailable"
    // notice advertised a video the component never had.
    await user.click(screen.getByText(/Qué pasa en el teléfono/i));
    expect(screen.getByText(/Escaneá el QR/i)).toBeTruthy();
    expect(screen.getByText(/lectura NFC se detiene/i)).toBeTruthy();
    expect(screen.getByText(/Rarimo informa que el intento venció/i)).toBeTruthy();
  });
});
