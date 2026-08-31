import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PassportSessionPort } from 'midnight-referendum-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassportJourney } from '../components/passport-v2/PassportJourney';

describe('PassportJourney', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('ends the deterministic demo journey after credential success', async () => {
    const user = userEvent.setup();
    const onCredentialReady = vi.fn();
    const onClose = vi.fn();
    render(<PassportJourney mode="demo" onClose={onClose} onCredentialReady={onCredentialReady} />);

    expect(
      screen.getByRole('heading', { name: 'Prove you can vote. Without proving who you are.' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Get started/i }));
    expect(screen.getByRole('heading', { name: 'What protects your vote' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Use demo Passport/i }));
    expect(screen.getByRole('heading', { name: 'This is what Passport shared' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    expect(screen.getByRole('heading', { name: 'Vote from wherever you are' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Create my credential/i }));

    expect(screen.getByRole('heading', { name: 'Your credential is ready' })).toBeTruthy();
    // The uppercase SYNTHETIC CREDENTIAL banner is now a row in the summary
    // it used to shout above: whether a credential is synthetic is a value,
    // like its country and its issuer, not a flag.
    expect(screen.getAllByText('Synthetic credential').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Choose your scope|Elegí un espacio/i)).toBeNull();
    expect(screen.queryByText(/Generate local proof|Generando prueba/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /See the consultations/i }));
    expect(onCredentialReady).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'AR', ageClass: '18+' }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps Preview honest when the live credential ports are not configured', () => {
    render(<PassportJourney mode="preview" onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'La credencial Passport todavía no está conectada' }),
    ).toBeTruthy();
    expect(screen.getByText(/No presentamos una fixture como una credencial real/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Use demo Passport/i })).toBeNull();
  });

  it('routes undeployed through the official Passport journey instead of synthetic onboarding', async () => {
    const user = userEvent.setup();
    const connect = vi.fn().mockResolvedValue({
      sessionId: 'preview-account',
      origin: 'http://localhost:4173',
      network: 'preview',
      status: 'connected',
      profile: { displayName: 'Preview account' },
      capabilities: ['session', 'profile'],
    });
    const passportPort = {
      adapterName: 'test-passport',
      supportedCapabilities: ['session', 'profile'],
      connect,
      getSession: vi.fn(),
      requestCapability: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as PassportSessionPort;
    render(
      <PassportJourney
        mode="undeployed"
        onClose={vi.fn()}
        passportPort={passportPort}
        previewPorts={{ passport: passportPort }}
      />,
    );

    expect(screen.getByText('Cadena local')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Use demo Passport/i })).toBeNull();
    // The two-networks caveat is stated before the reader connects, on the
    // screen where they are deciding to, rather than as a notice afterwards.
    expect(screen.getByText(/¿A qué red me estoy conectando\?/)).toBeTruthy();
    expect(screen.getByText(/sigue sin contrato desplegado/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Conectar Passport/i }));
    expect(await screen.findByRole('heading', { name: 'Sesión Passport conectada' })).toBeTruthy();
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'preview',
        requestedCapabilities: ['session', 'profile'],
      }),
    );
    // The session screen reports the network Passport actually returned; it
    // no longer repeats the caveat the consent screen already made.
    expect(screen.getAllByText('preview').length).toBeGreaterThan(0);
  });
});
