import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CivicPassportSession, PassportSessionPort } from 'midnight-referendum-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassportJourney } from '../components/passport-v2/PassportJourney';

const session: CivicPassportSession = {
  sessionId: 'real-session',
  origin: 'http://localhost:3000',
  network: 'stagenet',
  status: 'connected',
  profile: { displayName: 'Ana' },
  capabilities: ['session', 'profile'],
};
const port = (connect = vi.fn().mockResolvedValue(session)): PassportSessionPort => ({
  adapterName: 'test',
  supportedCapabilities: ['session', 'profile'],
  connect,
  getSession: vi.fn().mockResolvedValue(session),
  disconnect: vi.fn(),
  requestCapability: vi.fn(),
});

describe('Passport onboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  it('can leave the demo selection and reconnect a real Passport after navigating back', async () => {
    const user = userEvent.setup();
    const connect = vi.fn().mockResolvedValue(session);
    const connected = vi.fn();
    render(
      <PassportJourney
        mode="demo"
        initialStage="passport"
        initialLocale="en"
        passportPort={port(connect)}
        onClose={vi.fn()}
        onPassportConnected={connected}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Use demo Passport' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    await user.click(screen.getByRole('button', { name: 'Use my real Passport' }));
    expect(connected).toHaveBeenLastCalledWith(null);
    await user.click(screen.getByRole('button', { name: 'Connect Midnight Passport' }));
    expect(connect).toHaveBeenCalledOnce();
    expect(connected).toHaveBeenLastCalledWith(session);
    expect(screen.queryByText('Demo profile selected')).toBeNull();
  });
  it('creates a simulated pass only through the explicit demo path', async () => {
    const user = userEvent.setup();
    const onCredentialReady = vi.fn();
    const onClose = vi.fn();
    const onComplete = vi.fn();
    render(
      <PassportJourney
        mode="demo"
        initialLocale="en"
        onClose={onClose}
        onComplete={onComplete}
        onCredentialReady={onCredentialReady}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Get started' }));
    expect(screen.queryByText('Try a zero-knowledge proof')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Use demo Passport' }));
    expect(screen.getByRole('status').textContent).toContain('Demo profile selected');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByText('Try with a simulated pass'));
    await user.click(screen.getByRole('radio', { name: /Argentina/ }));
    await user.click(screen.getByRole('button', { name: 'Create my simulated pass' }));
    expect(onCredentialReady).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'See the consultations' }));
    expect(onCredentialReady).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'synthetic-demo-credential', country: 'AR' }),
    );
    expect(onComplete).toHaveBeenCalledWith('demo-ready');
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('skips into browsing without a synthetic session or credential', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onComplete = vi.fn();
    const onCredentialReady = vi.fn();
    const onPassportConnected = vi.fn();
    render(
      <PassportJourney
        mode="demo"
        initialStage="passport"
        initialLocale="en"
        dismissible={false}
        onClose={onClose}
        onComplete={onComplete}
        onCredentialReady={onCredentialReady}
        onPassportConnected={onPassportConnected}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith('browsing');
    expect(onCredentialReady).not.toHaveBeenCalled();
    expect(onPassportConnected).not.toHaveBeenCalled();
  });
  it('connects the real port even in demo mode, and preserves it when verification is deferred', async () => {
    const user = userEvent.setup();
    const connect = vi.fn().mockResolvedValue(session);
    const connected = vi.fn();
    const credential = vi.fn();
    const complete = vi.fn();
    render(
      <PassportJourney
        mode="demo"
        initialStage="passport"
        initialLocale="en"
        passportPort={port(connect)}
        onClose={vi.fn()}
        onComplete={complete}
        onPassportConnected={connected}
        onCredentialReady={credential}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Connect Midnight Passport' }));
    expect(connect).toHaveBeenCalledWith(
      expect.objectContaining({
        network: 'stagenet',
        requestedCapabilities: ['session', 'profile'],
      }),
    );
    expect(connected).toHaveBeenCalledWith(session);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Do this later' }));
    expect(complete).toHaveBeenCalledWith('deferred');
    expect(credential).not.toHaveBeenCalled();
    expect(connected).toHaveBeenCalledTimes(1);
  });
  it('ignores a late result after cancellation and allows retry', async () => {
    const user = userEvent.setup();
    let resolve!: (s: CivicPassportSession) => void;
    const connect = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<CivicPassportSession>((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValue(session);
    const connected = vi.fn();
    render(
      <PassportJourney
        mode="showcase"
        initialStage="passport"
        initialLocale="en"
        passportPort={port(connect)}
        onClose={vi.fn()}
        onPassportConnected={connected}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Connect Midnight Passport' }));
    await user.click(screen.getByRole('button', { name: 'Cancel connection' }));
    await act(async () => resolve(session));
    expect(connected).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Connect Midnight Passport' }));
    expect(connected).toHaveBeenCalledOnce();
  });
  it('returns along the actual shortcut and nested document path', async () => {
    const user = userEvent.setup();
    render(<PassportJourney mode="demo" initialLocale="en" onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Already have Passport/ }));
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Already have Passport/ }));
    await user.click(screen.getByRole('button', { name: 'Use demo Passport' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Verify my passport' }));
    const first = screen.getByRole('heading').textContent;
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading').textContent).not.toBe(first);
    await user.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(screen.getByRole('heading').textContent).toBe(first);
  });
  it('uses the shared welcome in preview and offers no fabricated fallback', async () => {
    const user = userEvent.setup();
    render(<PassportJourney mode="preview" initialLocale="en" onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Already have Passport/ }));
    expect(screen.queryByRole('button', { name: 'Use demo Passport' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Connect Midnight Passport' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy();
  });
});
