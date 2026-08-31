import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CountryFlag, CountryPicker, JourneyProgress, LanguageToggle } from '@/components/system';

/**
 * The primitives the journey rebuild introduced, tested at the level the
 * reviewer's complaints were made at: how many things say where you are, how
 * many controls say which country, and whether a fallback duplicates a value.
 */
describe('JourneyProgress', () => {
  it('reports one position, announced with its stage name', () => {
    render(<JourneyProgress current={3} total={6} stageLabel="Passport" label="Paso 3 de 6" />);
    const bar = screen.getByRole('progressbar', { name: 'Paso 3 de 6' });
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe('6');
    expect(bar.getAttribute('aria-valuetext')).toBe('Paso 3 de 6 — Passport');
  });

  it('advances on every screen, including two screens inside one stage', () => {
    const { rerender, container } = render(
      <JourneyProgress current={1} total={6} stageLabel="Bienvenida" label="Paso 1 de 6" />,
    );
    const width = () =>
      (container.querySelector('.sys-journey-progress__fill') as HTMLElement).style.width;
    const first = width();
    // The four-pill stepper it replaces mapped welcome and privacy to the same
    // stop, so the bar looked frozen for a whole screen.
    rerender(<JourneyProgress current={2} total={6} stageLabel="Bienvenida" label="Paso 2 de 6" />);
    expect(width()).not.toBe(first);
  });

  it('never renders past the end or before the start', () => {
    const { rerender, container } = render(
      <JourneyProgress current={99} total={6} stageLabel="Lista" label="Paso 6 de 6" />,
    );
    const fill = () => container.querySelector('.sys-journey-progress__fill') as HTMLElement;
    expect(fill().style.width).toBe('100%');
    rerender(<JourneyProgress current={0} total={6} stageLabel="Lista" label="Paso 1 de 6" />);
    expect(fill().style.width).toBe(`${Math.round((1 / 6) * 100)}%`);
  });
});

describe('LanguageToggle', () => {
  it('keeps a real select behind the pill', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LanguageToggle locale="es" onChange={onChange} label="Idioma" />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en');
    expect(onChange).toHaveBeenCalledWith('en');
  });
});

describe('CountryFlag', () => {
  it('falls back to the country code where the platform draws no flag', () => {
    // jsdom's canvas has no text metrics, so detection fails closed -- which
    // is exactly the branch that must still render something legible.
    render(<CountryFlag alpha2="ar" />);
    expect(screen.getByText('AR')).toBeTruthy();
  });
});

describe('CountryPicker', () => {
  const setup = (value = 'AR', onChange = vi.fn()) => {
    render(
      <CountryPicker
        value={value}
        onChange={onChange}
        locale="es"
        searchLabel="¿Desde qué país participás?"
        searchPlaceholder="Buscá cualquier país"
        listLabel="Países disponibles"
        suggested={['AR', 'BR']}
        suggestedLabel="Elegí uno, o buscá."
        emptyLabel="No encontramos ese país."
      />,
    );
    return onChange;
  };

  it('states the selected country exactly once', () => {
    setup('AR');
    // The control it replaces printed the choice in a text input and again in
    // a tinted confirmation row underneath it.
    expect(screen.getAllByText('Argentina')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /Argentina/ }).getAttribute('checked')).not.toBe(
      'false',
    );
  });

  it('searches the whole catalogue, not just the shortlist', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByRole('radio', { name: /Japón|Japan/ })).toBeNull();
    await user.type(screen.getByRole('searchbox'), 'jap');
    expect(screen.getByRole('radio', { name: /Japón|Japan/ })).toBeTruthy();
  });

  it('reports an empty search instead of an empty list', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole('searchbox'), 'zzzzzz');
    expect(screen.getByText('No encontramos ese país.')).toBeTruthy();
  });

  it('emits the alpha-2 code the credential is built from', async () => {
    const user = userEvent.setup();
    const onChange = setup('AR');
    await user.click(screen.getByRole('radio', { name: /Brasil|Brazil/ }));
    expect(onChange).toHaveBeenCalledWith('BR');
  });
});
