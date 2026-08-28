import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MidnightProvidersProvider, useMidnightProviders } from '../providers/midnight-providers';
import { WalletProvider } from '../providers/wallet-context';

vi.mock('midnight-referendum-api', () => ({
  createProviders: vi.fn().mockRejectedValue(new Error('Not connected')),
}));

function TestConsumer() {
  const { isReady, publicReadReady, publicReadError, error } = useMidnightProviders();
  return (
    <div>
      <span data-testid="ready">{isReady ? 'yes' : 'no'}</span>
      <span data-testid="public-ready">{publicReadReady ? 'yes' : 'no'}</span>
      <span data-testid="public-error">{publicReadError ?? 'none'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
    </div>
  );
}

describe('MidnightProvidersProvider', () => {
  it('starts not ready when wallet is disconnected', () => {
    render(
      <WalletProvider>
        <MidnightProvidersProvider>
          <TestConsumer />
        </MidnightProvidersProvider>
      </WalletProvider>,
    );

    expect(screen.getByTestId('ready').textContent).toBe('no');
    expect(screen.getByTestId('public-ready').textContent).toBe('no');
    expect(screen.getByTestId('public-error').textContent).toBe('none');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });
});
