import type { PassportNetwork } from 'midnight-referendum-api';

export const PASSPORT_ORIGIN = 'https://midnightpassport.com' as const;
export const PASSPORT_PROFILE_PROTOCOL = 'org.midnight.passport.profile/v1' as const;
export const PASSPORT_PROFILE_FIELDS = [
  'displayName',
  'passportContract',
  'midnightAddresses',
] as const;
export type PassportProfileField = (typeof PASSPORT_PROFILE_FIELDS)[number];

/**
 * Passport arms one consent surface per window load and reuses its window by
 * name, so a later payment popup navigates the window the user already
 * connected with instead of stacking a second one beside it.
 */
const PASSPORT_WINDOW_NAME = 'midnight-passport';
/**
 * First-time passkey onboarding happens inside the Passport window while we
 * wait. The reference client budgets 180 s; anything shorter abandons a user
 * who is still creating their Passport.
 */
const DEFAULT_TIMEOUT_MS = 180_000;
/** A closed popup never answers, and no message says so. */
const POPUP_POLL_MS = 500;

type PassportProfile = {
  displayName?: string;
  passportContract?: { address: string; network: string };
  midnightAddresses?: {
    unshielded: string;
    shielded?: string;
    dust?: string;
  };
};

/** Narrow wire result used only between the official Passport bridge and its adapter. */
export interface PassportBridgeSession {
  readonly requestId: string;
  readonly nonce: string;
  readonly origin: string;
  readonly network: 'preview' | 'devnet';
  readonly displayName?: string;
  readonly passportContract?: { readonly address: string; readonly network: string };
  readonly midnightAddresses?: {
    readonly unshielded: string;
    readonly shielded?: string;
    readonly dust?: string;
  };
}

type BridgeNetwork = Extract<PassportNetwork, 'preview' | 'devnet'>;
type HandshakePair = { requestId: string; nonce: string; network?: BridgeNetwork };

type ProfileReady = {
  protocol: typeof PASSPORT_PROFILE_PROTOCOL;
  type: 'passport.profile.ready';
  requestId: string;
  nonce: string;
  network?: BridgeNetwork;
};

type ProfileResponse = {
  protocol: typeof PASSPORT_PROFILE_PROTOCOL;
  type: 'passport.profile.response';
  requestId: string;
  nonce: string;
  approved: boolean;
  network?: BridgeNetwork;
  profile?: PassportProfile;
  error?: 'denied' | 'profile_unavailable' | 'invalid_request';
};

type ProfileRequest = {
  protocol: typeof PASSPORT_PROFILE_PROTOCOL;
  type: 'passport.profile.request';
  requestId: string;
  nonce: string;
  network: BridgeNetwork;
  fields: PassportProfileField[];
};

type ProfileHello = {
  protocol: typeof PASSPORT_PROFILE_PROTOCOL;
  type: 'passport.profile.hello';
};

export interface PassportBridgeOptions {
  passportOrigin?: string;
  /** Network requested by this bridge instance; defaults to Preview. */
  network?: PassportNetwork;
  timeoutMs?: number;
  openPassport?: (url: string, windowName: string) => Window | null;
  sourceWindow?: Window;
}

export class PassportBridgeError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'unavailable'
      | 'timeout'
      | 'denied'
      | 'closed'
      | 'invalid_response'
      | 'invalid_configuration'
      | 'invalid_relying_party_origin'
      | 'wrong_network',
  ) {
    super(message);
    this.name = 'PassportBridgeError';
  }
}

export function getPassportOriginError(sourceWindow: Window = window): string | null {
  const location = sourceWindow.location;
  const hostname = location?.hostname ?? '';
  const isLocalhost = hostname === 'localhost';
  const isHttps = location?.protocol === 'https:';

  if (isHttps || (isLocalhost && location?.protocol === 'http:')) return null;
  if (hostname === '127.0.0.1' || hostname === '::1') {
    return 'Passport requiere localhost o HTTPS. Abrí http://localhost:4173 en lugar de 127.0.0.1.';
  }
  return 'Passport requiere una conexión HTTPS para crear o usar tu passkey.';
}

