import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CapybaraMascot } from './CapybaraMascot';

describe('CapybaraMascot', () => {
  it('renders the selected semantic mascot with localized alternative text', () => {
    render(<CapybaraMascot variant="waving" alt="Carpincho saludando" priority />);

    const mascot = screen.getByRole('img', { name: 'Carpincho saludando' });
    expect(mascot.getAttribute('fetchpriority')).toBe('high');
    expect(mascot.closest('[data-mascot]')?.getAttribute('data-variant')).toBe('waving');
  });

  it('keeps decorative mascots out of the accessibility tree', () => {
    const { container } = render(<CapybaraMascot variant="achievement" decorative />);

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('[data-mascot]')?.getAttribute('aria-hidden')).toBe('true');
  });
});
