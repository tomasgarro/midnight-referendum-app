import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogueChat } from '@/views/CatalogueChat';
import { answerCatalogue } from '@/views/catalogue-guide';
import { POLLS } from '@/views/poll-model';

afterEach(() => vi.unstubAllGlobals());
describe('source-backed catalogue guide', () => {
  it('recognises the Bitcoin initiative and keeps sources and uncertainty grounded', () => {
    expect(answerCatalogue('Summarize the Swiss Bitcoin initiative', POLLS, 'en').selectedId).toBe(
      'switzerland-bitcoin',
    );
    expect(answerCatalogue('Sources: bitcoin', POLLS, 'en').text).toContain('Swiss National Bank');
    expect(answerCatalogue('What is uncertain? bitcoin', POLLS, 'en').text).toContain(
      'procedural status',
    );
    expect(answerCatalogue('Context: bitcoin', POLLS, 'en').text).toContain('does not assert');
  });
  it('filters topics without broadening country eligibility', () => {
    const result = answerCatalogue(
      'Show open consultations about climate',
      POLLS,
      'en',
      'CH',
      undefined,
      new Date('2026-09-15'),
    );
    expect(result.pollIds).toContain('global-repair');
    expect(result.pollIds).toContain('switzerland-nature');
    expect(result.pollIds).not.toContain('spain-water-data');
    expect(result.pollIds).not.toContain('switzerland-bitcoin');
  });
  it('reveals immediately for reduced motion and exposes source links', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<CatalogueChat polls={POLLS} locale="en" onOpenPolicy={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Sources: bitcoin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(
      screen.getByRole('link', { name: /Swiss National Bank/ }).getAttribute('href'),
    ).toContain('snb.ch');
  });
  it('clearing a pending response prevents it returning later', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const change = vi.fn();
    render(
      <CatalogueChat polls={POLLS} locale="en" onOpenPolicy={vi.fn()} onMessagesChange={change} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show global consultations' }));
    expect(screen.getByRole('status').textContent).toContain('Finding catalogue context');
    fireEvent.click(screen.getByRole('button', { name: 'Clear chat' }));
    await new Promise((resolve) => setTimeout(resolve, 650));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenLastCalledWith([]);
  });
});
