import type { LocalDemoReceipt, PulseDraft } from './types.js';

export interface PriorityPulsePort {
  completeLocalDemo(draft: PulseDraft): Promise<LocalDemoReceipt>;
}
