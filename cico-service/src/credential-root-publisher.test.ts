import type {
  CanonicalReceipt,
  CredentialRegistryV1Executor,
  CredentialRegistryV1State,
  ReferendumV2Executor,
  ReferendumV2State,
} from 'midnight-referendum-api';
import { describe, expect, it, vi } from 'vitest';
import {
  CredentialRootPublisher,
  type CredentialRootPublisherReader,
  type CredentialRootPublisherReferendumTarget,
} from './credential-root-publisher.js';

const registryAddress = 'aa'.repeat(32);
const referendumAddressA = 'bb'.repeat(32);
const referendumAddressB = 'cc'.repeat(32);

function attestReceipt(transactionId = 'attest-tx'): CanonicalReceipt {
  return {
    status: 'confirmed',
    action: 'credential',
    network: 'preview',
    transactionId,
    transactionHash: `${transactionId}-hash`,
    contractAddress: registryAddress,
    circuit: 'attestCurrentRoot',
    blockHeight: 1,
    blockHash: 'attest-block',
    blockTimestamp: '2026-08-24T12:00:00.000Z',
  };
}

function publishReceipt(contractAddress: string, transactionId: string): CanonicalReceipt {
  return {
    status: 'confirmed',
    action: 'vote',
    network: 'preview',
    transactionId,
    transactionHash: `${transactionId}-hash`,
    contractAddress,
    circuit: 'publishCredentialRoot',
    blockHeight: 2,
    blockHash: 'publish-block',
    blockTimestamp: '2026-08-24T12:00:00.000Z',
  };
}

function registryState(
  overrides: Partial<CredentialRegistryV1State> = {},
): CredentialRegistryV1State {
  return {
    registryId: new Uint8Array(32).fill(1),
    issuerId: new Uint8Array(32).fill(2),
    credentialEpoch: 7n,
    currentRoot: { field: 100n },
    frozenRoot: { field: 0n },
    frozen: false,
    credentialCount: 0n,
    ...overrides,
  };
}

function referendumState(overrides: Partial<ReferendumV2State> = {}): ReferendumV2State {
  return {
    registryId: new Uint8Array(32).fill(1),
    issuerId: new Uint8Array(32).fill(2),
    credentialEpoch: 7n,
    initialCredentialRoot: { field: 0n },
    acceptedCredentialRoots: [],
    revokedCredentialRoots: [],
    enrollmentClosed: false,
    registryContractBinding: new Uint8Array(32),
    registryContract: new Uint8Array(32),
    eventId: new Uint8Array(32),
    organizerKey: new Uint8Array(32),
    rootPublisherKey: new Uint8Array(32),
    opensAtUnix: 0n,
    enrollmentClosesAtUnix: 999_999_999_999n,
    closesAtUnix: 999_999_999_999n,
    revealClosesAtUnix: 999_999_999_999n,
    phase: 'COMMIT',
    closed: false,
    issuedVotes: 0n,
    countryPolicy: new Uint8Array(32),
    countryPolicyEnabled: false,
    minimumAssurance: 0n,
    requireAdult: false,
    validityReference: 0n,
    tally: new Map(),
    ...overrides,
  };
}

function makeRegistryExecutor(options?: {
  onAttest?: (field: bigint) => void;
  attestFails?: boolean;
}): CredentialRegistryV1Executor & { attestRegistryRoot: ReturnType<typeof vi.fn> } {
  return {
    deploy: vi.fn(),
    join: vi.fn(async () => undefined),
    addCredential: vi.fn(),
    freeze: vi.fn(),
    attestRegistryRoot: vi.fn(async (root: { field: bigint }) => {
      if (options?.attestFails) throw new Error('registry attestation rejected');
      options?.onAttest?.(root.field);
      return attestReceipt();
    }),
  };
}

function makeReferendumExecutor(
  contractAddress: string,
): ReferendumV2Executor & { publishCredentialRoot: ReturnType<typeof vi.fn> } {
  let counter = 0;
  return {
    deploy: vi.fn(),
    join: vi.fn(async () => undefined),
    castVote: vi.fn(),
    publishCredentialRoot: vi.fn(async () => {
      counter += 1;
      return publishReceipt(contractAddress, `${contractAddress}-publish-${counter}`);
    }),
    revokeCredentialRoot: vi.fn(),
    closeEnrollment: vi.fn(),
    closeVote: vi.fn(),
    revealVote: vi.fn(),
    finalizeVote: vi.fn(),
  };
}

function makeReader(
  registry: () => CredentialRegistryV1State,
  referenda: Record<string, () => ReferendumV2State> = {},
): CredentialRootPublisherReader {
  return {
    readRegistry: vi.fn(async () => registry()),
    readReferendum: vi.fn(async (address: string) => {
      const factory = referenda[address];
      if (!factory) throw new Error(`no referendum state configured for ${address}`);
      return factory();
    }),
  };
}