export function isPassportEmbedded(sourceWindow: Window, passportOrigin: string): boolean {
  if (sourceWindow.parent === sourceWindow) return false;

  try {
    const ancestorOrigins = sourceWindow.location?.ancestorOrigins;
    if (
      ancestorOrigins &&
      Array.from(ancestorOrigins).some((origin) => origin === passportOrigin)
    ) {
      return true;
    }
  } catch {
    // Cross-origin access can make ancestorOrigins unavailable.
  }

  try {
    return new URL(sourceWindow.document?.referrer ?? '').origin === passportOrigin;
  } catch {
    return false;
  }
}

function boundedString(value: unknown, max = 512): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    })
  );
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isBridgeNetwork(value: unknown): value is BridgeNetwork {
  return value === 'preview' || value === 'devnet';
}

function assertBridgeNetworkValue(value: PassportNetwork): asserts value is BridgeNetwork {
  if (!isBridgeNetwork(value)) {
    throw new PassportBridgeError(
      'Passport profile consent is restricted to Preview or local devnet',
      'wrong_network',
    );
  }
}

function assertResponseNetwork(actual: BridgeNetwork | undefined, expected: BridgeNetwork): void {
  if (actual !== undefined && actual !== expected) {
    throw new PassportBridgeError(
      `Passport responded for ${actual}, not ${expected}.`,
      'wrong_network',
    );
  }
}

function protocolMessage(value: unknown, type: string): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).protocol === PASSPORT_PROFILE_PROTOCOL &&
    (value as Record<string, unknown>).type === type
  );
}

function isField(value: unknown): value is PassportProfileField {
  return (
    typeof value === 'string' && (PASSPORT_PROFILE_FIELDS as readonly string[]).includes(value)
  );
}

function isReady(value: unknown): value is ProfileReady {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return (
    hasOnlyKeys(message, ['protocol', 'type', 'requestId', 'nonce', 'network']) &&
    message.protocol === PASSPORT_PROFILE_PROTOCOL &&
    message.type === 'passport.profile.ready' &&
    boundedString(message.requestId, 256) &&
    boundedString(message.nonce, 256) &&
    (message.network === undefined || isBridgeNetwork(message.network))
  );
}

function parseProfile(value: unknown): PassportProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (!hasOnlyKeys(input, ['displayName', 'passportContract', 'midnightAddresses'])) return null;
  const profile: PassportProfile = {};

  if (input.displayName !== undefined) {
    if (!boundedString(input.displayName, 256)) return null;
    profile.displayName = input.displayName;
  }
  if (input.passportContract !== undefined) {
    if (
      !input.passportContract ||
      typeof input.passportContract !== 'object' ||
      Array.isArray(input.passportContract)
    )
      return null;
    const contract = input.passportContract as Record<string, unknown>;
    if (!hasOnlyKeys(contract, ['address', 'network'])) return null;
    if (!boundedString(contract.address) || !boundedString(contract.network, 256)) return null;
    profile.passportContract = {
      address: contract.address,
      network: contract.network,
    };
  }
  if (input.midnightAddresses !== undefined) {
    if (
      !input.midnightAddresses ||
      typeof input.midnightAddresses !== 'object' ||
      Array.isArray(input.midnightAddresses)
    )
      return null;
    const addresses = input.midnightAddresses as Record<string, unknown>;
    if (!hasOnlyKeys(addresses, ['unshielded', 'shielded', 'dust'])) return null;
    if (!boundedString(addresses.unshielded)) return null;
    const parsed: NonNullable<PassportProfile['midnightAddresses']> = {
      unshielded: addresses.unshielded,
    };
    for (const field of ['shielded', 'dust'] as const) {
      if (addresses[field] !== undefined) {
        if (!boundedString(addresses[field])) return null;
        parsed[field] = addresses[field] as string;
      }
    }
    profile.midnightAddresses = parsed;
  }
  return profile;
}

function parseResponse(value: unknown): ProfileResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  if (
    !hasOnlyKeys(message, [
      'protocol',
      'type',
      'requestId',
      'nonce',
      'approved',
      'network',
      'profile',
      'error',
    ]) ||
    message.protocol !== PASSPORT_PROFILE_PROTOCOL ||
    message.type !== 'passport.profile.response' ||
    !boundedString(message.requestId, 256) ||
    !boundedString(message.nonce, 256) ||
    typeof message.approved !== 'boolean' ||
    (message.network !== undefined && !isBridgeNetwork(message.network))
  ) {
    return null;
  }
  if (message.approved) {
    if (message.error !== undefined) return null;
    const profile = parseProfile(message.profile);
    return profile ? ({ ...message, profile } as ProfileResponse) : null;
  }
  if (!['denied', 'profile_unavailable', 'invalid_request'].includes(String(message.error))) {
    return null;
  }
  if (message.profile !== undefined) return null;
  return { ...message } as ProfileResponse;
}

