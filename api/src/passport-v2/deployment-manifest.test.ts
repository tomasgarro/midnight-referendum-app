import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { deriveRegistryContractBinding } from './crypto.js';
import {
  PASSPORT_V2_MANIFEST_KIND,
  PASSPORT_V2_MANIFEST_VERSION,
  type PassportV2DeploymentManifest,
  type PassportV2DeploymentStep,
  type PassportV2DeploymentStepId,
  type PassportV2ManifestObservation,
  serializePassportV2DeploymentManifest,
  validatePassportV2DeploymentManifest,
} from './deployment-manifest.js';
import type { CanonicalReceipt } from './types.js';

function manifest(
  overrides: Partial<PassportV2DeploymentManifest> = {},
): PassportV2DeploymentManifest {
  return {
    kind: PASSPORT_V2_MANIFEST_KIND,
    version: PASSPORT_V2_MANIFEST_VERSION,
    status: 'in-progress',
    network: 'undeployed',
    networkId: 'undeployed',
    generatedAt: '2026-08-28T00:00:00.000Z',
    runtime: {
      apiUrl: 'http://127.0.0.1:8791',
      credentialTtlMs: 86_400_000,
      uniquenessTimestampUpperBoundUnixSeconds: '4102444800',
    },
    artifacts: {
      compactLanguageVersion: '0.23',
      compactCompilerVersion: '0.31.1',
      compactRuntimeVersion: '0.16.0',
      midnightJsVersion: '4.1.1',
      ledgerVersion: '8.1.0',
      onchainRuntimeVersion: '3.0.0',
      registryArtifact: 'credential-registry-v1',
      referendumArtifact: 'referendum-v2',
    },
    endpoints: {
      nodeRpc: null,
      indexerHttp: null,
      indexerWs: null,
      proofServer: null,
      relay: null,
      explorer: null,
    },
    dust: {
      before: null,
      after: null,
      spent: null,
      beforeObservedAt: null,
      afterObservedAt: null,
      valuationAt: null,
      accounted: false,
    },
    registry: {
      contractAddress: null,
      registryContractBindingHex: null,
      registryIdHex: '01'.repeat(32),
      issuerId: 'fixture-issuer',
      issuerIdHex: '02'.repeat(32),
      credentialEpoch: '7',
      currentRootField: null,
      frozenRootField: null,
      credentialCount: null,
      frozen: false,
      enrollmentModel: 'open',
    },
    referenda: [
      {
        referendumId: 'fixture:referendum',
        contractAddress: null,
        registryContractBindingHex: null,
        registryContractAddress: null,
        eventIdHex: '03'.repeat(32),
        organizerKeyHex: '04'.repeat(32),
        rootPublisherKeyHex: '05'.repeat(32),
        initialRootField: '10',
        acceptedRoots: ['10'],
        opensAtUnix: '1000',
        enrollmentClosesAtUnix: '2000',
        closesAtUnix: '3000',
        revealClosesAtUnix: '4000',
        countryPolicy: null,
        minimumAssurance: '2',
        requireAdult: true,
        validityReference: '1',
        title: 'Fixture referendum',
        question: 'Should it proceed?',
      },
    ],
    transcript: { steps: [], observations: [] },
    ...overrides,
  };
}

