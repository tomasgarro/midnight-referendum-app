import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PassportSessionPort } from 'midnight-referendum-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassportJourney } from '../components/passport-v2/PassportJourney';

function passportPort(connect = vi.fn()) {
  return {
    adapterName: 'test-passport',
    supportedCapabilities: ['session', 'profile'],
    connect,
    getSession: vi.fn(),
    requestCapability: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as PassportSessionPort;
}

describe('Passport-first public showcase', () => {
  beforeEach(() => window.localStorage.clear());

  it('connects live Passport using only session/profile and keeps later steps explicit', async () => {
    const user = userEvent.setup();
    const connect = vi.fn().mockResolvedValue({
      sessionId: 'passport-request-1',
      origin: 'http://localhost:3000',
      network: 'preview',
      status: 'connected',
      profile: { displayName: 'alice.night' },
      capabilities: ['session', 'profile'],
    });
    render(
      <PassportJourney mode="showcase" passportPort={passportPort(connect)} onClose={vi.fn()} />,
    );

    expect(screen.getByText('LIVE PASSPORT')).toBeTruthy();
    expect(screen.getByText('SYNTHETIC CREDENTIAL')).toBeTruthy();
    expect(screen.getByText('SIMULATED VOTE')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Begin privacy walkthrough/i }));
    await user.click(screen.getByRole('button', { name: /^Connect Passport/i }));

    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({ requestedCapabilities: ['session', 'profile'] }),
    );
    expect(await screen.findByText('alice.night')).toBeTruthy();
    expect(screen.queryByText(/midnight-display-address/i)).toBeNull();
  });

  it('offers a retryable failure and an honest non-session fallback', async () => {
    const user = userEvent.setup();
    const connect = vi.fn().mockRejectedValue(new Error('Popup closed'));
    render(
      <PassportJourney mode="showcase" passportPort={passportPort(connect)} onClose={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: /Begin privacy walkthrough/i }));
    await user.click(screen.getByRole('button', { name: /^Connect Passport/i }));
    expect((await screen.findByRole('alert')).textContent).toContain('Popup closed');
    await user.click(screen.getByRole('button', { name: /Continue without a Passport session/i }));
    expect(screen.getByText('Exploring anonymously')).toBeTruthy();
    expect(screen.queryByText('LIVE PASSPORT', { selector: 'small' })).toBeNull();
  });

  it('keeps the critical journey bilingual through the persistent language switch', async () => {
    const user = userEvent.setup();
    render(<PassportJourney mode="showcase" passportPort={passportPort()} onClose={vi.fn()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'es');
    expect(
      screen.getByRole('heading', { name: 'Sabé qué está activo antes de empezar' }),
    ).toBeTruthy();
    expect(screen.getByText('PASSPORT EN VIVO')).toBeTruthy();
    expect(window.localStorage.getItem('cico-locale')).toBe('es');
  });
});
