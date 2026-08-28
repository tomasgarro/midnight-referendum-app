import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    expect(screen.getByRole('heading', { name: 'A clearer way to participate' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Get started/i }));
    expect(
      screen.getByRole('heading', { name: 'Three separate things, one simple experience' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Use demo Passport/i }));
    expect(screen.getByRole('heading', { name: 'This is what Passport shared' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    expect(screen.getByRole('heading', { name: 'Prepare a credential, not a vote' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Prepare credential/i }));
    await user.click(screen.getByRole('button', { name: /Use this country/i }));

    expect(screen.getByRole('heading', { name: 'Your credential is ready' })).toBeTruthy();
    expect(screen.getAllByText('SYNTHETIC CREDENTIAL').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Choose your scope|Elegí un espacio/i)).toBeNull();
    expect(screen.queryByText(/Generate local proof|Generando prueba/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /Go to civic dashboard/i }));
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
});
