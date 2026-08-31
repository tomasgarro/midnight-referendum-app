/**
 * The only durable state owned by the handoff UI is an opaque attempt handle
 * and its expiry. Provider links, holder bindings, proofs, MRZ/NFC values and
 * document identifiers intentionally never cross this boundary.
 */
export interface PersistedPassportAttempt {
  readonly enrollmentId: string;
  readonly expiresAt: string;
}

export const PASSPORT_ATTEMPT_STORAGE_KEY = 'cico-passport-enrollment-attempt-v1';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parseAttempt(value: string | null): PersistedPassportAttempt | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.enrollmentId !== 'string' ||
      candidate.enrollmentId.trim().length === 0 ||
      typeof candidate.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(candidate.expiresAt))
    ) {
      return null;
    }
    return {
      enrollmentId: candidate.enrollmentId,
      expiresAt: candidate.expiresAt,
    };
  } catch {
    return null;
  }
}

export function loadPassportAttempt(now = Date.now()): PersistedPassportAttempt | null {
  const currentStorage = storage();
  const attempt = parseAttempt(currentStorage?.getItem(PASSPORT_ATTEMPT_STORAGE_KEY) ?? null);
  if (!attempt) {
    currentStorage?.removeItem(PASSPORT_ATTEMPT_STORAGE_KEY);
    return null;
  }
  if (Date.parse(attempt.expiresAt) <= now) {
    currentStorage?.removeItem(PASSPORT_ATTEMPT_STORAGE_KEY);
    return null;
  }
  return attempt;
}

export function savePassportAttempt(attempt: PersistedPassportAttempt): void {
  const currentStorage = storage();
  if (!currentStorage) return;
  // Construct the record explicitly: this prevents accidentally persisting a
  // provider response when the enrollment shape grows new sensitive fields.
  currentStorage.setItem(
    PASSPORT_ATTEMPT_STORAGE_KEY,
    JSON.stringify({ enrollmentId: attempt.enrollmentId, expiresAt: attempt.expiresAt }),
  );
}

export function clearPassportAttempt(): void {
  storage()?.removeItem(PASSPORT_ATTEMPT_STORAGE_KEY);
}
