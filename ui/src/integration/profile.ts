import type { CivicPassportSession, PassportSession } from 'midnight-referendum-api';

const LOCAL_PROFILE_ID_KEY = 'referendum_civico_local_profile_id';

function shortHash(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x01000193;
  for (const character of value) {
    first ^= character.charCodeAt(0);
    first = Math.imul(first, 0x01000193);
    second ^= character.charCodeAt(0) + 17;
    second = Math.imul(second, 0x811c9dc5);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function localProfileId(): string {
  try {
    const existing = localStorage.getItem(LOCAL_PROFILE_ID_KEY);
    if (existing) return existing;
    const created = `local-${shortHash(crypto.randomUUID())}`;
    localStorage.setItem(LOCAL_PROFILE_ID_KEY, created);
    return created;
  } catch {
    return `local-${shortHash('referendum-civico-session')}`;
  }
}

function sessionIdentity(session: PassportSession | CivicPassportSession): string {
  return 'sessionId' in session
    ? (session.accountAddress ?? session.sessionId)
    : (session.passportContract?.address ?? session.requestId);
}

/**
 * Creates a display identifier only. It is not used for eligibility,
 * commitments, nullifiers, or any Compact private input.
 */
export function deriveProfileId(session: PassportSession | CivicPassportSession | null): string {
  const identity = session ? sessionIdentity(session) : undefined;
  if (!identity) return localProfileId();
  return `passport-${shortHash(`referendum-civico:profile:v1:${identity}`)}`;
}

/**
 * Derive the private storage partition independently from the display id.
 * Web Crypto keeps the Passport account out of browser storage and makes the
 * partition unsuitable for reversing into the original account value.
 */
export async function deriveReceiptProfileKey(
  session: PassportSession | CivicPassportSession | null,
): Promise<string> {
  if (!session) return '';
  const identity = sessionIdentity(session);
  const material = new TextEncoder().encode(`referendum-civico:receipt:v2:${identity}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', material);
    const hex = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    return `passport-${hex}`;
  }
  return `passport-${shortHash(`referendum-civico:receipt:v2:${identity}`)}`;
}
