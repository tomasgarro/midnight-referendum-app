import type { OnboardingStage } from './civic-state';

/** Provider-neutral state used by the deterministic local demo. */
export type PassportJourneyStage = OnboardingStage;

export interface DemoPassportSession {
  mode: 'demo';
  displayName: string;
  sessionId: string;
  capabilities: readonly ['profile', 'consent'];
}

export interface CivicCredentialSummary {
  kind: 'synthetic-demo-credential' | 'verified-credential';
  issuer: string;
  country: string;
  ageClass: string;
  assurance: string;
  epoch: string;
  validUntil: string;
  commitment?: string;
}

/** Safe display model shared by synthetic demos and real credential adapters. */
export type DemoCredentialSummary = CivicCredentialSummary;

export interface DemoReceipt {
  kind: 'choice-free-preview-receipt';
  receiptId: string;
  network: 'local-demo';
  referendumId: string;
  confirmedAt: string;
  publicFacts: readonly string[];
  privateFacts: readonly string[];
}

export interface PassportJourneyState {
  stage: PassportJourneyStage;
  session: DemoPassportSession | null;
  credential: DemoCredentialSummary | null;
}

export const DEMO_POLL = {
  referendumId: 'tierras-rurales',
  title: 'Tierras rurales y propiedad extranjera',
  question:
    '¿Debería Argentina mantener un régimen nacional de límites y controles sobre la titularidad y posesión extranjera de tierras rurales?',
} as const;

const DEMO_SESSION: DemoPassportSession = {
  mode: 'demo',
  displayName: 'Ana Pérez',
  sessionId: 'demo-session-7f2c',
  capabilities: ['profile', 'consent'],
};

const DEMO_CREDENTIAL: DemoCredentialSummary = {
  kind: 'synthetic-demo-credential',
  issuer: 'cico-demo-issuer',
  country: 'AR',
  ageClass: '18+',
  assurance: 'fixture',
  epoch: 'preview-2026-08',
  validUntil: '2026-09-30',
  commitment: '0x7a91…c420',
};

export const INITIAL_PASSPORT_JOURNEY_STATE: PassportJourneyState = {
  stage: 'welcome',
  session: null,
  credential: null,
};

export function connectDemoPassport(state: PassportJourneyState): PassportJourneyState {
  return { ...state, stage: 'passport', session: DEMO_SESSION };
}

export function startDemoEnrollment(state: PassportJourneyState): PassportJourneyState {
  if (!state.session) return state;
  return { ...state, stage: 'evidence' };
}

export function finishDemoEnrollment(state: PassportJourneyState): PassportJourneyState {
  if (!state.session) return state;
  return { ...state, stage: 'credential-success', credential: DEMO_CREDENTIAL };
}
