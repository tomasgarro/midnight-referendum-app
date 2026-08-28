import { describe, expect, it } from 'vitest';
import { signV2Capability, type V2CapabilityClaims, verifyV2Capability } from './v2-capability.js';

const claims: V2CapabilityClaims = {
  actionId: 'action-1',
  idempotencyKey: 'request-1',
  network: 'preview',
  contractAddress: 'contract-1',
  circuit: 'castVote',
  action: 'vote',
  requestHash: 'a'.repeat(64),
  expiresAt: 2_000,
};
const { expiresAt: _expiresAt, ...expectedClaims } = claims;

describe('v2 action capabilities', () => {
  it('verifies a signed capability and returns a token digest without exposing claims', () => {
    const token = signV2Capability(claims, 'test-secret');
    const verified = verifyV2Capability(token, 'test-secret', expectedClaims, 1_000);

    expect(verified.expiresAt).toBe(2_000);
    expect(verified.digest).toMatch(/^[a-f0-9]{64}$/u);
    expect(token).not.toContain('test-secret');
  });

  it.each([
    ['actionId', 'action-2'],
    ['idempotencyKey', 'request-2'],
    ['network', 'devnet'],
    ['contractAddress', 'contract-2'],
    ['circuit', 'closeVote'],
    ['action', 'credential'],
    ['requestHash', 'b'.repeat(64)],
  ] as const)('rejects a capability whose %s claim is rebound', (key, value) => {
    const token = signV2Capability(claims, 'test-secret');
    const expected = { ...expectedClaims, [key]: value };

    expect(() => verifyV2Capability(token, 'test-secret', expected, 1_000)).toThrow(
      'capability binding mismatch',
    );
  });

  it('rejects expired and tampered tokens', () => {
    const token = signV2Capability(claims, 'test-secret');
    expect(() => verifyV2Capability(token, 'test-secret', expectedClaims, 2_000)).toThrow(
      'expired capability',
    );
    expect(() => verifyV2Capability(`${token}x`, 'test-secret', expectedClaims, 1_000)).toThrow(
      'invalid capability',
    );
  });
});