function target(
  contractAddress: string,
  executor: ReferendumV2Executor,
): CredentialRootPublisherReferendumTarget {
  return {
    contractAddress,
    executor,
    rootPublisherSecret: new Uint8Array(32).fill(4),
  };
}

describe('CredentialRootPublisher', () => {
  it('publishes nothing when the registry root is unchanged', async () => {
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 100n }, credentialCount: 20n }),
    );
    const registryExecutor = makeRegistryExecutor();
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
    });

    const first = await publisher.publishOnce();
    expect(first.published).toBe(true);

    const second = await publisher.publishOnce();
    expect(second).toEqual({ published: false, reason: 'unchanged' });
    expect(registryExecutor.attestRegistryRoot).toHaveBeenCalledTimes(1);
    expect(referendumExecutor.publishCredentialRoot).toHaveBeenCalledTimes(1);
  });

  it('publishes once the batch reaches minBatchSize', async () => {
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 200n }, credentialCount: 16n }),
    );
    const registryExecutor = makeRegistryExecutor();
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
      minBatchSize: 16,
    });

    const result = await publisher.publishOnce();
    expect(result).toMatchObject({ published: true, batchSize: 16, belowMinimum: false });
  });

  it('does not publish an under-sized batch before maxWaitMs elapses', async () => {
    let now = 0;
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 300n }, credentialCount: 3n }),
    );
    const registryExecutor = makeRegistryExecutor();
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
      minBatchSize: 16,
      maxWaitMs: 900_000,
      now: () => now,
    });

    const first = await publisher.publishOnce();
    expect(first).toEqual({ published: false, reason: 'below-minimum-batch', batchSize: 3 });

    now += 100_000;
    const second = await publisher.publishOnce();
    expect(second).toEqual({ published: false, reason: 'below-minimum-batch', batchSize: 3 });
    expect(registryExecutor.attestRegistryRoot).not.toHaveBeenCalled();
    expect(referendumExecutor.publishCredentialRoot).not.toHaveBeenCalled();
  });

  it('publishes an under-sized batch after maxWaitMs and flags belowMinimum', async () => {
    let now = 0;
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 400n }, credentialCount: 3n }),
    );
    const registryExecutor = makeRegistryExecutor();
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
      minBatchSize: 16,
      maxWaitMs: 900_000,
      now: () => now,
    });

    const first = await publisher.publishOnce();
    expect(first.published).toBe(false);

    now += 900_001;
    const second = await publisher.publishOnce();
    expect(second).toMatchObject({ published: true, batchSize: 3, belowMinimum: true });
  });

  it('attests before publishing and records both transaction ids', async () => {
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 500n }, credentialCount: 16n }),
    );
    const callOrder: string[] = [];
    const registryExecutor = makeRegistryExecutor({
      onAttest: () => callOrder.push('attest'),
    });
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    referendumExecutor.publishCredentialRoot.mockImplementation(async () => {
      callOrder.push('publish');
      return publishReceipt(referendumAddressA, 'publish-tx');
    });
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
      minBatchSize: 16,
    });

    const result = await publisher.publishOnce();
    expect(callOrder).toEqual(['attest', 'publish']);
    expect(result).toMatchObject({
      published: true,
      attestationTransactionId: 'attest-tx',
      referenda: [
        { contractAddress: referendumAddressA, status: 'published', transactionId: 'publish-tx' },
      ],
    });
  });

  it('does not publish when the attestation fails', async () => {
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 600n }, credentialCount: 16n }),
    );
    const registryExecutor = makeRegistryExecutor({ attestFails: true });
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
      minBatchSize: 16,
      logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
    });

    const result = await publisher.publishOnce();
    expect(result).toEqual({ published: false, reason: 'attestation-failed' });
    expect(referendumExecutor.publishCredentialRoot).not.toHaveBeenCalled();
  });

  it('publishes to every configured referendum', async () => {
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 700n }, credentialCount: 16n }),
    );
    const registryExecutor = makeRegistryExecutor();
    const referendumExecutorA = makeReferendumExecutor(referendumAddressA);
    const referendumExecutorB = makeReferendumExecutor(referendumAddressB);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [
        target(referendumAddressA, referendumExecutorA),
        target(referendumAddressB, referendumExecutorB),
      ],
      minBatchSize: 16,
    });

    const result = await publisher.publishOnce();
    expect(referendumExecutorA.publishCredentialRoot).toHaveBeenCalledTimes(1);
    expect(referendumExecutorB.publishCredentialRoot).toHaveBeenCalledTimes(1);
    expect(result.published).toBe(true);
    if (result.published) {
      expect(result.referenda).toHaveLength(2);
      expect(result.referenda.map((entry) => entry.contractAddress).sort()).toEqual(
        [referendumAddressA, referendumAddressB].sort(),
      );
    }
  });

  it('does not let a failing cycle stop later cycles', async () => {
    let call = 0;
    const reader: CredentialRootPublisherReader = {
      readRegistry: vi.fn(async () => {
        call += 1;
        if (call === 1) throw new Error('indexer unavailable');
        return registryState({ currentRoot: { field: 800n }, credentialCount: 16n });
      }),
      readReferendum: vi.fn(async () => referendumState()),
    };
    const registryExecutor = makeRegistryExecutor();
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
      minBatchSize: 16,
    });

    await expect(publisher.publishOnce()).rejects.toThrow('indexer unavailable');
    const second = await publisher.publishOnce();
    expect(second).toMatchObject({ published: true, batchSize: 16 });
  });

  it('is a no-op when no referenda are configured, so the deployment behaves as today', async () => {
    const reader = makeReader(() =>
      registryState({ currentRoot: { field: 900n }, credentialCount: 100n }),
    );
    const registryExecutor = makeRegistryExecutor();
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [],
    });

    const result = await publisher.publishOnce();
    expect(result).toEqual({ published: false, reason: 'no-referenda-configured' });
    expect(registryExecutor.attestRegistryRoot).not.toHaveBeenCalled();
  });

  it('publishes an under-sized batch when a referendum enrollment deadline is imminent', async () => {
    const now = 0;
    const reader = makeReader(
      () => registryState({ currentRoot: { field: 1_000n }, credentialCount: 2n }),
      { [referendumAddressA]: () => referendumState({ enrollmentClosesAtUnix: 500n }) },
    );
    const registryExecutor = makeRegistryExecutor();
    const referendumExecutor = makeReferendumExecutor(referendumAddressA);
    const publisher = new CredentialRootPublisher({
      registryExecutor,
      registryContractAddress: registryAddress,
      reader,
      referenda: [target(referendumAddressA, referendumExecutor)],
      minBatchSize: 16,
      maxWaitMs: 900_000,
      now: () => now,
    });

    const result = await publisher.publishOnce();
    expect(result).toMatchObject({ published: true, batchSize: 2, belowMinimum: true });
  });

  describe('getStatus', () => {
    it('reports the batch as unobserved before the first cycle rather than as empty', () => {
      const publisher = new CredentialRootPublisher({
        registryExecutor: makeRegistryExecutor(),
        registryContractAddress: registryAddress,
        reader: makeReader(() => registryState({})),
        referenda: [target(referendumAddressA, makeReferendumExecutor(referendumAddressA))],
        minBatchSize: 16,
        maxWaitMs: 900_000,
        now: () => 1_000,
      });

      const status = publisher.getStatus();
      // Null, not 0. "We have not looked" and "nothing has happened" are
      // different facts, and only the second one is reassuring.
      expect(status.pendingCount).toBeNull();
      expect(status.pendingSinceMs).toBeNull();
      expect(status.publishesNoLaterThanMs).toBeNull();
      expect(status.lastPublishedAtMs).toBeNull();
      expect(status).toMatchObject({ minBatchSize: 16, maxWaitMs: 900_000, observedAtMs: 1_000 });
    });

    it('exposes the pending batch and the deadline it is bounded by', async () => {
      const now = 5_000;
      const publisher = new CredentialRootPublisher({
        registryExecutor: makeRegistryExecutor(),
        registryContractAddress: registryAddress,
        reader: makeReader(() =>
          registryState({ currentRoot: { field: 700n }, credentialCount: 3n }),
        ),
        referenda: [target(referendumAddressA, makeReferendumExecutor(referendumAddressA))],
        minBatchSize: 16,
        maxWaitMs: 900_000,
        now: () => now,
      });

      await publisher.publishOnce();
      const status = publisher.getStatus();

      expect(status.pendingCount).toBe(3);
      expect(status.pendingSinceMs).toBe(5_000);
      // The wait is bounded and the bound is knowable, which is the whole point.
      expect(status.publishesNoLaterThanMs).toBe(905_000);
    });

    it('drains the batch and records the publish time once a root goes out', async () => {
      let now = 0;
      const publisher = new CredentialRootPublisher({
        registryExecutor: makeRegistryExecutor(),
        registryContractAddress: registryAddress,
        reader: makeReader(() =>
          registryState({ currentRoot: { field: 800n }, credentialCount: 20n }),
        ),
        referenda: [target(referendumAddressA, makeReferendumExecutor(referendumAddressA))],
        minBatchSize: 16,
        maxWaitMs: 900_000,
        now: () => now,
      });

      now = 42_000;
      const result = await publisher.publishOnce();
      expect(result.published).toBe(true);

      const status = publisher.getStatus();
      expect(status.pendingCount).toBe(0);
      expect(status.pendingSinceMs).toBeNull();
      expect(status.publishesNoLaterThanMs).toBeNull();
      expect(status.lastPublishedAtMs).toBe(42_000);
    });
  });
});