function randomHex(bytes = 24): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function profileRequest(
  pair: HandshakePair,
  fields: PassportProfileField[],
  network: BridgeNetwork,
): ProfileRequest {
  return {
    protocol: PASSPORT_PROFILE_PROTOCOL,
    type: 'passport.profile.request',
    requestId: pair.requestId,
    nonce: pair.nonce,
    network,
    fields,
  };
}

const HELLO: ProfileHello = {
  protocol: PASSPORT_PROFILE_PROTOCOL,
  type: 'passport.profile.hello',
};

export function passportDenialMessage(error: ProfileResponse['error']): string {
  switch (error) {
    case 'denied':
      return 'No aprobaste el pedido de perfil en Passport.';
    case 'profile_unavailable':
      return 'Passport todavía no tiene un perfil para compartir. Completá el onboarding y probá otra vez.';
    case 'invalid_request':
      return 'Passport ya tiene un pedido abierto para esta app. Resolvelo en Passport antes de reintentar.';
    default:
      return 'Passport no aprobó el pedido de perfil.';
  }
}

/**
 * Embedded Passport mints the requestId/nonce pair itself and broadcasts
 * `ready` unprompted every 800 ms until the frame answers, capped at ~32 s.
 * Any reply stops the broadcast, so the pair has to be captured by a listener
 * that is already running — not by one installed when the user finally presses
 * "connect". This watcher latches the first pair it sees, acknowledges it, and
 * hands that same pair to every later profile request, which is what Passport
 * recognises as bound to the handshake it issued.
 */
class EmbeddedHandshakeWatcher {
  private pair: HandshakePair | null = null;
  private waiting: ((pair: HandshakePair) => void)[] = [];

  constructor(
    private readonly origin: string,
    private readonly sourceWindow: Window,
  ) {
    this.sourceWindow.addEventListener('message', this.onMessage);
  }

  private readonly onMessage = (event: MessageEvent) => {
    if (event.origin !== this.origin) return;
    if (event.source !== this.sourceWindow.parent) return;
    if (!isReady(event.data)) return;
    // `ready` is idempotent and can arrive late, mid-flow. A repeat must never
    // reset a handshake that is already established.
    if (this.pair) return;

    this.pair = {
      requestId: event.data.requestId,
      nonce: event.data.nonce,
      ...(event.data.network ? { network: event.data.network } : {}),
    };
    this.sourceWindow.parent.postMessage(HELLO, this.origin);
    const waiting = this.waiting;
    this.waiting = [];
    for (const resolve of waiting) resolve(this.pair);
  };

  current(): HandshakePair | null {
    return this.pair;
  }

  settled(onAbort: (cancel: () => void) => void): Promise<HandshakePair> {
    if (this.pair) return Promise.resolve(this.pair);
    return new Promise((resolve) => {
      this.waiting.push(resolve);
      onAbort(() => {
        this.waiting = this.waiting.filter((entry) => entry !== resolve);
      });
    });
  }

  dispose() {
    this.sourceWindow.removeEventListener('message', this.onMessage);
  }
}

// A single origin can be used by more than one embedded app window. Keep the
// handshake pair scoped to both origin and source window so one frame cannot
// consume another frame's nonce.
const watchers = new Map<string, Map<Window, EmbeddedHandshakeWatcher>>();

function embeddedWatcher(origin: string, sourceWindow: Window): EmbeddedHandshakeWatcher {
  let byWindow = watchers.get(origin);
  if (!byWindow) {
    byWindow = new Map<Window, EmbeddedHandshakeWatcher>();
    watchers.set(origin, byWindow);
  }
  let watcher = byWindow.get(sourceWindow);
  if (!watcher) {
    watcher = new EmbeddedHandshakeWatcher(origin, sourceWindow);
    byWindow.set(sourceWindow, watcher);
  }
  return watcher;
}

