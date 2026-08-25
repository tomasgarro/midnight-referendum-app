/**
 * Provider-neutral local journey model for the Passport-first CICO preview.
 *
 * This module deliberately contains no Passport, Rarimo, relayer, or Compact
 * transport types. It is a deterministic demo adapter that exercises the UX
 * contract while those ports are implemented independently. A real adapter
 * can replace these functions without changing the journey components.
 */

export type JourneyScope = 'global' | 'country';
export type JourneyChoice = 'YES' | 'NO' | 'ABSTAIN';

export type PassportJourneyStage =
  | 'consent'
  | 'provider'
  | 'enrollment'
  | 'credential'
  | 'scope'
  | 'choice'
  | 'review'
  | 'proving'
  | 'relaying'
  | 'indexer'
  | 'receipt';

export interface DemoPassportSession {
  mode: 'demo';
  displayName: string;
  sessionId: string;
  capabilities: readonly ['profile', 'consent'];
}

export interface DemoCredentialSummary {
  kind: 'synthetic-demo-credential';
  issuer: 'cico-demo-issuer';
  country: 'AR';
  ageClass: '18+';
  assurance: 'fixture';
  epoch: 'preview-2026-08';
  validUntil: string;
  commitment: string;
}

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
  scope: JourneyScope | null;
  country: 'AR';
  choice: JourneyChoice | null;
  receipt: DemoReceipt | null;
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
  stage: 'consent',
  session: null,
  credential: null,
  scope: null,
  country: 'AR',
  choice: null,
  receipt: null,
};

export function connectDemoPassport(state: PassportJourneyState): PassportJourneyState {
  return { ...state, stage: 'provider', session: DEMO_SESSION };
}

export function startDemoEnrollment(state: PassportJourneyState): PassportJourneyState {
  if (!state.session) return state;
  return { ...state, stage: 'enrollment' };
}

export function finishDemoEnrollment(state: PassportJourneyState): PassportJourneyState {
  if (!state.session) return state;
  return { ...state, stage: 'credential', credential: DEMO_CREDENTIAL };
}

export function openDemoScope(state: PassportJourneyState): PassportJourneyState {
  if (!state.credential) return state;
  return { ...state, stage: 'scope' };
}

export function selectDemoScope(
  state: PassportJourneyState,
  scope: JourneyScope,
): PassportJourneyState {
  if (!state.credential) return state;
  return { ...state, stage: 'choice', scope };
}

export function selectDemoChoice(
  state: PassportJourneyState,
  choice: JourneyChoice,
): PassportJourneyState {
  if (!state.scope) return state;
  return { ...state, stage: 'review', choice };
}

export function startDemoSubmission(state: PassportJourneyState): PassportJourneyState {
  if (!state.scope || !state.choice || !state.credential) return state;
  return { ...state, stage: 'proving' };
}

export function advanceDemoSubmission(state: PassportJourneyState): PassportJourneyState {
  if (state.stage === 'proving') return { ...state, stage: 'relaying' };
  if (state.stage === 'relaying') return { ...state, stage: 'indexer' };
  if (state.stage === 'indexer') {
    return {
      ...state,
      stage: 'receipt',
      receipt: {
        kind: 'choice-free-preview-receipt',
        receiptId: 'demo-tx-cico-2026-0001',
        network: 'local-demo',
        referendumId: DEMO_POLL.referendumId,
        confirmedAt: '2026-08-24T12:00:00.000Z',
        publicFacts: [
          'Se registró una participación válida.',
          'Se usó una marca única para esta consulta.',
          'El recibo está confirmado por el flujo local de demostración.',
        ],
        privateFacts: [
          'Tu identidad Passport.',
          'Tu credencial y su apertura.',
          'Tu elección y su relación con tu identidad.',
        ],
      },
    };
  }
  return state;
}
