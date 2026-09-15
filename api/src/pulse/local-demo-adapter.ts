import type { PriorityPulsePort } from './ports.js';
import {
  CIVIC_PULSE_VERSION,
  type LocalDemoReceipt,
  PRIORITY_IDS,
  type PulseDraft,
} from './types.js';

const VALID_PRIORITIES = new Set<string>(PRIORITY_IDS);

/**
 * A deliberately non-persistent adapter. It validates the local flow and
 * returns a completion marker without sending, storing, hashing, or logging
 * political answers.
 */
export class LocalDemoPriorityPulseAdapter implements PriorityPulsePort {
  async completeLocalDemo(draft: PulseDraft): Promise<LocalDemoReceipt> {
    if (draft.actorLane !== 'human')
      throw new TypeError('The civic pulse accepts human-lane drafts only');
    if (draft.questionnaireVersion !== CIVIC_PULSE_VERSION) {
      throw new TypeError('The civic pulse questionnaire version is not supported');
    }
    if (draft.priorities.length === 0 || draft.priorities.length > 3) {
      throw new TypeError('Choose between one and three priorities');
    }
    if (new Set(draft.priorities).size !== draft.priorities.length) {
      throw new TypeError('A priority may be selected only once');
    }
    if (!draft.priorities.every((priority) => VALID_PRIORITIES.has(priority))) {
      throw new TypeError('The civic pulse contains an unknown priority');
    }

    return {
      consultationId: 'civic-priorities-demo',
      questionnaireVersion: CIVIC_PULSE_VERSION,
      actorLane: 'human',
      evidenceMode: 'simulated',
      submitted: false,
    };
  }
}
