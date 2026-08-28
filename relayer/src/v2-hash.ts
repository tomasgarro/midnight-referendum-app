import { createHash } from 'node:crypto';
import type { CivicActionKind } from 'midnight-referendum-api';
import { V2_ACTION_VERSION, type V2ActionRequest } from './v2-types.js';

/** Deterministic JSON for request hashing; object key order is not trusted. */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(',')}}`;
}

export function v2RequestHash(
  request: Pick<V2ActionRequest, 'network' | 'contractAddress' | 'circuit' | 'action' | 'tx'>,
): string {
  return createHash('sha256')
    .update(`midnight-referendum:v2-action:${V2_ACTION_VERSION}:`, 'utf8')
    .update(
      stableJson({
        action: request.action,
        contractAddress: request.contractAddress,
        circuit: request.circuit,
        network: request.network,
        tx: request.tx.toLowerCase(),
        version: V2_ACTION_VERSION,
      }),
      'utf8',
    )
    .digest('hex');
}

export function digestTransaction(tx: string): string {
  return createHash('sha256')
    .update('midnight-referendum:v2-tx:1:', 'utf8')
    .update(tx, 'utf8')
    .digest('hex');
}

export function digestCapability(token: string): string {
  return createHash('sha256')
    .update('midnight-referendum:v2-capability-digest:1:', 'utf8')
    .update(token, 'utf8')
    .digest('hex');
}

export function actionForCircuit(circuit: string): CivicActionKind | undefined {
  if (
    circuit === 'castVote' ||
    circuit === 'closeVote' ||
    circuit === 'revealVote' ||
    circuit === 'finalizeVote'
  )
    return 'vote';
  if (circuit === 'addCredential' || circuit === 'freeze') return 'credential';
  if (circuit === 'recordPublicCohort') return 'cohort';
  return undefined;
}
