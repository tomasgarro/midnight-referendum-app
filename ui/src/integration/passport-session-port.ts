import {
  CivicCredentialError,
  type CivicPassportSession,
  type PassportCapability,
  type PassportCapabilityGrant,
  type PassportHolderBindingPort,
  type PassportHolderBindingRequest,
  type PassportHolderBindingResult,
  type PassportNetwork,
  type PassportSessionPort,
  type PassportSessionRequest,
} from 'midnight-referendum-api';

type PassportProfileBridgeSession = {
  readonly requestId: string;
  readonly network?: PassportNetwork;
  readonly displayName?: string;
  readonly passportContract?: { readonly address: string; readonly network: string };
  readonly midnightAddresses?: { readonly unshielded: string };
};

export type PassportProfileBridgeField = 'displayName' | 'passportContract' | 'midnightAddresses';

export interface PassportProfileBridge {
  connect(
    fields?: PassportProfileBridgeField[],
    network?: PassportNetwork,
  ): Promise<PassportProfileBridgeSession>;
}

/**
 * Optional native Passport capability. The current public profile bridge does
 * not implement it, so the session adapter returns an explicit unsupported
 * result instead of treating a Passport profile as holder evidence.
 */
export interface PassportHolderBindingBridge {
  getHolderBinding(request: PassportHolderBindingRequest): Promise<PassportHolderBindingResult>;
}