/**
 * Starts listening for Passport's embedded handshake as early as possible.
 * Safe to call when the app is not framed by Passport: it never fires.
 */
export function startPassportHandshakeWatch(
  passportOrigin: string,
  sourceWindow: Window = window,
): void {
  let origin: string;
  try {
    origin = new URL(passportOrigin).origin;
  } catch {
    // An invalid configured origin surfaces on connect(), not here.
    return;
  }
  if (!isPassportEmbedded(sourceWindow, origin)) return;
  embeddedWatcher(origin, sourceWindow);
}

/** Test seam: drops cached embedded watchers between cases. */
export function resetPassportHandshakeWatch(): void {
  for (const byWindow of watchers.values()) {
    for (const watcher of byWindow.values()) watcher.dispose();
  }
  watchers.clear();
}

/**
 * Thin client for Passport's public profile bridge. It intentionally does not
 * read Passport storage or derive the anonymous voter secret from the profile.
 */
export class PassportIdentityBridge {
  private readonly origin: string;
  private readonly configuredNetwork: PassportNetwork | undefined;
  private readonly timeoutMs: number;
  private readonly sourceWindow: Window;
  private readonly openPassport: (url: string, windowName: string) => Window | null;

  constructor(options: PassportBridgeOptions = {}) {
    const fallbackWindow = options.sourceWindow ?? window;
    const configuredOrigin = options.passportOrigin ?? PASSPORT_ORIGIN;
    try {
      this.origin = new URL(configuredOrigin).origin;
    } catch {
      throw new PassportBridgeError('Passport origin is not a valid URL', 'invalid_configuration');
    }
    this.configuredNetwork = options.network;
    if (this.configuredNetwork !== undefined) {
      assertBridgeNetworkValue(this.configuredNetwork);
    }
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.sourceWindow = fallbackWindow;
    this.openPassport =
      options.openPassport ??
      ((url, windowName) => fallbackWindow.open(url, windowName, 'popup,width=620,height=780'));
  }

  get embedded(): boolean {
    return isPassportEmbedded(this.sourceWindow, this.origin);
  }

  async connect(
    fields?: PassportProfileField[],
    network?: PassportNetwork,
  ): Promise<PassportBridgeSession> {
    const relyingPartyError = getPassportOriginError(this.sourceWindow);
    if (relyingPartyError) {
      throw new PassportBridgeError(relyingPartyError, 'invalid_relying_party_origin');
    }
    // Keep the convenience default minimal. An empty list used to be treated as
    // a valid session-only handshake, but the deployed Passport drops such a
    // request in its parser and sends nothing back at all -- so the caller sat
    // through the full 180 s timeout and reported it as Passport being slow.
    // Fail here instead, where the message names the actual mistake.
    const requestedFields =
      fields === undefined
        ? (['displayName'] satisfies PassportProfileField[])
        : [...new Set(fields)].filter(isField);
    if (fields !== undefined && requestedFields.length === 0) {
      throw new PassportBridgeError(
        'Passport profile requires at least one field',
        'invalid_configuration',
      );
    }

    const expectedNetwork = network ?? this.configuredNetwork ?? 'preview';
    assertBridgeNetworkValue(expectedNetwork);
    if (this.configuredNetwork !== undefined && this.configuredNetwork !== expectedNetwork) {
      throw new PassportBridgeError(
        `Passport is configured for ${this.configuredNetwork}, not ${expectedNetwork}`,
        'wrong_network',
      );
    }

    return this.embedded
      ? this.connectEmbedded(requestedFields, expectedNetwork)
      : this.connectStandalone(requestedFields, expectedNetwork);
  }

  private session(
    pair: HandshakePair,
    response: ProfileResponse,
    expectedNetwork: BridgeNetwork,
  ): PassportBridgeSession {
    assertResponseNetwork(response.network, expectedNetwork);
    const contractNetwork = response.profile?.passportContract?.network;
    if (contractNetwork !== undefined && contractNetwork !== expectedNetwork) {
      throw new PassportBridgeError(
        `Passport profile belongs to ${contractNetwork}, not ${expectedNetwork}`,
        'wrong_network',
      );
    }
    return {
      requestId: pair.requestId,
      nonce: pair.nonce,
      origin: this.origin,
      network: expectedNetwork,
      displayName: response.profile?.displayName,
      passportContract: response.profile?.passportContract,
      midnightAddresses: response.profile?.midnightAddresses,
    };
  }

