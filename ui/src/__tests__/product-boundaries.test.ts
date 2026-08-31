import { describe, expect, it } from 'vitest';
import { canUseCredentialForScope, provingCapability } from '@/integration/product-boundaries';

describe('product boundaries', () => {
  it('never treats browsing a country as eligibility', () => {
    expect(canUseCredentialForScope({ kind: 'country', code: 'FR' }, null)).toBe(false);
    expect(
      canUseCredentialForScope(
        { kind: 'country', code: 'FR' },
        { id: 'ar-pass', issuer: 'demo', country: 'AR', ageClass: '18+', status: 'active' },
      ),
    ).toBe(false);
  });

  it('excludes generic remote proving from citizen capability states', () => {
    expect(
      provingCapability({
        simulated: false,
        connectedApiAvailable: true,
        walletProvingProviderAvailable: false,
      }),
    ).toBe('unavailable');
    expect(
      provingCapability({
        simulated: false,
        connectedApiAvailable: true,
        walletProvingProviderAvailable: true,
      }),
    ).toBe('wallet-delegated');
  });
});
