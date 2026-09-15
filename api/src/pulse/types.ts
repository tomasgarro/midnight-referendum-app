export type ActorLane = 'human' | 'synthetic-agent';
export type EvidenceMode = 'simulated' | 'verified';

export const CIVIC_PULSE_VERSION = 'civic-priorities-2026-09-v1' as const;

export const PRIORITY_IDS = [
  'cost-of-living',
  'healthcare',
  'education',
  'housing',
  'climate',
  'public-safety',
] as const;

export type PriorityId = (typeof PRIORITY_IDS)[number];

export type TradeoffId =
  | 'act-sooner'
  | 'build-consensus'
  | 'target-support'
  | 'universal-services'
  | 'prefer-not-to-answer';

export type ExplanationAreaId = 'costs' | 'delivery' | 'evidence' | 'tradeoffs';

export interface PulseDraft {
  readonly questionnaireVersion: typeof CIVIC_PULSE_VERSION;
  readonly actorLane: 'human';
  readonly priorities: readonly PriorityId[];
  readonly tradeoffs: readonly TradeoffId[];
  readonly explanationAreas: readonly ExplanationAreaId[];
}

export interface LocalDemoReceipt {
  readonly consultationId: 'civic-priorities-demo';
  readonly questionnaireVersion: typeof CIVIC_PULSE_VERSION;
  readonly actorLane: 'human';
  readonly evidenceMode: 'simulated';
  readonly submitted: false;
}
