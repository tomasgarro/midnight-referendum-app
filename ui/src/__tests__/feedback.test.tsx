import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedbackForm } from '../views/FeedbackForm';

describe('feedback submission', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('sends only explicitly entered text and email, and prevents duplicate clicks', async () => {
    const user = userEvent.setup();
    let complete!: (value: unknown) => void;
    const fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetch);
    localStorage.setItem('private-test-value', 'must-not-be-sent');
    render(<FeedbackForm locale="en" />);
    await user.type(screen.getByLabelText('Your message'), 'The Passport retry could be clearer.');
    await user.type(screen.getByLabelText('Your email (optional)'), 'tester@example.com');
    await user.dblClick(screen.getByRole('button', { name: 'Send feedback' }));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/feedback.php');
    expect(JSON.parse(String(options.body))).toEqual({
      message: 'The Passport retry could be clearer.',
      email: 'tester@example.com',
      website: '',
      locale: 'en',
      requestId: expect.any(String),
    });
    complete({ ok: true, status: 202, json: async () => ({ ok: true }) });
    expect((await screen.findByRole('status')).textContent).toContain('Thank you');
    expect(screen.queryByRole('textbox', { name: 'Your message' })).toBeNull();
    localStorage.removeItem('private-test-value');
  });
  it('preserves the message after failure and reuses its idempotency key on retry', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503, json: async () => ({ ok: false }) });
    vi.stubGlobal('fetch', fetch);
    render(<FeedbackForm locale="en" />);
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'A useful failure report.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect((await screen.findByRole('alert')).textContent).toContain('still here');
    expect((screen.getByLabelText('Your message') as HTMLTextAreaElement).value).toBe(
      'A useful failure report.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await screen.findByRole('alert');
    expect(fetch).toHaveBeenCalledTimes(2);
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[1].body).toBe(calls[1]?.[1].body);
  });
  it('shows rate limits without claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 429 }));
    render(<FeedbackForm locale="en" />);
    fireEvent.change(screen.getByLabelText('Your message'), {
      target: { value: 'A useful feedback message.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    expect((await screen.findByRole('alert')).textContent).toContain('wait a few minutes');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
