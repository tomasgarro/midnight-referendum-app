import type { ActorLane, EvidenceMode, PriorityId } from '../pulse/types.js';

export interface ResultProvenance {
  readonly source: 'fixed-demo-fixture' | 'aggregate-release';
  readonly generatedAt: string;
  readonly policyVersion: string;
  readonly releaseVersion: string;
}

interface ResultIdentity {
  readonly consultationId: string;
  readonly questionnaireVersion: string;
  readonly actorLane: ActorLane;
  readonly evidenceMode: EvidenceMode;
  readonly provenance: ResultProvenance;
}

export type ConsultationResultSnapshot =
  | (ResultIdentity & {
      readonly status: 'published';
      readonly participantCount: number;
      readonly priorities: readonly { readonly priorityId: PriorityId; readonly count: number }[];
    })
  | (ResultIdentity & { readonly status: 'suppressed'; readonly reason: 'minimum-cohort' })
  | (ResultIdentity & { readonly status: 'not-published' });

export interface ConsultationResultPort {
  getSnapshot(query: {
    consultationId: string;
    actorLane: ActorLane;
  }): Promise<ConsultationResultSnapshot>;
}

const HUMAN_DEMO_SNAPSHOT: ConsultationResultSnapshot = {
  consultationId: 'civic-priorities-demo',
  questionnaireVersion: 'civic-priorities-2026-09-v1',
  actorLane: 'human',
  evidenceMode: 'simulated',
  status: 'published',
  participantCount: 240,
  priorities: [
    { priorityId: 'cost-of-living', count: 142 },
    { priorityId: 'healthcare', count: 118 },
    { priorityId: 'housing', count: 91 },
  ],
  provenance: {
    source: 'fixed-demo-fixture',
    generatedAt: '2026-09-13T00:00:00.000Z',
    policyVersion: 'demo-fixture-v1',
    releaseVersion: 'demo-2026-09-13',
  },
};

export class FixedDemoConsultationResultAdapter implements ConsultationResultPort {
  async getSnapshot(query: {
    consultationId: string;
    actorLane: ActorLane;
  }): Promise<ConsultationResultSnapshot> {
    if (
      query.consultationId === HUMAN_DEMO_SNAPSHOT.consultationId &&
      query.actorLane === 'human'
    ) {
      return HUMAN_DEMO_SNAPSHOT;
    }
    return {
      consultationId: query.consultationId,
      questionnaireVersion: 'unknown',
      actorLane: query.actorLane,
      evidenceMode: 'simulated',
      status: 'not-published',
      provenance: {
        source: 'fixed-demo-fixture',
        generatedAt: '2026-09-13T00:00:00.000Z',
        policyVersion: 'demo-fixture-v1',
        releaseVersion: 'demo-2026-09-13',
      },
    };
  }
}
