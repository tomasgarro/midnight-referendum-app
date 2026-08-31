import type { CivicPassportSession } from 'midnight-referendum-api';

/** The citizen account and an optional developer-only wallet are deliberately separate. */
export interface IdentitySession {
  readonly passportAccount: CivicPassportSession | null;
  readonly walletConnection?: {
    readonly status: 'connected' | 'disconnected';
    readonly address?: string;
  };
}

export type DiscoveryScope =
  | { readonly kind: 'world' }
  | { readonly kind: 'country'; readonly code: 'FR' | 'AR' };

export interface CredentialSummaryItem {
  readonly id: string;
  readonly issuer: string;
  readonly country: string;
  readonly ageClass: string;
  readonly status: 'active' | 'expired' | 'replaced' | 'simulated';
  readonly validUntil?: string;
}

export interface CredentialCollection {
  readonly credentials: readonly CredentialSummaryItem[];
  readonly activeCredentialId: string | null;
}

export type PhysicalDocumentVerification =
  | { readonly status: 'not-started' }
  | { readonly status: 'capturing' | 'reading-nfc' | 'reviewing' }
  | { readonly status: 'interrupted' | 'rejected'; readonly reason: string }
  | { readonly status: 'complete'; readonly country: string };

export interface EligibilityCredential {
  readonly id: string;
  readonly country: string;
  readonly issuer: string;
  readonly validUntil?: string;
}

export type ProvingCapability = 'simulated' | 'wallet-delegated' | 'unavailable';
export type CitizenIdentityProvider = 'midnight-passport';

export const CITIZEN_IDENTITY_PROVIDER: CitizenIdentityProvider = 'midnight-passport';

export function provingCapability(input: {
  readonly simulated: boolean;
  readonly connectedApiAvailable: boolean;
  readonly walletProvingProviderAvailable: boolean;
}): ProvingCapability {
  if (input.simulated) return 'simulated';
  return input.connectedApiAvailable && input.walletProvingProviderAvailable
    ? 'wallet-delegated'
    : 'unavailable';
}

export function canUseCredentialForScope(
  scope: DiscoveryScope,
  credential: CredentialSummaryItem | null,
): boolean {
  if (scope.kind === 'world') return Boolean(credential);
  return credential?.country === scope.code && credential.status === 'active';
}
