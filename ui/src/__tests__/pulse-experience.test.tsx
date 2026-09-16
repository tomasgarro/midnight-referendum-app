import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PulseExperience } from '@/pulse/PulseExperience';

describe('PulseExperience', () => {
  it('starts with a clear local-demo promise and no credential gate', () => {
    render(<PulseExperience onExploreReferenda={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: /Start with what\s*matters to you/iu }),
    ).toBeTruthy();
    expect(screen.getByText(/A reflection, not a vote/iu)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /passport/iu })).toBeNull();
  });

  it('supports cap, optional skips, review and local completion', async () => {
    const user = userEvent.setup();
    render(<PulseExperience onExploreReferenda={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /start reflecting/iu }));
    await user.click(screen.getByRole('button', { name: /^begin/iu }));
    await user.click(screen.getByRole('button', { name: /cost of living/iu }));
    await user.click(screen.getByRole('button', { name: /healthcare/iu }));
    await user.click(screen.getByRole('button', { name: /^continue/iu }));
    await user.click(screen.getByRole('button', { name: /^skip$/iu }));
    await user.click(screen.getByRole('button', { name: /Up to 1% of GDP/ }));
    await user.click(screen.getByRole('button', { name: /^continue/iu }));
    await user.click(screen.getByRole('button', { name: /^Back$/ }));
    expect(
      screen.getByRole('button', { name: /Up to 1% of GDP/ }).getAttribute('aria-pressed'),
    ).toBe('true');
    await user.click(screen.getByRole('button', { name: /^continue/iu }));
    await user.click(screen.getByRole('button', { name: /^skip$/iu }));
    await user.click(screen.getByRole('button', { name: /^skip$/iu }));

    expect(screen.getByRole('heading', { name: 'Take a moment to look back.' })).toBeTruthy();
    expect(screen.getByText('Up to 1% of GDP')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /finish reflection/iu }));
    expect(await screen.findByRole('heading', { name: 'A little more clarity.' })).toBeTruthy();
    expect(screen.getByText(/No answers were sent/iu)).toBeTruthy();
  });
});