  private connectEmbedded(
    fields: PassportProfileField[],
    expectedNetwork: BridgeNetwork,
  ): Promise<PassportBridgeSession> {
    const parent = this.sourceWindow.parent;
    const watcher = embeddedWatcher(this.origin, this.sourceWindow);

    return new Promise<PassportBridgeSession>((resolve, reject) => {
      let settled = false;
      let pair = watcher.current();
      const aborts: (() => void)[] = [];
      const finish = (error?: Error, session?: PassportBridgeSession) => {
        if (settled) return;
        settled = true;
        this.sourceWindow.removeEventListener('message', onMessage);
        window.clearTimeout(timeout);
        for (const abort of aborts) abort();
        if (error) reject(error);
        else if (session) resolve(session);
        else reject(new PassportBridgeError('Passport session was empty.', 'invalid_response'));
      };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== this.origin || event.source !== parent) return;
        if (protocolMessage(event.data, 'passport.profile.ready')) {
          if (!isReady(event.data)) {
            finish(
              new PassportBridgeError(
                'Passport returned a malformed ready message.',
                'invalid_response',
              ),
            );
            return;
          }
          const ready = event.data;
          if (ready.network !== undefined && ready.network !== expectedNetwork) {
            finish(
              new PassportBridgeError(
                `Passport responded for ${ready.network}, not ${expectedNetwork}.`,
                'wrong_network',
              ),
            );
          }
          return;
        }
        if (
          protocolMessage(event.data, 'passport.profile.response') &&
          !parseResponse(event.data)
        ) {
          finish(
            new PassportBridgeError(
              'Passport returned a malformed profile response.',
              'invalid_response',
            ),
          );
          return;
        }
        const response = parseResponse(event.data);
        if (!response || !pair) return;
        if (response.requestId !== pair.requestId || response.nonce !== pair.nonce) return;
        if (response.network !== undefined && response.network !== expectedNetwork) {
          finish(
            new PassportBridgeError(
              `Passport responded for ${response.network}, not ${expectedNetwork}.`,
              'wrong_network',
            ),
          );
          return;
        }
        if (!response.approved) {
          finish(new PassportBridgeError(passportDenialMessage(response.error), 'denied'));
          return;
        }
        try {
          finish(undefined, this.session(pair, response, expectedNetwork));
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const timeout = window.setTimeout(() => {
        finish(
          new PassportBridgeError(
            'Passport no respondió a tiempo. Volvé a intentarlo desde la app de Passport.',
            'timeout',
          ),
        );
      }, this.timeoutMs);

      this.sourceWindow.addEventListener('message', onMessage);

      void watcher
        .settled((cancel) => aborts.push(cancel))
        .then((established) => {
          if (settled) return;
          if (established.network !== undefined && established.network !== expectedNetwork) {
            finish(
              new PassportBridgeError(
                `Passport responded for ${established.network}, not ${expectedNetwork}.`,
                'wrong_network',
              ),
            );
            return;
          }
          pair = established;
          parent.postMessage(profileRequest(established, fields, expectedNetwork), this.origin);
        });
    });
  }

