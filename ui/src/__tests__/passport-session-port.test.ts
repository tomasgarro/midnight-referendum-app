import { describe, expect, it } from 'vitest';
import {
  MidnightPassportSessionAdapter,
  type PassportProfileBridge,
} from '../integration/passport-session-port.js';

class FakeProfileBridge implements PassportProfileBridge {
  requestedFields: readonly string[] = [];
  lastFieldsArgument: readonly string[] | undefined;

  async connect(fields?: readonly string[]) {
    this.lastFieldsArgument = fields;
    this.requestedFields = fields ?? [];
    return {
      requestId: 'passport-request-id',
      displayName: 'Alice',
      passportContract: { address: 'passport-display-address', network: 'preview' },
      midnightAddresses: { unshielded: 'midnight-display-address' },
    };
  }
}

describe('MidnightPassportSessionAdapter', () => {
  it('maps the real profile bridge without claiming credential capabilities', async () => {
    const bridge = new FakeProfileBridge();
    const adapter = new MidnightPassportSessionAdapter({ bridge });
    const session = await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session', 'profile'],
    });

    expect(adapter.supportedCapabilities).toEqual(['session', 'profile']);
    expect(bridge.requestedFields).toEqual([
      'displayName',
      'passportContract',
      'midnightAddresses',
    ]);
    expect(session).toMatchObject({
      sessionId: 'passport-request-id',
      origin: 'http://localhost:4173',
      network: 'preview',
      status: 'connected',
      profile: { displayName: 'Alice' },
      accountAddress: 'midnight-display-address',
      capabilities: ['session', 'profile'],
    });
  });

  it('fails closed for unsupported Passport and mainnet capabilities', async () => {
    const adapter = new MidnightPassportSessionAdapter({ bridge: new FakeProfileBridge() });
    await expect(
      adapter.connect({
        origin: 'http://localhost:4173',
        network: 'preview',
        requestedCapabilities: ['session', 'credential-enrollment'],
      }),
    ).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
    await expect(
      adapter.connect({
        origin: 'https://cico.example',
        network: 'mainnet',
        requestedCapabilities: ['session'],
      }),
    ).rejects.toMatchObject({ code: 'CAPABILITY_UNAVAILABLE' });
  });

  it('grants only supported scoped capabilities and clears the session', async () => {
    const bridge = new FakeProfileBridge();
    const adapter = new MidnightPassportSessionAdapter({
      bridge,
      now: () => new Date('2026-08-24T12:00:00.000Z'),
    });
    await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session'],
    });
    expect(bridge.lastFieldsArgument).toBeUndefined();
    await expect(adapter.requestCapability('profile')).resolves.toEqual({
      capability: 'profile',
      scope: 'http://localhost:4173',
      grantedAt: '2026-08-24T12:00:00.000Z',
    });
    await expect(adapter.requestCapability('private-witness')).rejects.toMatchObject({
      code: 'CAPABILITY_UNAVAILABLE',
    });
    await adapter.disconnect();
    await expect(adapter.getSession()).resolves.toBeNull();
  });
});