export interface MidnightPassportSessionAdapterOptions {
  readonly bridge: PassportProfileBridge;
  readonly holderBindingBridge?: PassportHolderBindingBridge;
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
export class MidnightPassportSessionAdapter
  implements PassportSessionPort, PassportHolderBindingPort
{
  readonly adapterName = 'midnight-passport-profile-session';
  readonly supportedCapabilities = SUPPORTED_CAPABILITIES;

  private readonly bridge: PassportProfileBridge;
  private readonly holderBindingBridge?: PassportHolderBindingBridge;
  private readonly profileFields: PassportProfileBridgeField[];
  private readonly now: () => Date;
  private session: CivicPassportSession | null = null;

  constructor(options: MidnightPassportSessionAdapterOptions) {
    this.bridge = options.bridge;
    this.holderBindingBridge = options.holderBindingBridge;
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

    const profileRequested = request.requestedCapabilities.includes('profile');
    if (profileRequested && this.profileFields.length === 0) {
      throw new CivicCredentialError(
        'CAPABILITY_UNAVAILABLE',
        'Midnight Passport no tiene campos de perfil habilitados para esta sesión',
      );
    }
    // An explicit empty field list is the session-only C23 handshake. Do not
    // call the bridge with an omitted argument here: a bridge is allowed to
    // have a convenient display-profile default, but that default must never
    // turn a session request into an address/profile disclosure.
    //
    // The deployed Passport has no session-only mode -- its parser drops a
    // request with no fields and answers nothing -- so this path now raises
    // `invalid_configuration` from the bridge rather than hanging until the
    // 180 s timeout. Keep it that way: silently substituting a field here
    // would be exactly the disclosure this branch exists to prevent.
    const raw = await this.bridge.connect(
      profileRequested ? [...this.profileFields] : [],
      request.network,
    );
    assertBridgeNetwork(raw.network, request.network);
    this.session = {
      sessionId: raw.requestId,
      origin: request.origin,
      network: request.network,
      status: 'connected',
      ...(profileRequested && raw.displayName ? { profile: { displayName: raw.displayName } } : {}),
      ...(profileRequested &&
      this.profileFields.includes('midnightAddresses') &&
      raw.midnightAddresses?.unshielded
        ? { accountAddress: raw.midnightAddresses.unshielded }
        : profileRequested &&
            this.profileFields.includes('passportContract') &&
            raw.passportContract?.address
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
    if (this.session?.status !== 'connected') {
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

    const current = this.session;
    if (!current) {
      throw new CivicCredentialError(
        'PASSPORT_SESSION_REQUIRED',
        'Connect Midnight Passport before requesting a capability',
      );
    }

    // A capability grant is an authorization event, not a local type check.
    // Re-run the Passport bridge so escalation always has a fresh consent
    // handshake. If Passport rejects or returns no result, the previous
    // session remains unchanged and no grant is manufactured.
    const profileRequested = capability === 'profile';
    if (profileRequested && this.profileFields.length === 0) {
      throw new CivicCredentialError(
        'CAPABILITY_UNAVAILABLE',
        'Midnight Passport no tiene campos de perfil habilitados para esta sesión',
      );
    }
    const raw = await this.bridge.connect(
      profileRequested ? [...this.profileFields] : [],
      current.network,
    );
    assertBridgeNetwork(raw.network, current.network);
    this.session = {
      ...current,
      sessionId: raw.requestId,
      ...(profileRequested && raw.displayName ? { profile: { displayName: raw.displayName } } : {}),
      ...(profileRequested &&
      this.profileFields.includes('midnightAddresses') &&
      raw.midnightAddresses?.unshielded
        ? { accountAddress: raw.midnightAddresses.unshielded }
        : profileRequested &&
            this.profileFields.includes('passportContract') &&
            raw.passportContract?.address
          ? { accountAddress: raw.passportContract.address }
          : {}),
      capabilities: current.capabilities.includes(capability)
        ? [...current.capabilities]
        : [...current.capabilities, capability],
    };
    return {
      capability,
      scope: this.session.origin,
      grantedAt: this.now().toISOString(),
    };
  }

  async disconnect(): Promise<void> {
    this.session = null;
  }

  async getHolderBinding(
    request: PassportHolderBindingRequest,
  ): Promise<PassportHolderBindingResult> {
    const current = this.session;
    if (current?.status !== 'connected') {
      throw new CivicCredentialError(
        'PASSPORT_SESSION_REQUIRED',
        'Connect Midnight Passport before requesting a holder binding',
      );
    }
    if (request.session.sessionId !== current.sessionId) {
      throw new CivicCredentialError(
        'CONFLICT',
        'The holder-binding request does not belong to the connected Passport session',
      );
    }
    if (request.network !== current.network) {
      throw new CivicCredentialError(
        'CONFLICT',
        `Passport is connected to ${current.network}, not ${request.network}`,
      );
    }

    if (!this.holderBindingBridge) {
      return {
        status: 'unsupported',
        reason:
          'The current Midnight Passport profile bridge does not expose a verified holder-binding capability.',
      };
    }

    const result = await this.holderBindingBridge.getHolderBinding(request);
    if (result.status === 'unsupported') return { ...result };
    if (
      result.network !== request.network ||
      result.sessionId !== current.sessionId ||
      !(result.holderBinding instanceof Uint8Array) ||
      result.holderBinding.length !== 32
    ) {
      throw new CivicCredentialError(
        'INVALID_CREDENTIAL_CLAIMS',
        'Passport returned an invalid or incorrectly bound holder binding',
      );
    }
    return {
      ...result,
      holderBinding: new Uint8Array(result.holderBinding),
    };
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

function assertBridgeNetwork(actual: PassportNetwork | undefined, expected: PassportNetwork): void {
  if (actual !== undefined && actual !== expected) {
    throw new CivicCredentialError(
      'CONFLICT',
      `Passport responded for ${actual}, but this app requested ${expected}`,
    );
  }
}

/** Returns the optional native capability without widening PassportSessionPort. */
export function passportHolderBindingPort(
  port: PassportSessionPort | undefined,
): PassportHolderBindingPort | undefined {
  if (!port) return undefined;
  const candidate = port as PassportSessionPort & Partial<PassportHolderBindingPort>;
  return typeof candidate.getHolderBinding === 'function'
    ? (candidate as PassportSessionPort & PassportHolderBindingPort)
    : undefined;
}
