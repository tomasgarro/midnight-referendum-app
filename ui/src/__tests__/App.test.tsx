import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';

/**
 * The onboarding is one straight line: welcome, what the three things are,
 * Passport, what Passport shared, the simulated pass, done. The country is
 * chosen on the eligibility screen rather than on a screen of its own.
 */
async function completeDemoCredential(user: ReturnType<typeof userEvent.setup>, country?: RegExp) {
  await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));
  await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
  await user.click(screen.getByRole('button', { name: /Passport de demo|demo Passport/i }));
  await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
  // France is the default; the pilot's other country is one click away.
  if (country) await user.click(screen.getByRole('radio', { name: country }));
  await user.click(
    screen.getByRole('button', { name: /Crear mi pase simulado|Create my simulated pass/i }),
  );
  await user.click(
    screen.getByRole('button', { name: /Ver las consultas|See the consultations/i }),
  );
}

/** The five-position bar renders only once onboarding is behind the reader. */
function skipOnboarding() {
  window.sessionStorage.setItem('cico-wave1-onboarding-complete', '1');
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
    await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));
    expect(
      screen.getByRole('heading', { name: /Qué protege tu voto|What protects your vote/i }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Volver a la app|Back to the app/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Consultas para vos' })).toBeNull();
  });

  /**
   * The confusion this product kept producing was three different things all
   * called "passport". The privacy stage is where they are separated, so it is
   * asserted by name: the Midnight account, the physical document, and the
   * small result that participating actually uses.
   */
  it('separates the Midnight account, the physical document and the eligibility pass', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));

    expect(screen.getByText('Midnight Passport')).toBeTruthy();
    expect(screen.getByText('Pasaporte físico')).toBeTruthy();
    expect(screen.getByText('Pase de elegibilidad')).toBeTruthy();
    expect(screen.getByText(/No está guardado dentro de Passport/i)).toBeTruthy();
  });

  it('completes the Passport-first journey without scope, ballot, or wallet discovery', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    expect(screen.getByRole('heading', { name: /Decisiones que podés explorar/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Global/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText(/Passport v2|Paso 9|Elegí tu respuesta/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Wallet' })).toBeNull();
  });

  it('carries five destinations with Verify as an action rather than a tab', async () => {
    skipOnboarding();
    render(<App />);
    expect(await screen.findByRole('button', { name: 'Descubrir' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Credenciales' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Actividad' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Passport$/ })).toBeTruthy();

    // Verify is reachable, but it is not a peer of the tabs: it carries no
    // visible label, it lives outside the nav, and it never becomes current.
    // Inside the nav it told a screen reader there were five items of which
    // only four could ever be the page.
    const nav = screen.getByRole('navigation');
    expect(within(nav).getAllByRole('button')).toHaveLength(4);

    const verify = screen.getByRole('button', { name: /Verificar · documento físico/ });
    expect(nav.contains(verify)).toBe(false);
    expect(verify.getAttribute('aria-current')).toBeNull();
    expect(verify.textContent).toBe('');
    expect(screen.queryByRole('button', { name: /^Verificar$/ })).toBeNull();
  });

  /**
   * Verify is an action for someone who already has an account. Sending a
   * returning reader back through the welcome screen and a second consent
   * request was the fastest way to make the button feel like a trap.
   */
  it('opens Verify at the document step once Passport is connected', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);

    await user.click(screen.getByRole('button', { name: /Verificar · documento físico/ }));

    expect(screen.getByRole('heading', { name: /Creá tu pase de elegibilidad/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Comenzar|Get started/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Paso anterior|Previous step/i })).toBeNull();
  });

  /**
   * Browsing is not belonging. Opening France while holding an Argentine pass
   * must not present the reader as eligible there.
   */
  it('keeps country browsing separate from eligibility', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);

    expect(screen.getByText(/Explorar un país no declara tu nacionalidad/i)).toBeTruthy();

    // The demo issues a French pass. Argentina is browsable all the same, and
    // browsing it must not present the reader as eligible there.
    await user.click(screen.getByRole('tab', { name: 'Argentina' }));
    expect(screen.getByText(/Esto no acredita elegibilidad/i)).toBeTruthy();
    expect(screen.queryByText(/Elegibilidad lista para/i)).toBeNull();
    // Every open Argentine consultation offers the way in, and none offers a vote.
    expect(screen.getAllByRole('button', { name: /Añadir elegibilidad/i }).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByRole('button', { name: /^Participar/i })).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Francia' }));
    expect(screen.getByText(/Elegibilidad lista para/i)).toBeTruthy();
  });

  it('offers only the two countries with a complete pilot journey', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Comenzar|Get started/i }));
    await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));
    await user.click(screen.getByRole('button', { name: /Passport de demo|demo Passport/i }));
    await user.click(screen.getByRole('button', { name: /Continuar|Continue/i }));

    expect(screen.getByRole('radio', { name: /Francia|France/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Argentina/i })).toBeTruthy();
    // The 249-country search was a dead end: every country but one led nowhere.
    expect(screen.queryByRole('radio', { name: /Brasil|Brazil/i })).toBeNull();
    expect(screen.getAllByRole('radio').length).toBe(2);
  });

  it('holds one active eligibility pass in Credentials', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    await user.click(screen.getByRole('button', { name: 'Credenciales' }));

    expect(screen.getByRole('heading', { name: /Elegibilidad, lista para usar/i })).toBeTruthy();
    expect(screen.getByText(/No es tu pasaporte físico/i)).toBeTruthy();
    // Exactly one active pass, named by the country it attests.
    expect(screen.getByRole('heading', { level: 2, name: /Francia|France/i })).toBeTruthy();
    expect(screen.getByText(/Simulado para esta demo|Simulated for this demo/i)).toBeTruthy();
  });

  it('shows the empty credential state before anything has been verified', async () => {
    skipOnboarding();
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Credenciales' }));

    expect(screen.getByText(/Todavía no tenés un pase/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Añadir elegibilidad/i })).toBeTruthy();
  });

  it('creates a clearly labelled simulated receipt without a wallet', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    const [voteButton] = screen.getAllByRole('button', { name: /Participar/i });
    if (!voteButton) throw new Error('Expected at least one available consultation action');
    await user.click(voteButton);
    await user.click(screen.getByRole('button', { name: /^Sí/ }));
    await user.click(screen.getByRole('button', { name: /Revisar mi voto/i }));
    expect(screen.queryByRole('button', { name: 'Wallet' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Crear comprobante simulado/i }));
    expect(screen.getByRole('heading', { name: 'Gracias por participar' })).toBeTruthy();
    expect(screen.getByText(/No representa una transacción/i)).toBeTruthy();
  });

  /**
   * Receipts belong to Activity now. Reaching them from a completed vote must
   * land there, not in the account screen.
   */
  it('keeps one receipt per simulated vote, in Activity', async () => {
    render(<App />);
    const user = userEvent.setup();
    // Argentina is the scope with several open consultations, so it is where
    // two distinct receipts can be produced.
    await completeDemoCredential(user, /Argentina/i);
    await user.click(screen.getByRole('tab', { name: 'Argentina' }));

    const castVote = async (index: number, answer: RegExp) => {
      const open = screen.getAllByRole('button', { name: /Participar/i });
      const button = open[index];
      if (!button) throw new Error(`Expected an open consultation at index ${index}`);
      await user.click(button);
      await user.click(screen.getByRole('button', { name: answer }));
      await user.click(screen.getByRole('button', { name: /Revisar mi voto/i }));
      await user.click(screen.getByRole('button', { name: /Crear comprobante simulado/i }));
      await user.click(screen.getByRole('button', { name: /Ver mi comprobante/i }));
      await user.click(screen.getByRole('button', { name: 'Descubrir' }));
      await user.click(screen.getByRole('tab', { name: 'Argentina' }));
    };

    await castVote(0, /^Sí/);
    await castVote(1, /^No/);
    await user.click(screen.getByRole('button', { name: 'Actividad' }));

    // Every simulated receipt used to carry the identifier
    // 'demo-tx-cico-2026-0001'. Receipts are de-duplicated by id, so the
    // second vote silently deleted the first one. The vault is IndexedDB-backed
    // and survives beforeEach, so the assertion is about distinctness rather
    // than an exact count.
    const identifiers = [...document.querySelectorAll('.activity-card code')].map(
      (node) => node.textContent ?? '',
    );
    expect(identifiers.length).toBeGreaterThanOrEqual(2);
    expect(new Set(identifiers).size).toBe(identifiers.length);
  });

  it('verifies a receipt from Activity without leaving the device', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    const [voteButton] = screen.getAllByRole('button', { name: /Participar/i });
    if (!voteButton) throw new Error('Expected at least one available consultation action');
    await user.click(voteButton);
    await user.click(screen.getByRole('button', { name: /^Sí/ }));
    await user.click(screen.getByRole('button', { name: /Revisar mi voto/i }));
    await user.click(screen.getByRole('button', { name: /Crear comprobante simulado/i }));
    await user.click(screen.getByRole('button', { name: /Ver mi comprobante/i }));

    expect(screen.getByRole('heading', { name: /Comprobantes de participación/i })).toBeTruthy();

    // Simulated receipts are per-vote, so the lookup reads the identifier the
    // flow actually produced rather than a constant.
    const [receiptCode] = screen.getAllByText(/^demo-/);
    const receiptId = receiptCode?.textContent ?? '';
    expect(receiptId).toMatch(/^demo-[a-z0-9:-]+-[a-z0-9]+$/i);
    const input = screen.getByLabelText('Identificador del comprobante');
    await user.type(input, receiptId);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByText('Comprobante simulado')).toBeTruthy();
  });

  /**
   * The account screen is where Midnight is named as the account layer, and
   * where locking a session is kept distinct from destroying local data.
   */
  it('presents Passport as the account, with lock and delete kept apart', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    await user.click(screen.getByRole('button', { name: /^Passport$/ }));

    expect(screen.getByText(/Midnight Passport conectado/i)).toBeTruthy();
    expect(screen.getByText(/Dirección Preview/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bloquear y conservar datos/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Eliminar datos locales/i })).toBeTruthy();
  });

  it('keeps the onboarding explanation available from the account screen', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    await user.click(screen.getByRole('button', { name: /^Passport$/ }));
    await user.click(screen.getByRole('button', { name: /Revisar cómo funciona/i }));
    expect(
      screen.getByRole('heading', { name: /Demostrá que podés votar|Prove you can vote/i }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Volver a la app|Back to the app/i })).toBeTruthy();
  });

  it('propagates English through the shell and the document metadata', async () => {
    render(<App />);
    const user = userEvent.setup();
    await completeDemoCredential(user);
    // The language control lives in the account screen now, not the header.
    await user.click(screen.getByRole('button', { name: /^Passport$/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Idioma|Language/ }), 'en');

    expect(screen.getByRole('button', { name: 'Discover' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Credentials' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Activity' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toMatch(/Civic Referendum/i);
  });

  it('reads public results without a credential or a Passport session', async () => {
    skipOnboarding();
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: /Decisiones que podés explorar/i }),
    ).toBeTruthy();
    // Nothing was verified and no session exists, yet consultations render.
    expect(screen.queryByText(/Elegibilidad lista para/i)).toBeNull();
    expect(screen.getAllByRole('tab', { name: /Global|Francia|Argentina/ }).length).toBe(3);
  });
});
