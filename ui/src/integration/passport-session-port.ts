import {
  CivicCredentialError,
  type CivicPassportSession,
  type PassportCapability,
  type PassportCapabilityGrant,
  type PassportNetwork,
  type PassportSessionPort,
  type PassportSessionRequest,
} from 'midnight-referendum-api';

type PassportProfileBridgeSession = {
  readonly requestId: string;
  readonly displayName?: string;
  readonly passportContract?: { readonly address: string; readonly network: string };
  readonly midnightAddresses?: { readonly unshielded: string };
};

export type PassportProfileBridgeField = 'displayName' | 'passportContract' | 'midnightAddresses';

export interface PassportProfileBridge {
  connect(fields?: PassportProfileBridgeField[]): Promise<PassportProfileBridgeSession>;
}

export interface MidnightPassportSessionAdapterOptions {
  readonly bridge: PassportProfileBridge;
  /** Minimum profile fields CICO is allowed to request after explicit consent. */
  readonly profileFields?: readonly PassportProfileBridgeField[];
  readonly now?: () => Date;
}

const SUPPORTED_CAPABILITIES = [
  'session',
  'profile',
] as const satisfies readonly PassportCapability[];

/**
 * Maps Passport's real profile/session bridge into the durable Passport port.
 * It intentionally advertises no credential, witness, or transaction capability.
 */
export class MidnightPassportSessionAdapter implements PassportSessionPort {
  readonly adapterName = 'midnight-passport-profile-session';
  readonly supportedCapabilities = SUPPORTED_CAPABILITIES;

  private readonly bridge: PassportProfileBridge;
  private readonly profileFields: PassportProfileBridgeField[];
  private readonly now: () => Date;
  private session: CivicPassportSession | null = null;

  constructor(options: MidnightPassportSessionAdapterOptions) {
    this.bridge = options.bridge;
    this.profileFields = [...(options.profileFields ?? ['displayName'])];
    this.now = options.now ?? (() => new Date());
  }

  async connect(request: PassportSessionRequest): Promise<CivicPassportSession> {
    assertNetwork(request.network);
    const unsupported = request.requestedCapabilities.find(
      (capability) => !this.supportedCapabilities.includes(capability as 'session' | 'profile'),
    );
    if (unsupported) {
      throw new CivicCredentialError(
        'CAPABILITY_UNAVAILABLE',
        `Midnight Passport does not currently expose ${unsupported} through the profile bridge`,
      );
    }

    const raw = request.requestedCapabilities.includes('profile')
      ? await this.bridge.connect([...this.profileFields])
      : await this.bridge.connect();
    this.session = {
      sessionId: raw.requestId,
      origin: request.origin,
      network: request.network,
      status: 'connected',
      ...(raw.displayName ? { profile: { displayName: raw.displayName } } : {}),
      ...(this.profileFields.includes('midnightAddresses') && raw.midnightAddresses?.unshielded
        ? { accountAddress: raw.midnightAddresses.unshielded }
        : this.profileFields.includes('passportContract') && raw.passportContract?.address
          ? { accountAddress: raw.passportContract.address }
          : {}),
      capabilities: [...request.requestedCapabilities],
    };
    return cloneSession(this.session);
  }

  async getSession(): Promise<CivicPassportSession | null> {
    return this.session ? cloneSession(this.session) : null;
  }

  async requestCapability(capability: PassportCapability): Promise<PassportCapabilityGrant> {
    if (!this.session || this.session.status !== 'connected') {
      throw new CivicCredentialError(
        'PASSPORT_SESSION_REQUIRED',
        'Connect Midnight Passport before requesting a capability',
      );
    }
    if (!this.supportedCapabilities.includes(capability as 'session' | 'profile')) {
      throw new CivicCredentialError(
        'CAPABILITY_UNAVAILABLE',
        `Midnight Passport does not currently expose ${capability} through the profile bridge`,
      );
    }
    return {
      capability,
      scope: this.session.origin,
      grantedAt: this.now().toISOString(),
    };
  }

  async disconnect(): Promise<void> {
    this.session = null;
  }
}

function cloneSession(session: CivicPassportSession): CivicPassportSession {
  return {
    ...session,
    ...(session.profile ? { profile: { ...session.profile } } : {}),
    capabilities: [...session.capabilities],
  };
}

function assertNetwork(network: PassportNetwork): void {
  if (network === 'mainnet') {
    throw new CivicCredentialError(
      'CAPABILITY_UNAVAILABLE',
      'CICO Passport is restricted to Preview or local devnet',
    );
  }
}
