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
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('connects live Passport without contacting a wallet or entering the vote flow', async () => {
    const user = userEvent.setup();
    const connect = vi.fn().mockResolvedValue({
      sessionId: 'passport-request-1',
      origin: 'http://localhost:3000',
      network: 'preview',
      status: 'connected',
      profile: { displayName: 'alice.night' },
      capabilities: ['session', 'profile'],
    });
    const onCredentialReady = vi.fn();
    render(
      <PassportJourney
        mode="showcase"
        passportPort={passportPort(connect)}
        onClose={vi.fn()}
        onCredentialReady={onCredentialReady}
      />,
    );

    expect(screen.getByText('Live Passport')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Get started/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue with Passport/i }));
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({ requestedCapabilities: ['session', 'profile'] }),
    );
    expect(await screen.findByText('alice.night')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Create my simulated pass/i }));
    expect(screen.getByRole('heading', { name: 'Your eligibility pass is ready' })).toBeTruthy();
    // Showcase may use live Passport consent and a clearly labelled synthetic
    // eligibility pass; it must never make that pass look provider-verified.
    expect(screen.getByText('Simulated pass')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /See the consultations/i }));
    expect(onCredentialReady).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'synthetic-demo-credential', country: 'FR' }),
    );
  });

  it('offers a retryable live Passport failure without bypassing the session gate', async () => {
    const user = userEvent.setup();
    const connect = vi.fn().mockRejectedValue(new Error('Popup closed'));
    render(
      <PassportJourney mode="showcase" passportPort={passportPort(connect)} onClose={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: /Get started/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue with Passport/i }));
    expect((await screen.findByRole('alert')).textContent).toContain('Popup closed');
    expect(screen.queryByRole('button', { name: /Explore without connecting/i })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Connect your Passport' })).toBeTruthy();
  });

  it('keeps the onboarding bilingual through the language switch', async () => {
    const user = userEvent.setup();
    render(<PassportJourney mode="showcase" passportPort={passportPort()} onClose={vi.fn()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'es');

    expect(screen.getByRole('heading', { name: 'midnight.vote' })).toBeTruthy();
    expect(screen.getByText('Passport en vivo')).toBeTruthy();
    expect(window.localStorage.getItem('cico-locale')).toBe('es');
    // Welcome is a landing surface; the continuous rail begins once the
    // reader enters the one-way verification sequence.
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