function completeManifest(
  overrides: Partial<PassportV2DeploymentManifest> = {},
): PassportV2DeploymentManifest {
  const registryAddress = 'aa'.repeat(32);
  const referendumAddress = 'bb'.repeat(32);
  const indexerHttp = 'http://127.0.0.1:8088/api/v4/graphql';
  const binding = bytesToHex(deriveRegistryContractBinding(registryAddress));
  const receipt = (
    transactionId: string,
    circuit: string,
    blockHeight: number,
  ): CanonicalReceipt => ({
    status: 'confirmed',
    action: 'vote',
    network: 'undeployed',
    transactionId,
    transactionHash: `${transactionId}-hash`,
    contractAddress: referendumAddress,
    circuit,
    blockHeight,
    blockHash: `${transactionId}-block`,
    blockTimestamp: `2026-08-28T00:0${blockHeight}:00.000Z`,
  });
  const receipts = {
    cast: receipt('cast-tx', 'castVote', 1),
    close: receipt('close-tx', 'closeVote', 2),
    reveal: receipt('reveal-tx', 'revealVote', 3),
    finalize: receipt('finalize-tx', 'finalizeVote', 4),
  };
  const step = (
    id: PassportV2DeploymentStepId,
    status: PassportV2DeploymentStep['status'],
    stepReceipt?: CanonicalReceipt,
  ): PassportV2DeploymentStep => ({
    id,
    status,
    completedAt: '2026-08-28T00:10:00.000Z',
    ...(stepReceipt ? { receipt: stepReceipt } : {}),
  });
  const observation = (
    stage: PassportV2DeploymentStepId,
    transactionId?: string,
  ): PassportV2ManifestObservation => ({
    stage,
    observedAt: '2026-08-28T00:11:00.000Z',
    indexer: { available: true, source: indexerHttp },
    ...(transactionId ? { transactionId } : {}),
  });
  const value = manifest({
    status: 'complete',
    source: { commit: 'c'.repeat(40), tree: 'd'.repeat(40) },
    services: {
      api: { version: 'api', hash: '1'.repeat(64) },
      relayer: { version: 'relayer', hash: '2'.repeat(64) },
      node: { version: 'node', hash: '3'.repeat(64) },
      indexer: { version: 'indexer', hash: '4'.repeat(64) },
      proofServer: { version: 'proof', hash: '5'.repeat(64) },
      lockfile: { version: 'lockfile', hash: '6'.repeat(64) },
    },
    artifacts: {
      ...manifest().artifacts,
      hashes: { registry: '7'.repeat(64), referendum: '8'.repeat(64) },
    },
    endpoints: {
      nodeRpc: 'ws://127.0.0.1:9944',
      indexerHttp,
      indexerWs: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
      proofServer: 'http://127.0.0.1:6300',
      relay: 'http://127.0.0.1:8790',
      explorer: null,
    },
    dust: {
      before: '10',
      after: '7',
      spent: '3',
      beforeObservedAt: '2026-08-28T00:05:00.000Z',
      afterObservedAt: '2026-08-28T00:12:00.000Z',
      valuationAt: '2026-08-28T00:05:00.000Z',
      accounted: true,
    },
    registry: {
      ...manifest().registry,
      contractAddress: registryAddress,
      registryContractBindingHex: binding,
      currentRootField: '10',
      frozenRootField: '10',
      credentialCount: '1',
      frozen: true,
      enrollmentModel: 'frozen',
    },
    referenda: [
      {
        ...manifest().referenda[0],
        contractAddress: referendumAddress,
        registryContractBindingHex: binding,
        registryContractAddress: registryAddress,
      },
    ],
    action: {
      actionId: 'action-1',
      actionIdDigest: createHash('sha256')
        .update('midnight-referendum:v2-action-id-digest:1:action-1', 'utf8')
        .digest('hex'),
      idempotencyKeyDigest: 'a'.repeat(64),
      requestHash: 'b'.repeat(64),
      txDigest: 'c'.repeat(64),
      capabilityDigest: 'd'.repeat(64),
      transactionId: receipts.cast.transactionId,
      status: 'confirmed',
    },
    submissionTransport: 'v2-actions',
    relay: {
      submissionTransport: 'v2-actions',
      durableStore: 'postgresql',
      legacyApiEnabled: false,
      states: [
        'authorized',
        'validated',
        'dust_reserved',
        'finalized',
        'submitted',
        'indexer_pending',
        'confirmed',
      ],
      accepted: true,
      duplicateResolved: true,
      concurrentIdempotent: true,
      restartRecovered: true,
    },
    lifecycle: {
      castTransactionId: receipts.cast.transactionId,
      closeTransactionId: receipts.close.transactionId,
      revealTransactionId: receipts.reveal.transactionId,
      finalizeTransactionId: receipts.finalize.transactionId,
      replayRejected: true,
      finalized: true,
      indexerObservations: 4,
    },
    transcript: {
      steps: [
        step('registry.deploy', 'confirmed'),
        step('registry.issue', 'confirmed'),
        step('registry.freeze', 'confirmed'),
        step('referendum.deploy', 'confirmed'),
        step('lifecycle.cast', 'confirmed', receipts.cast),
        step('lifecycle.replay-rejected', 'rejected'),
        step('lifecycle.close', 'confirmed', receipts.close),
        step('lifecycle.reveal', 'confirmed', receipts.reveal),
        step('lifecycle.finalize', 'confirmed', receipts.finalize),
      ],
      observations: [
        observation('lifecycle.cast', receipts.cast.transactionId),
        observation('lifecycle.replay-rejected'),
        observation('lifecycle.close', receipts.close.transactionId),
        observation('lifecycle.reveal', receipts.reveal.transactionId),
        observation('lifecycle.finalize', receipts.finalize.transactionId),
      ],
    },
  });
  const candidate = { ...value, ...overrides };
  const digestInput = { ...candidate } as Record<string, unknown>;
  delete digestInput.manifestDigest;
  return {
    ...candidate,
    manifestDigest: createHash('sha256').update(stableJson(digestInput), 'utf8').digest('hex'),
  };
}

