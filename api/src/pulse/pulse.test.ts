import { describe, expect, it } from 'vitest';
import { FixedDemoConsultationResultAdapter } from '../consultation/results.js';
import { LocalDemoPriorityPulseAdapter } from './local-demo-adapter.js';
import { CIVIC_PULSE_VERSION, type PulseDraft } from './types.js';

const validDraft: PulseDraft = {
  questionnaireVersion: CIVIC_PULSE_VERSION,
  actorLane: 'human',
  priorities: ['housing', 'healthcare'],
  tradeoffs: [],
  explanationAreas: ['costs'],
};

describe('local civic pulse boundaries', () => {
  it('completes without retaining or claiming to submit a response', async () => {
    const adapter = new LocalDemoPriorityPulseAdapter();

    await expect(adapter.completeLocalDemo(validDraft)).resolves.toEqual({
      consultationId: 'civic-priorities-demo',
      questionnaireVersion: CIVIC_PULSE_VERSION,
      actorLane: 'human',
      evidenceMode: 'simulated',
      submitted: false,
    });
    expect(Object.keys(adapter)).toEqual([]);
  });

  it('rejects invalid caps and a forged synthetic actor lane', async () => {
    const adapter = new LocalDemoPriorityPulseAdapter();

    await expect(
      adapter.completeLocalDemo({
        ...validDraft,
        priorities: ['housing', 'healthcare', 'education', 'climate'],
      }),
    ).rejects.toThrow(/one and three priorities/iu);
    await expect(
      adapter.completeLocalDemo({
        ...validDraft,
        actorLane: 'synthetic-agent',
      } as unknown as PulseDraft),
    ).rejects.toThrow(/human-lane drafts only/iu);
  });

  it('never returns a human fixture for a synthetic-agent query', async () => {
    const adapter = new FixedDemoConsultationResultAdapter();

    const human = await adapter.getSnapshot({
      consultationId: 'civic-priorities-demo',
      actorLane: 'human',
    });
    const synthetic = await adapter.getSnapshot({
      consultationId: 'civic-priorities-demo',
      actorLane: 'synthetic-agent',
    });

    expect(human.status).toBe('published');
    expect(synthetic.status).toBe('not-published');
    expect(synthetic.actorLane).toBe('synthetic-agent');
  });
});
