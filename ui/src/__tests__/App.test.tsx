import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

async function completeDemoCredential(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));
  await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
  await user.click(screen.getByRole('button', { name: /Passport de demo|demo Passport/i }));
  await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
  await user.click(screen.getByRole('button', { name: /Preparar credencial|Prepare credential/i }));
  await user.click(screen.getByRole('button', { name: /Usar este país|Use this country/i }));
  await user.click(screen.getByRole('button', { name: /Ir al panel|Go to civic dashboard/i }));
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('opens the first visit on Welcome instead of the dashboard', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /Una forma más clara|A clearer way/i }),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Consultas para vos' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Wallet' })).toBeNull();
  });

  it('treats first-run onboarding as a one-way journey before the dashboard', async () => {
    render(<App />);
    const user = userEvent.setup();
    expect(screen.queryByRole('button', { name: /Volver a la app|Back to the app/i })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Explorar sin conectar|Explore without connecting/i }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));
    expect(
      screen.getByRole('heading', { name: /Tres cosas distintas|Three separate things/i }),
    ).toBeTruthy();
    expect(screen.getByText(/Passport.*identifica|Passport.*session/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Volver a la app|Back to the app/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Consultas para vos' })).toBeNull();
  });

  it('completes the Passport-first credential journey without scope, ballot, or wallet discovery', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    expect(screen.getByRole('heading', { name: 'Consultas para vos' })).toBeTruthy();
    expect(screen.getByText('Credencial lista')).toBeTruthy();
    expect(screen.getByText(/Argentina \(AR\)/i)).toBeTruthy();
    expect(screen.getByRole('tab', { name: /World|Mundo/ }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.queryByText(/Passport v2|Paso 9|Elegí tu respuesta/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Wallet' })).toBeNull();
  });

  it('supports a global country catalogue with only the credential country unlocked', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    await user.click(screen.getByRole('tab', { name: /Countries|Países/ }));
    const selector = screen.getByRole('combobox', { name: 'País' });
    expect(selector.querySelectorAll('option').length).toBeGreaterThan(200);
    await user.selectOptions(selector, 'BR');
    expect(screen.getByText('Brasil todavía está bloqueado')).toBeTruthy();
    await user.selectOptions(selector, 'AR');
    expect(
      screen.getByRole('heading', { name: 'Tierras rurales y propiedad extranjera' }),
    ).toBeTruthy();
  });

  it('keeps the onboarding explanation available from the profile', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    await user.click(screen.getByRole('button', { name: 'Mi perfil' }));
    await user.click(screen.getByRole('button', { name: /Revisar el recorrido/i }));
    expect(
      screen.getByRole('heading', { name: /Una forma más clara|A clearer way/i }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Volver a la app|Back to the app/i })).toBeTruthy();
  });

  it('changes the synthetic demo credential country without changing product branding', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));
    await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
    await user.click(screen.getByRole('button', { name: /Passport de demo|demo Passport/i }));
    await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
    await user.click(
      screen.getByRole('button', { name: /Preparar credencial|Prepare credential/i }),
    );
    const country = screen.getByRole('combobox', { name: /País del fixture|Fixture country/i });
    await user.clear(country);
    await user.type(country, 'Brasil (BR)');
    await user.click(screen.getByRole('button', { name: /Usar este país|Use this country/i }));
    expect(screen.getByText(/Brasil|Brazil/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Ir al panel|Go to civic dashboard/i }));
    expect(screen.getByText('Referéndum Cívico')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /Countries|Países/ }));
    expect(screen.getByText('No hay consultas disponibles en este espacio')).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Tierras rurales y propiedad extranjera' }),
    ).toBeNull();
  });

  it('creates a clearly labelled simulated receipt without a wallet', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    const [voteButton] = screen.getAllByRole('button', { name: /Votá ahora/i });
    if (!voteButton) throw new Error('Expected at least one available consultation action');
    await user.click(voteButton);
    await user.click(screen.getByRole('button', { name: /^Sí/ }));
    await user.click(screen.getByRole('button', { name: /Revisar mi voto/i }));
    expect(screen.queryByRole('button', { name: 'Wallet' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Crear comprobante simulado/i }));
    expect(screen.getByRole('heading', { name: 'Gracias por participar' })).toBeTruthy();
    expect(screen.getByText(/No representa una transacción/i)).toBeTruthy();
  });

  it('propagates English through the active dashboard and document metadata', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox', { name: /Idioma|Language/ }), 'en');
    await completeDemoCredential(user);
    expect(screen.getByRole('heading', { name: 'Consultations for you' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'World' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toMatch(/Civic Referendum/i);
  });
});
