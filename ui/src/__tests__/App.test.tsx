import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

async function completeDemoCredential(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));
  await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
  await user.click(screen.getByRole('button', { name: /Passport de demo|demo Passport/i }));
  await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
  // Country choice is now an input on the eligibility screen rather than a
  // screen of its own, so the journey is one click shorter here.
  await user.click(
    screen.getByRole('button', { name: /Crear mi credencial|Create my credential/i }),
  );
  await user.click(
    screen.getByRole('button', { name: /Ver las consultas|See the consultations/i }),
  );
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('opens the first visit on Welcome instead of the dashboard', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /Demostrá que podés votar|Prove you can vote/i }),
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
      screen.getByRole('heading', { name: /Qué protege tu voto|What protects your vote/i }),
    ).toBeTruthy();
    expect(screen.getByText(/Tu ingreso seguro|Your secure sign-in/i)).toBeTruthy();
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
      screen.getByRole('heading', { name: /Demostrá que podés votar|Prove you can vote/i }),
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
    // The country is chosen from a flag list on the eligibility screen. It is
    // selected once, in one control: the tinted row that used to echo the
    // choice back is gone.
    await user.click(screen.getByRole('radio', { name: /Brasil|Brazil/i }));
    await user.click(
      screen.getByRole('button', { name: /Crear mi credencial|Create my credential/i }),
    );
    expect(screen.getByText(/Brasil|Brazil/i)).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: /Ver las consultas|See the consultations/i }),
    );
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

  it('consolidates the bottom navigation into three tabs and drops the separate Verify tab', async () => {
    window.sessionStorage.setItem('cico-wave1-onboarding-complete', '1');
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Explorá' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Votá' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mi perfil' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Verificá$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Verify$/ })).toBeNull();
  });

  it('shows public results on Explore without requiring a credential or a Passport session', async () => {
    window.sessionStorage.setItem('cico-wave1-onboarding-complete', '1');
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Explorá' }));
    expect(
      screen.getByRole('heading', { name: /Lo que cualquiera puede leer, sin iniciar sesión/i }),
    ).toBeTruthy();
    // No credential was ever prepared and no Passport session exists, yet the
    // public results section renders unconditionally.
    expect(screen.queryByText('Credencial lista')).toBeNull();
  });

  it('keeps one receipt per simulated vote instead of overwriting the previous one', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);

    const castVote = async (index: number, answer: RegExp) => {
      const open = screen.getAllByRole('button', { name: /Votá ahora/i });
      const button = open[index];
      if (!button) throw new Error(`Expected an open consultation at index ${index}`);
      await user.click(button);
      await user.click(screen.getByRole('button', { name: answer }));
      await user.click(screen.getByRole('button', { name: /Revisar mi voto/i }));
      await user.click(screen.getByRole('button', { name: /Crear comprobante simulado/i }));
      await user.click(screen.getByRole('button', { name: /Ver mi comprobante/i }));
      await user.click(screen.getByRole('button', { name: /^Votá$/ }));
    };

    await castVote(0, /^Sí/);
    await castVote(1, /^No/);
    await user.click(screen.getByRole('button', { name: /Mi perfil/ }));

    // Every simulated receipt used to carry the identifier
    // 'demo-tx-cico-2026-0001'. Receipts are de-duplicated by id, so the
    // second vote silently deleted the first one from the profile and from
    // the verifier's reach.
    // The receipt vault is IndexedDB-backed and survives beforeEach, so the
    // assertion is about distinctness rather than an exact count: what the
    // fixed identifier destroyed was uniqueness, not volume.
    const identifiers = [...document.querySelectorAll('.profile__receipts .profile__code')].map(
      (node) => node.textContent ?? '',
    );
    expect(identifiers.length).toBeGreaterThanOrEqual(2);
    expect(new Set(identifiers).size).toBe(identifiers.length);
    expect(screen.getAllByText(/Jubilaciones y sostenibilidad previsional/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/Energía, tarifas y transición renovable/).length).toBeGreaterThan(
      0,
    );
  });

  it('folds Verify into Mi perfil with an on-device privacy note and a working receipt lookup', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    const [voteButton] = screen.getAllByRole('button', { name: /Votá ahora/i });
    if (!voteButton) throw new Error('Expected at least one available consultation action');
    await user.click(voteButton);
    await user.click(screen.getByRole('button', { name: /^Sí/ }));
    await user.click(screen.getByRole('button', { name: /Revisar mi voto/i }));
    await user.click(screen.getByRole('button', { name: /Crear comprobante simulado/i }));
    await user.click(screen.getByRole('button', { name: /Ver mi comprobante/i }));

    // Landed on Mi perfil; the former Verify tab no longer exists.
    expect(screen.queryByRole('button', { name: /^Verificá$/ })).toBeNull();
    expect(
      screen.getByText(/cifrados solo en este dispositivo; la red nunca puede vincularlos/i),
    ).toBeTruthy();

    // Simulated receipts are per-vote now, so the lookup reads the identifier
    // the flow actually produced rather than a constant. A fixed id meant a
    // second vote silently replaced the first receipt.
    const [receiptCode] = screen.getAllByText(/^demo-/);
    const receiptId = receiptCode?.textContent ?? '';
    expect(receiptId).toMatch(/^demo-[a-z0-9:-]+-[a-z0-9]+$/i);
    const input = screen.getByLabelText('Identificador del comprobante');
    await user.type(input, receiptId);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByText('Comprobante simulado')).toBeTruthy();
  });
});
