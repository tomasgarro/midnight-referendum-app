import type { PassportHolderBindingResult } from 'midnight-referendum-api';
import { describe, expect, it, vi } from 'vitest';
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
    expect(bridge.requestedFields).toEqual(['displayName']);
    expect(session).toMatchObject({
      sessionId: 'passport-request-id',
      origin: 'http://localhost:4173',
      network: 'preview',
      status: 'connected',
      profile: { displayName: 'Alice' },
      capabilities: ['session', 'profile'],
    });
    expect(session.accountAddress).toBeUndefined();
  });

  it('requests an address only when the caller explicitly opts into that profile field', async () => {
    const bridge = new FakeProfileBridge();
    const adapter = new MidnightPassportSessionAdapter({
      bridge,
      profileFields: ['displayName', 'passportContract'],
    });
    const session = await adapter.connect({
      origin: 'https://cico.example',
      network: 'preview',
      requestedCapabilities: ['session', 'profile'],
    });

    expect(bridge.requestedFields).toEqual(['displayName', 'passportContract']);
    expect(session.accountAddress).toBe('passport-display-address');
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
    expect(bridge.lastFieldsArgument).toEqual([]);
    expect((await adapter.getSession())?.profile).toBeUndefined();
    expect((await adapter.getSession())?.accountAddress).toBeUndefined();
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

  it('requires a fresh Passport consent handshake for capability escalation', async () => {
    const bridge = new FakeProfileBridge();
    const adapter = new MidnightPassportSessionAdapter({ bridge });
    await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session'],
    });

    expect(bridge.lastFieldsArgument).toEqual([]);
    const grant = await adapter.requestCapability('profile');
    expect(grant.capability).toBe('profile');
    expect(bridge.lastFieldsArgument).toEqual(['displayName']);
    expect((await adapter.getSession())?.capabilities).toEqual(['session', 'profile']);
  });

  it('does not manufacture a grant when Passport rejects escalation', async () => {
    const bridge = new FakeProfileBridge();
    const connect = vi
      .spyOn(bridge, 'connect')
      .mockResolvedValueOnce({
        requestId: 'initial-request',
        displayName: 'Initial',
        passportContract: { address: 'initial-contract', network: 'preview' },
        midnightAddresses: { unshielded: 'initial-address' },
      })
      .mockRejectedValueOnce(new Error('consent denied'));
    const adapter = new MidnightPassportSessionAdapter({ bridge });
    await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session'],
    });
    await expect(adapter.requestCapability('profile')).rejects.toThrow('consent denied');
    expect((await adapter.getSession())?.capabilities).toEqual(['session']);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('fails closed when profile escalation has no requested fields', async () => {
    const bridge = new FakeProfileBridge();
    const adapter = new MidnightPassportSessionAdapter({ bridge, profileFields: [] });
    await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session'],
    });
    await expect(adapter.requestCapability('profile')).rejects.toMatchObject({
      code: 'CAPABILITY_UNAVAILABLE',
    });
    expect(bridge.lastFieldsArgument).toEqual([]);
  });

  it('returns an explicit unsupported result when Passport has no native binding seam', async () => {
    const adapter = new MidnightPassportSessionAdapter({ bridge: new FakeProfileBridge() });
    const session = await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session'],
    });

    await expect(adapter.getHolderBinding({ session, network: 'preview' })).resolves.toEqual({
      status: 'unsupported',
      reason: expect.stringContaining('does not expose'),
    });
  });

  it('validates and defensively copies a verified holder binding', async () => {
    const binding = new Uint8Array(32).fill(7);
    const holderBindingBridge = {
      getHolderBinding: vi.fn(
        async (): Promise<PassportHolderBindingResult> => ({
          status: 'verified',
          holderBinding: binding,
          network: 'preview',
          sessionId: 'passport-request-id',
        }),
      ),
    };
    const adapter = new MidnightPassportSessionAdapter({
      bridge: new FakeProfileBridge(),
      holderBindingBridge,
    });
    const session = await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session'],
    });

    const result = await adapter.getHolderBinding({ session, network: 'preview' });
    expect(result).toMatchObject({
      status: 'verified',
      network: 'preview',
      sessionId: session.sessionId,
    });
    if (result.status !== 'verified') throw new Error('Expected a verified binding');
    expect(result.holderBinding).toEqual(binding);
    result.holderBinding[0] = 99;
    expect(binding[0]).toBe(7);
    expect(holderBindingBridge.getHolderBinding).toHaveBeenCalledWith({
      session,
      network: 'preview',
    });
  });

  it('rejects bindings for another session, network, or invalid byte length', async () => {
    const adapter = new MidnightPassportSessionAdapter({
      bridge: new FakeProfileBridge(),
      holderBindingBridge: {
        getHolderBinding: async (): Promise<PassportHolderBindingResult> => ({
          status: 'verified',
          holderBinding: new Uint8Array(31),
          network: 'preview',
          sessionId: 'passport-request-id',
        }),
      },
    });
    const session = await adapter.connect({
      origin: 'http://localhost:4173',
      network: 'preview',
      requestedCapabilities: ['session'],
    });

    await expect(
      adapter.getHolderBinding({ session: { ...session, sessionId: 'other' }, network: 'preview' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(adapter.getHolderBinding({ session, network: 'devnet' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(adapter.getHolderBinding({ session, network: 'preview' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIAL_CLAIMS',
    });
  });
});
