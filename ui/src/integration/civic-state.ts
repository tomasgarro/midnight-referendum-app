/** Shared product state vocabulary for the Passport-first civic experience. */
export type OnboardingStage =
  | 'welcome'
  | 'privacy'
  | 'passport'
  | 'consent-return'
  | 'eligibility'
  | 'demo-country'
  | 'credential-success'
  /** @deprecated Kept for the pure state helpers used by the legacy simulator. */
  | 'evidence';

export type ConsultationArea = 'world' | 'countries';

export type EvidenceStatus =
  | 'idle'
  | 'preparing'
  | 'handoff'
  | 'verifying'
  | 'issued'
  | 'denied'
  | 'expired'
  | 'retryable-error';

export type ActionMode = 'simulated' | 'live';
