import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('App', () => {
  it('renders the demo without a wallet', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Votaciones en curso' })).toBeTruthy();
    expect(screen.getByText('Compromiso privado durante la votación')).toBeTruthy();
  });

  it('keeps learning available before identity verification', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Entendé' }));
    expect(
      screen.getByRole('heading', { name: 'Decidir en comunidad, con información clara.' }),
    ).toBeTruthy();
    expect(screen.getByText('¿Qué estamos construyendo?')).toBeTruthy();
  });

  it('renders the Passport-backed profile space', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Mi perfil' }));
    expect(screen.getByRole('heading', { name: 'Tu espacio ciudadano' })).toBeTruthy();
    expect(screen.getByText('Identificador de perfil')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tu identidad .night' })).toBeTruthy();
  });

  it('opens the Passport-first journey from the voting screen', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Abrir recorrido Passport v2/i }));
    expect(screen.getByRole('heading', { name: 'Conectá Midnight Passport' })).toBeTruthy();
    expect(screen.getByText('DEMO LOCAL')).toBeTruthy();
  });

  it('sends eligibility through the document check rather than waving it through', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Votá ahora' }));
    await user.click(screen.getByRole('button', { name: 'Validar elegibilidad' }));

    // Public demo mode must remain synthetic and must not offer the camera path.
    expect(screen.getByRole('heading', { name: 'Usá el documento de demostración' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continuar al voto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Activar la cámara' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Usar documento de demostración' })).toBeTruthy();
  });

  it('does not create a fake receipt in local mode', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Votá ahora' }));
    await user.click(screen.getByRole('button', { name: 'Validar elegibilidad' }));
    // Nothing reachable without a wallet may mint a receipt.
    expect(screen.queryByText('Último comprobante listo')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirmar compromiso en Preview' })).toBeNull();
  });
});
