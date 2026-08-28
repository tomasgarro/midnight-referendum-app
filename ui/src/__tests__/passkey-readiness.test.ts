import { describe, expect, it, vi } from 'vitest';
import {
  detectPlatformPasskeyReadiness,
  type PasskeyCapabilitySource,
} from '../integration/passkey-readiness';

describe('platform passkey readiness', () => {
  it('reports an available platform authenticator without creating a credential', async () => {
    const check = vi.fn().mockResolvedValue(true);
    const source: PasskeyCapabilitySource = {
      PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: check },
    };

    await expect(detectPlatformPasskeyReadiness(source)).resolves.toBe('available');
    expect(check).toHaveBeenCalledOnce();
  });

  it('reports an unavailable platform authenticator', async () => {
    const source: PasskeyCapabilitySource = {
      PublicKeyCredential: {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(false),
      },
    };

    await expect(detectPlatformPasskeyReadiness(source)).resolves.toBe('unavailable');
  });

  it('does not treat an unsupported browser as a failure', async () => {
    await expect(detectPlatformPasskeyReadiness({})).resolves.toBe('unknown');
  });

  it('returns an honest unknown state when the browser probe rejects', async () => {
    const source: PasskeyCapabilitySource = {
      PublicKeyCredential: {
        isUserVerifyingPlatformAuthenticatorAvailable: vi
          .fn()
          .mockRejectedValue(new Error('blocked')),
      },
    };

    await expect(detectPlatformPasskeyReadiness(source)).resolves.toBe('unknown');
  });
});
