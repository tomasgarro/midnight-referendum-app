import { describe, expect, it } from 'vitest';
import { UndeployedFixtureCapabilityIssuer } from './undeployed-fixture-capability-issuer.mjs';

const request = {
  actionId: 'action-1',
  idempotencyKey: 'idempotency-1',
  requestHash: 'a'.repeat(64),
  network: 'undeployed',
  contractAddress: '0'.repeat(64),
  circuit: 'castVote',
  action: 'vote',
  credentialAuthorization: 'fixture:undeployed:evidence:v2',
};

describe('UndeployedFixtureCapabilityIssuer', () => {
  it('signs only the exact local castVote capability', async () => {
    const issuer = new UndeployedFixtureCapabilityIssuer({
      secret: 's'.repeat(32),
      contractAddress: request.contractAddress,
    });
    const token = await issuer.issue(request);
    expect(token).toContain('.');
    expect(token).not.toContain(request.credentialAuthorization);
  });

  it.each([
    ['network', { network: 'preview' }],
    ['contract', { contractAddress: '1'.repeat(64) }],
    ['circuit', { circuit: 'closeVote', action: 'vote' }],
    ['action', { circuit: 'castVote', action: 'credential' }],
  ])('rejects a mismatched %s binding', async (_label, patch) => {
    const issuer = new UndeployedFixtureCapabilityIssuer({
      secret: 's'.repeat(32),
      contractAddress: request.contractAddress,
    });
    await expect(issuer.issue({ ...request, ...patch })).rejects.toThrow();
  });

  it('cannot be configured on a non-loopback origin', () => {
    expect(
      () =>
        new UndeployedFixtureCapabilityIssuer({
          secret: 's'.repeat(32),
          contractAddress: request.contractAddress,
          issuerOrigin: 'https://issuer.example',
        }),
    ).toThrow('loopback');
  });
});
