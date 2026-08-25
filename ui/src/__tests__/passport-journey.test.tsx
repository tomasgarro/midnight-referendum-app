import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PassportJourney } from '../components/passport-v2/PassportJourney';

describe('PassportJourney', () => {
  it('completes the deterministic Passport-first demo journey', async () => {
    const user = userEvent.setup();
    render(<PassportJourney mode="demo" onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Conectá Midnight Passport' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Dar consentimiento de demo/i }));
    expect(screen.getByRole('heading', { name: 'Qué hace cada pieza' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Continuar al enrolamiento local/i }));
    expect(screen.getByRole('heading', { name: 'Enrolá una credencial de prueba' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Ejecutar fixture local/i }));
    expect(screen.getByRole('heading', { name: 'Credencial lista para la demo' })).toBeTruthy();
    expect(screen.getByText('SYNTHETIC DEMO CREDENTIAL')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Elegir alcance/i }));
    expect(
      screen.getByRole('heading', { name: '¿En qué espacio querés participar?' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Mi país · Argentina/i }));
    expect(screen.getByRole('heading', { name: 'Elegí tu respuesta' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^Sí/ }));
    await user.click(screen.getByRole('button', { name: /Revisar compromiso/i }));
    expect(screen.getByRole('heading', { name: 'Revisá antes de probar' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Preparar prueba local/i }));
    expect(screen.getByRole('heading', { name: 'Generando prueba local' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Enviar prueba al relayer demo/i }));
    expect(screen.getByRole('heading', { name: 'Relayer autorizado' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Esperar confirmación del indexer/i }));
    expect(screen.getByRole('heading', { name: 'Confirmando en el indexer' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Ver comprobante confirmado/i }));

    expect(
      screen.getByRole('heading', { name: 'Tu comprobante no revela tu elección' }),
    ).toBeTruthy();
    expect(screen.getByText('demo-tx-cico-2026-0001')).toBeTruthy();
    expect(screen.getByText('Tu elección y su relación con tu identidad.')).toBeTruthy();
    expect(screen.queryByText('Tu respuesta')).toBeNull();
  });

  it('does not pretend that a Preview credential is already available', () => {
    render(<PassportJourney mode="preview" onClose={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Passport todavía no emite credenciales aquí' }),
    ).toBeTruthy();
    expect(screen.getByText(/Rarimo permanece como un adaptador temporal/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Dar consentimiento de demo/i })).toBeNull();
  });
});
