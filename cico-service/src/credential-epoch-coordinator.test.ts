import type { CanonicalReceipt, CredentialRegistryV1Executor } from 'midnight-referendum-api';
import { describe, expect, it, vi } from 'vitest';
import {
  CredentialEpochCoordinator,
  type CredentialEpochSnapshot,
} from './credential-epoch-coordinator.js';

const address = 'ab'.repeat(32);
const registryId = new Uint8Array(32).fill(1);
const issuerId = new Uint8Array(32).fill(2);
const issuerSecret = new Uint8Array(32).fill(3);

const freezeReceipt: CanonicalReceipt = {
  status: 'confirmed',
  action: 'credential',
  network: 'preview',
  transactionId: 'freeze-tx',
  transactionHash: 'freeze-hash',
  contractAddress: address,
  circuit: 'freeze',
  blockHeight: 42,
  blockHash: 'freeze-block',
  blockTimestamp: '2026-08-24T12:00:00.000Z',
};

function snapshot(overrides: Partial<CredentialEpochSnapshot> = {}): CredentialEpochSnapshot {
  return {
    registryContractAddress: address,
    registryId,
    issuerId,
    credentialEpoch: 7n,
    currentRoot: { field: 77n },
    frozenRoot: { field: 0n },
    frozen: false,
    credentialCount: 1n,
    phase: 'enrollment-open',
    ...overrides,
  };
}

function executor(onFreeze: (field: bigint) => void): CredentialRegistryV1Executor {
  return {
    deploy: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    addCredential: vi.fn(),
    freeze: vi.fn(async (root) => {
      onFreeze(root.field);
      return freezeReceipt;
    }),
  };
}

describe('CredentialEpochCoordinator', () => {
  it('freezes only the current canonical root and returns an indexer-reconciled reference', async () => {
    let canonical = snapshot();
    const registryExecutor = executor((field) => {
      canonical = snapshot({
        currentRoot: { field },
        frozenRoot: { field },
        frozen: true,
        phase: 'frozen',
      });
    });
    const coordinator = createCoordinator(registryExecutor, () => canonical);

    const result = await coordinator.closeAndFreeze();

    expect(result.outcome).toBe('frozen');
    expect(registryExecutor.freeze).toHaveBeenCalledWith({ field: 77n });
    expect(result.reference.frozenRoot).toEqual({ field: 77n });
    expect(result.reference.credentialEpoch).toBe(7n);
    expect(result.receipt).toEqual(freezeReceipt);
  });

  it('is idempotent for the same already-frozen canonical epoch', async () => {
    const canonical = snapshot({
      frozen: true,
      phase: 'frozen',
      frozenRoot: { field: 77n },
    });
    const registryExecutor = executor(() => undefined);
    const result = await createCoordinator(registryExecutor, () => canonical).closeAndFreeze();

    expect(result.outcome).toBe('already-frozen');
    expect(result.receipt).toBeUndefined();
    expect(registryExecutor.freeze).not.toHaveBeenCalled();
  });

  it('rejects late issuance after freeze without running the mutation', async () => {
    const operation = vi.fn();
    const canonical = snapshot({
      frozen: true,
      phase: 'frozen',
      frozenRoot: { field: 77n },
    });
    const coordinator = createCoordinator(
      executor(() => undefined),
      () => canonical,
    );

    await expect(coordinator.runEnrollmentMutation(operation)).rejects.toThrow(
      'Credential enrollment is closed',
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it('serializes issuance before freeze so the final credential is included', async () => {
    let canonical = snapshot();
    let releaseMutation: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      releaseMutation = resolve;
    });
    const registryExecutor = executor((field) => {
      canonical = snapshot({
        currentRoot: { field },
        frozenRoot: { field },
        frozen: true,
        phase: 'frozen',
        credentialCount: 2n,
      });
    });
    const coordinator = createCoordinator(registryExecutor, () => canonical);
    const issuance = coordinator.runEnrollmentMutation(async () => {
      await waiting;
      canonical = snapshot({ currentRoot: { field: 88n }, credentialCount: 2n });
    });
    const freeze = coordinator.closeAndFreeze();

    releaseMutation?.();
    await issuance;
    const result = await freeze;

    expect(registryExecutor.freeze).toHaveBeenCalledWith({ field: 88n });
    expect(result.after.credentialCount).toBe(2n);
  });

  it('fails closed when the indexer reports a different frozen root', async () => {
    let canonical = snapshot();
    const registryExecutor = executor(() => {
      canonical = snapshot({
        frozen: true,
        phase: 'frozen',
        frozenRoot: { field: 999n },
      });
    });

    await expect(
      createCoordinator(registryExecutor, () => canonical).closeAndFreeze(),
    ).rejects.toThrow('other than the coordinated current root');
  });
});

function createCoordinator(
  registryExecutor: CredentialRegistryV1Executor,
  read: () => CredentialEpochSnapshot,
): CredentialEpochCoordinator {
  return new CredentialEpochCoordinator({
    executor: registryExecutor,
    reader: { readRegistry: vi.fn(async () => read()) },
    registryContractAddress: address,
    registryId,
    issuerId,
    credentialEpoch: 7n,
    issuerSecret,
    reconciliationAttempts: 1,
    reconciliationDelayMs: 0,
  });
}