/**
 * Builds a complete, open-enrollment manifest whose referendum has admitted
 * one extra registry root ('20') after deployment, backed by a
 * `referendum.publish-root` step and a separate `registry.attest` step (they
 * cannot share a transaction: the referendum and registry are different
 * contracts and transaction merging requires one side to have no contract
 * calls).
 */
function openEnrollmentManifest(
  overridePublishRoot: Partial<PassportV2DeploymentStep> = {},
  overrideAttest: Partial<PassportV2DeploymentStep> = {},
): PassportV2DeploymentManifest {
  const registryAddress = 'aa'.repeat(32);
  const referendumAddress = 'bb'.repeat(32);
  const base = completeManifest();
  const publishReceipt: CanonicalReceipt = {
    status: 'confirmed',
    action: 'vote',
    network: 'undeployed',
    transactionId: 'publish-root-tx',
    transactionHash: 'publish-root-tx-hash',
    contractAddress: referendumAddress,
    circuit: 'publishRoot',
    blockHeight: 10,
    blockHash: 'publish-root-block',
    blockTimestamp: '2026-08-28T00:20:00.000Z',
  };
  const attestReceipt: CanonicalReceipt = {
    status: 'confirmed',
    action: 'credential',
    network: 'undeployed',
    transactionId: 'registry-attest-tx',
    transactionHash: 'registry-attest-tx-hash',
    contractAddress: registryAddress,
    circuit: 'attestCurrentRoot',
    blockHeight: 9,
    blockHash: 'registry-attest-block',
    blockTimestamp: '2026-08-28T00:19:00.000Z',
  };
  const publishStep: PassportV2DeploymentStep = {
    id: 'referendum.publish-root',
    status: 'confirmed',
    completedAt: '2026-08-28T00:20:00.000Z',
    receipt: publishReceipt,
    details: { rootField: '20' },
    attestationTransactionId: attestReceipt.transactionId,
    ...overridePublishRoot,
  };
  const attestStep: PassportV2DeploymentStep = {
    id: 'registry.attest',
    status: 'confirmed',
    completedAt: '2026-08-28T00:19:00.000Z',
    receipt: attestReceipt,
    details: { rootField: '20' },
    ...overrideAttest,
  };
  const steps = [
    ...base.transcript.steps.filter((step) => step.id !== 'registry.freeze'),
    publishStep,
    attestStep,
  ];
  return completeManifest({
    registry: { ...base.registry, frozen: false, frozenRootField: null, enrollmentModel: 'open' },
    referenda: [{ ...base.referenda[0], acceptedRoots: ['10', '20'] }],
    transcript: { steps, observations: base.transcript.observations },
  });
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) as string;
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(',')}}`;
}

describe('Passport v2 deployment manifest', () => {
  it('accepts a restartable in-progress journal and serializes observations safely', () => {
    const value = manifest();
    expect(() => validatePassportV2DeploymentManifest(value)).not.toThrow();
    expect(serializePassportV2DeploymentManifest(value)).toContain('"observations": []');
  });

  it('fails closed for a complete manifest without v2 evidence identity', () => {
    expect(() => validatePassportV2DeploymentManifest(manifest({ status: 'complete' }))).toThrow(
      'source commit/tree',
    );
  });

  it('accepts a complete manifest only with a matching canonical digest and evidence', () => {
    expect(() => validatePassportV2DeploymentManifest(completeManifest())).not.toThrow();
  });

  it('rejects a complete manifest when the canonical digest no longer matches', () => {
    const original = completeManifest();
    const value = { ...original, runtime: { ...original.runtime, apiUrl: 'https://api.example' } };
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow('manifest digest');
  });

  it('binds the action transaction to the confirmed cast receipt', () => {
    const original = completeManifest();
    if (!original.action) throw new Error('test fixture action is missing');
    const value = completeManifest({
      action: { ...original.action, transactionId: 'different-tx' },
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow('cast receipt');

    if (!original.lifecycle) throw new Error('test fixture lifecycle evidence is missing');
    const lifecycle = { ...original.lifecycle, castTransactionId: 'different-tx' };
    expect(() => validatePassportV2DeploymentManifest(completeManifest({ lifecycle }))).toThrow(
      'finalized lifecycle evidence',
    );
  });

  it('binds the public action ID to its domain-separated digest', () => {
    const original = completeManifest();
    const action = original.action;
    if (!action) throw new Error('test fixture action is missing');
    expect(() =>
      validatePassportV2DeploymentManifest(
        completeManifest({ action: { ...action, actionIdDigest: '9'.repeat(64) } }),
      ),
    ).toThrow('action ID digest');
  });

  it('requires expected lifecycle receipt identities and one indexer observation per receipt', () => {
    const value = completeManifest();
    const reveal = value.transcript.steps.find((step) => step.id === 'lifecycle.reveal');
    if (!reveal?.receipt) throw new Error('test fixture reveal receipt is missing');
    const altered = {
      ...value.transcript,
      steps: value.transcript.steps.map((step) =>
        step.id === 'lifecycle.reveal'
          ? {
              ...step,
              receipt: { ...reveal.receipt, circuit: 'castVote' } as CanonicalReceipt,
            }
          : step,
      ),
    };
    expect(() =>
      validatePassportV2DeploymentManifest(completeManifest({ transcript: altered })),
    ).toThrow('lifecycle.reveal receipt');

    const duplicateObservation = {
      ...value.transcript,
      observations: [...value.transcript.observations, value.transcript.observations[0]],
    };
    expect(() =>
      validatePassportV2DeploymentManifest(completeManifest({ transcript: duplicateObservation })),
    ).toThrow('duplicate indexer transaction observations');
  });

  it('requires the exact ordered relay state sequence', () => {
    const value = completeManifest();
    if (!value.relay) throw new Error('test fixture relay evidence is missing');
    const relay = { ...value.relay, states: [...value.relay.states].reverse() };
    expect(() => validatePassportV2DeploymentManifest(completeManifest({ relay }))).toThrow(
      'exact PostgreSQL relay policy/state',
    );
  });

  it('rejects private fixture material instead of serializing it', () => {
    const value = manifest({
      transcript: {
        steps: [],
        observations: [],
        secret: 'must-not-cross-boundary',
      } as never,
    });
    expect(() => serializePassportV2DeploymentManifest(value)).toThrow('private fixture material');
  });

  it('rejects a registry binding that does not match its selected address', () => {
    const value = manifest({
      registry: {
        ...manifest().registry,
        contractAddress: 'ab'.repeat(32),
        registryContractBindingHex: '00'.repeat(32),
      },
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'contract binding does not match its address',
    );
  });

  it('rejects sensitive keys recursively, including normalized variants', () => {
    for (const key of [
      'holderSecret',
      'holder_secret',
      'holder-blind',
      'credentialOpening',
      'choice',
      'passport-profile',
      'private_state',
      'rawProof',
    ]) {
      const value = manifest({
        transcript: {
          steps: [],
          observations: [],
          nested: [{ [key]: 'must-not-cross-boundary' }],
        } as never,
      });
      expect(() => validatePassportV2DeploymentManifest(value), key).toThrow(
        'private fixture material',
      );
    }
  });

  it('allows local HTTP only for undeployed runtime APIs and requires HTTPS on Preview', () => {
    expect(() => validatePassportV2DeploymentManifest(manifest())).not.toThrow();
    expect(() =>
      validatePassportV2DeploymentManifest(
        manifest({ runtime: { ...manifest().runtime, apiUrl: 'http://api.example' } }),
      ),
    ).toThrow('local host');
    expect(() =>
      validatePassportV2DeploymentManifest(
        manifest({
          network: 'preview',
          networkId: 'preview',
          runtime: { ...manifest().runtime, apiUrl: 'http://localhost:8791' },
        }),
      ),
    ).toThrow('HTTPS');
    expect(() =>
      validatePassportV2DeploymentManifest(
        manifest({
          network: 'preview',
          networkId: 'preview',
          runtime: { ...manifest().runtime, apiUrl: 'https://api.example' },
        }),
      ),
    ).not.toThrow();
    expect(() =>
      validatePassportV2DeploymentManifest(
        manifest({
          runtime: { ...manifest().runtime, apiUrl: 'http://127.0.0.1:8791/?token=secret' },
        }),
      ),
    ).toThrow('query strings');
  });

  it('accepts a complete open-enrollment manifest with an attested published root', () => {
    expect(() => validatePassportV2DeploymentManifest(openEnrollmentManifest())).not.toThrow();
  });

  it('rejects a published root with no attestation', () => {
    const value = openEnrollmentManifest({ attestationTransactionId: undefined });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'missing a registry.attest attestation',
    );
  });

  it('rejects an attestation that reuses the publish-root transaction instead of a separate registry.attest transaction', () => {
    const base = openEnrollmentManifest();
    const publishStep = base.transcript.steps.find((step) => step.id === 'referendum.publish-root');
    if (!publishStep?.receipt) throw new Error('test fixture publish-root step is missing');
    const value = openEnrollmentManifest({
      attestationTransactionId: publishStep.receipt.transactionId,
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'must be a separate registry.attest transaction',
    );
  });

  it('rejects a published root whose registry.attest step attests a different root or registry', () => {
    const wrongRoot = openEnrollmentManifest({}, { details: { rootField: '99' } });
    expect(() => validatePassportV2DeploymentManifest(wrongRoot)).toThrow(
      'no matching registry.attest transcript step',
    );

    const wrongContract = openEnrollmentManifest(
      {},
      {
        receipt: {
          status: 'confirmed',
          action: 'credential',
          network: 'undeployed',
          transactionId: 'registry-attest-tx',
          transactionHash: 'registry-attest-tx-hash',
          contractAddress: 'cc'.repeat(32),
          circuit: 'attestCurrentRoot',
          blockHeight: 9,
          blockHash: 'registry-attest-block',
          blockTimestamp: '2026-08-28T00:19:00.000Z',
        },
      },
    );
    expect(() => validatePassportV2DeploymentManifest(wrongContract)).toThrow(
      'no matching registry.attest transcript step',
    );
  });

  it('rejects a rootPublisherKeyHex equal to the organizerKeyHex', () => {
    const value = manifest({
      referenda: [{ ...manifest().referenda[0], rootPublisherKeyHex: '04'.repeat(32) }],
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'rootPublisherKeyHex must not equal organizerKeyHex',
    );
  });

  it('rejects out-of-order referendum schedule values', () => {
    const value = manifest({
      referenda: [
        { ...manifest().referenda[0], opensAtUnix: '2000', enrollmentClosesAtUnix: '1000' },
      ],
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'opensAtUnix <= enrollmentClosesAtUnix <= closesAtUnix',
    );

    const value2 = manifest({
      referenda: [
        {
          ...manifest().referenda[0],
          enrollmentClosesAtUnix: '3000',
          closesAtUnix: '2000',
          revealClosesAtUnix: '5000',
        },
      ],
    });
    expect(() => validatePassportV2DeploymentManifest(value2)).toThrow(
      'opensAtUnix <= enrollmentClosesAtUnix <= closesAtUnix',
    );
  });

  it('rejects degenerate voting and reveal windows that would brick the referendum', () => {
    // The contract's own constructor asserts these strictly. Equal values
    // deploy happily and then make voting (or the reveal) impossible forever,
    // on sealed fields, so the manifest must refuse them too.
    const sameVotingWindow = manifest({
      referenda: [
        {
          ...manifest().referenda[0],
          opensAtUnix: '3000',
          enrollmentClosesAtUnix: '3000',
          closesAtUnix: '3000',
          revealClosesAtUnix: '4000',
        },
      ],
    });
    expect(() => validatePassportV2DeploymentManifest(sameVotingWindow)).toThrow(
      'opensAtUnix < closesAtUnix',
    );

    const sameRevealWindow = manifest({
      referenda: [
        {
          ...manifest().referenda[0],
          revealClosesAtUnix: '3000',
        },
      ],
    });
    expect(() => validatePassportV2DeploymentManifest(sameRevealWindow)).toThrow(
      'closesAtUnix < revealClosesAtUnix',
    );
  });

  it('rejects acceptedRoots missing initialRootField', () => {
    const value = manifest({
      referenda: [
        { ...manifest().referenda[0], initialRootField: '10', acceptedRoots: ['11', '12'] },
      ],
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'acceptedRoots must contain initialRootField',
    );
  });

  it('rejects duplicate entries in acceptedRoots', () => {
    const value = manifest({
      referenda: [
        { ...manifest().referenda[0], initialRootField: '10', acceptedRoots: ['10', '10'] },
      ],
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'acceptedRoots must not contain duplicates',
    );
  });

  it('rejects an empty acceptedRoots array', () => {
    const value = manifest({
      referenda: [{ ...manifest().referenda[0], acceptedRoots: [] }],
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'acceptedRoots must be non-empty',
    );
  });

  it('requires a recognized enrollmentModel', () => {
    const value = manifest({
      registry: { ...manifest().registry, enrollmentModel: 'archived' as never },
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'enrollmentModel must be "open" or "frozen"',
    );
  });

  it('rejects an open enrollmentModel that is actually frozen', () => {
    const value = manifest({
      registry: { ...manifest().registry, enrollmentModel: 'open', frozen: true },
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'open enrollmentModel must not be frozen',
    );

    const value2 = manifest({
      registry: {
        ...manifest().registry,
        enrollmentModel: 'open',
        frozen: false,
        frozenRootField: '5',
      },
    });
    expect(() => validatePassportV2DeploymentManifest(value2)).toThrow(
      'open enrollmentModel must not carry a frozenRootField',
    );
  });

  it('rejects a frozen enrollmentModel that is not actually frozen', () => {
    const value = manifest({
      registry: { ...manifest().registry, enrollmentModel: 'frozen', frozen: false },
    });
    expect(() => validatePassportV2DeploymentManifest(value)).toThrow(
      'frozen enrollmentModel must be frozen',
    );
  });

  it('rejects a complete open-enrollment manifest that still records a registry.freeze step', () => {
    const value = openEnrollmentManifest();
    const withFreeze = {
      ...value,
      transcript: {
        ...value.transcript,
        steps: [
          ...value.transcript.steps,
          {
            id: 'registry.freeze' as const,
            status: 'confirmed' as const,
            completedAt: '2026-08-28T00:21:00.000Z',
          },
        ],
      },
    };
    expect(() => validatePassportV2DeploymentManifest(withFreeze)).toThrow(
      'open enrollmentModel must not record a registry.freeze step',
    );
  });

  it('requires each referendum to carry a registryContractAddress matching the registry', () => {
    const original = completeManifest();
    const wrongAddress = completeManifest({
      referenda: [{ ...original.referenda[0], registryContractAddress: 'ee'.repeat(32) }],
    });
    expect(() => validatePassportV2DeploymentManifest(wrongAddress)).toThrow(
      'registryContractAddress does not match the registry',
    );

    const missingAddress = completeManifest({
      referenda: [{ ...original.referenda[0], registryContractAddress: null }],
    });
    expect(() => validatePassportV2DeploymentManifest(missingAddress)).toThrow(
      'missing fixture:referendum registryContractAddress',
    );
  });
});
