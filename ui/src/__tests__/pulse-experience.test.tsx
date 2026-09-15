import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PulseExperience } from '@/pulse/PulseExperience';

describe('PulseExperience', () => {
  it('starts with a clear local-demo promise and no credential gate', () => {
    render(<PulseExperience onExploreReferenda={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'What should government focus on?' })).toBeTruthy();
    expect(screen.getByText(/answers stay in this session and are not submitted/iu)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /passport/iu })).toBeNull();
  });

  it('supports cap, optional skips, review and local completion', async () => {
    const user = userEvent.setup();
    render(<PulseExperience onExploreReferenda={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /try the civic pulse demo/iu }));
    await user.click(screen.getByRole('button', { name: /^begin/iu }));
    await user.click(screen.getByRole('button', { name: /cost of living/iu }));
    await user.click(screen.getByRole('button', { name: /healthcare/iu }));
    await user.click(screen.getByRole('button', { name: /^continue/iu }));
    await user.click(screen.getByRole('button', { name: /^skip$/iu }));
    await user.click(screen.getByRole('button', { name: /^skip$/iu }));

    expect(screen.getByRole('heading', { name: 'Review your answers' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /complete local demo/iu }));
    expect(
      await screen.findByRole('heading', { name: 'Your answers stayed private' }),
    ).toBeTruthy();
    expect(screen.getByText(/fixed synthetic fixture/iu)).toBeTruthy();
  });
});
