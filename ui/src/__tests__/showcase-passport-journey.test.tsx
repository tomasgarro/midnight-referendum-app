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

    expect(screen.getByText(/LIVE PASSPORT · PROVIDER-OWNED/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Get started/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue with Passport/i }));
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({ requestedCapabilities: ['session', 'profile'] }),
    );
    expect(await screen.findByText('alice.night')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Prepare credential/i }));
    expect(
      screen.getByRole('heading', { name: 'The credential is not connected yet' }),
    ).toBeTruthy();
    expect(screen.queryByText(/SYNTHETIC CREDENTIAL/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: /Explore World/i }));
    expect(onCredentialReady).not.toHaveBeenCalled();
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
    expect(screen.getByRole('heading', { name: 'Continue with Midnight Passport' })).toBeTruthy();
  });

  it('keeps the onboarding bilingual through the language switch', async () => {
    const user = userEvent.setup();
    render(<PassportJourney mode="showcase" passportPort={passportPort()} onClose={vi.fn()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'es');

    expect(screen.getByRole('heading', { name: 'Una forma más clara de participar' })).toBeTruthy();
    expect(screen.getByText(/PASSPORT EN VIVO · PROVEEDOR RESPONSABLE/i)).toBeTruthy();
    expect(window.localStorage.getItem('cico-locale')).toBe('es');
    expect(screen.getByRole('list', { name: 'Tu primer recorrido' })).toBeTruthy();
  });
});
