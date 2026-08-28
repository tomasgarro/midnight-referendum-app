/**
 * A non-invasive signal for the seedless-wallet onboarding direction.
 *
 * This only asks the browser whether a platform authenticator is available.
 * It never creates a WebAuthn credential, opens a wallet, or proves that a
 * particular vendor (Passport, Gero, or otherwise) is installed.
 */

export type PasskeyReadiness = 'available' | 'unavailable' | 'unknown';

export interface PasskeyCapabilitySource {
  readonly PublicKeyCredential?: {
    readonly isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>;
  };
}

export async function detectPlatformPasskeyReadiness(
  source: PasskeyCapabilitySource = typeof window === 'undefined' ? {} : window,
): Promise<PasskeyReadiness> {
  const check = source.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;
  if (typeof check !== 'function') return 'unknown';

  try {
    return (await check.call(source.PublicKeyCredential)) ? 'available' : 'unavailable';
  } catch {
    return 'unknown';
  }
}