  private connectStandalone(
    fields: PassportProfileField[],
    expectedNetwork: BridgeNetwork,
  ): Promise<PassportBridgeSession> {
    const pair: HandshakePair = {
      requestId: crypto.randomUUID(),
      nonce: randomHex(),
      network: expectedNetwork,
    };
    const query = new URLSearchParams({
      passportRequestId: pair.requestId,
      passportNonce: pair.nonce,
      passportNetwork: expectedNetwork,
    });
    return new Promise<PassportBridgeSession>((resolve, reject) => {
      let settled = false;
      let popup: Window | null = null;
      let timeout: number | undefined;
      let closedPoll: number | undefined;
      let earlyReady: { source: MessageEvent['source']; data: ProfileReady } | null = null;
      const finish = (error?: Error, session?: PassportBridgeSession) => {
        if (settled) return;
        settled = true;
        this.sourceWindow.removeEventListener('message', onMessage);
        if (timeout !== undefined) window.clearTimeout(timeout);
        if (closedPoll !== undefined) window.clearInterval(closedPoll);
        if (error) reject(error);
        else if (session) resolve(session);
        else reject(new PassportBridgeError('Passport session was empty.', 'invalid_response'));
      };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== this.origin) return;
        // open() can synchronously trigger a ready event in a test seam or a
        // same-process popup. Hold it until open() returns and its Window
        // object can be checked against event.source.
        if (!popup) {
          if (isReady(event.data)) {
            earlyReady = { source: event.source, data: event.data };
          }
          return;
        }
        if (event.source !== popup) return;

        if (protocolMessage(event.data, 'passport.profile.ready')) {
          if (!isReady(event.data)) {
            finish(
              new PassportBridgeError(
                'Passport returned a malformed ready message.',
                'invalid_response',
              ),
            );
            return;
          }
          const ready = event.data;
          if (ready.requestId !== pair.requestId || ready.nonce !== pair.nonce) return;
          if (ready.network !== undefined && ready.network !== expectedNetwork) {
            finish(
              new PassportBridgeError(
                `Passport responded for ${ready.network}, not ${expectedNetwork}.`,
                'wrong_network',
              ),
            );
            return;
          }
          popup.postMessage(profileRequest(pair, fields, expectedNetwork), this.origin);
          return;
        }

        if (
          protocolMessage(event.data, 'passport.profile.response') &&
          !parseResponse(event.data)
        ) {
          finish(
            new PassportBridgeError(
              'Passport returned a malformed profile response.',
              'invalid_response',
            ),
          );
          return;
        }
        const response = parseResponse(event.data);
        if (!response || response.requestId !== pair.requestId || response.nonce !== pair.nonce)
          return;
        if (response.network !== undefined && response.network !== expectedNetwork) {
          finish(
            new PassportBridgeError(
              `Passport responded for ${response.network}, not ${expectedNetwork}.`,
              'wrong_network',
            ),
          );
          return;
        }
        if (!response.approved) {
          finish(new PassportBridgeError(passportDenialMessage(response.error), 'denied'));
          return;
        }
        try {
          finish(undefined, this.session(pair, response, expectedNetwork));
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)));
        }
      };

      // Install the listener before opening Passport. The popup can post its
      // ready message immediately after navigation, before open() returns to
      // the caller's event loop.
      this.sourceWindow.addEventListener('message', onMessage);
      try {
        popup = this.openPassport(`${this.origin}/?${query.toString()}`, PASSPORT_WINDOW_NAME);
      } catch {
        finish(
          new PassportBridgeError(
            'No se pudo abrir Passport. Permití las ventanas emergentes y probá otra vez.',
            'unavailable',
          ),
        );
        return;
      }
      if (!popup) {
        finish(
          new PassportBridgeError(
            'El navegador bloqueó la ventana de Passport. Permití las ventanas emergentes y probá otra vez.',
            'unavailable',
          ),
        );
        return;
      }

      // A user who closes the Passport window is not a timeout; say so at once
      // rather than leaving the flow spinning for the full budget.
      closedPoll = window.setInterval(() => {
        if (popup?.closed) {
          finish(
            new PassportBridgeError(
              'La ventana de Passport se cerró antes de aprobar el perfil.',
              'closed',
            ),
          );
        }
      }, POPUP_POLL_MS);

      timeout = window.setTimeout(() => {
        finish(
          new PassportBridgeError(
            'Passport no respondió a tiempo. Volvé a abrir Passport e intentá de nuevo.',
            'timeout',
          ),
        );
      }, this.timeoutMs);

      const pendingReady = earlyReady as {
        source: MessageEvent['source'];
        data: ProfileReady;
      } | null;
      if (pendingReady?.source === popup) {
        const ready = pendingReady.data;
        if (ready.requestId === pair.requestId && ready.nonce === pair.nonce) {
          if (ready.network !== undefined && ready.network !== expectedNetwork) {
            finish(
              new PassportBridgeError(
                `Passport responded for ${ready.network}, not ${expectedNetwork}.`,
                'wrong_network',
              ),
            );
          } else {
            popup.postMessage(profileRequest(pair, fields, expectedNetwork), this.origin);
          }
        }
        earlyReady = null;
      }
    });
  }
}

export function isPassportProfileResponse(value: unknown): boolean {
  return parseResponse(value) !== null;
}
