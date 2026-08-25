import {
  CompactTypeBytes,
  CompactTypeVector,
  convertFieldToBytes,
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
  type MerkleTreeDigest,
  type MerkleTreePath,
  persistentCommit,
  persistentHash,
  type WitnessContext,
} from '@midnight-ntwrk/compact-runtime';
import { sampleCoinPublicKey } from '@midnight-ntwrk/ledger-v8';
import { describe, expect, it } from 'vitest';
import {
  deriveBallotCommitment,
  deriveRawCredentialLeaf,
  deriveVoteNullifier,
} from '../api/src/passport-v2/crypto.js';
import {
  Contract as RegistryContract,
  ledger as registryLedger,
} from './credential-registry-v1/managed/credential-registry-v1/contract/index.js';
import {
  Choice,
  Contract as ReferendumContract,
  ledger as referendumLedger,
} from './referendum-v2/managed/referendum-v2/contract/index.js';

const bytes32 = new CompactTypeBytes(32);
const vector2 = new CompactTypeVector(2, bytes32);
const vector8 = new CompactTypeVector(8, bytes32);

function bytes(value: number): Uint8Array {
  return new Uint8Array(32).fill(value);
}

function pad32(value: string): Uint8Array {
  const result = new Uint8Array(32);
  result.set(new TextEncoder().encode(value));
  return result;
}

function uintBytes(value: bigint): Uint8Array {
  return convertFieldToBytes(32, value, 'golden vector');
}

type Claims = {
  holderBinding: Uint8Array;
  issuerId: Uint8Array;
  country: Uint8Array;
  ageClass: bigint;
  assurance: bigint;
  epoch: bigint;
  validUntil: bigint;
  blind: Uint8Array;
};

function credentialLeaf(claims: Claims): Uint8Array {
  return persistentCommit(
    vector8,
    [
      pad32('cico:credential:v1'),
      claims.holderBinding,
      claims.issuerId,
      claims.country,
      uintBytes(claims.ageClass),
      uintBytes(claims.assurance),
      uintBytes(claims.epoch),
      uintBytes(claims.validUntil),
    ],
    claims.blind,
  );
}

function holderBinding(voterSecret: Uint8Array, holderBlind: Uint8Array): Uint8Array {
  return persistentCommit(vector2, [pad32('cico:holder-bind:v1'), voterSecret], holderBlind);
}

function roleKey(domain: string, secret: Uint8Array): Uint8Array {
  return persistentHash(vector2, [pad32(domain), secret]);
}

type RegistryPrivateState = {
  issuerSecret: Uint8Array;
  claims: Claims;
};

function registryWitnesses() {
  const witness =
    <K extends keyof Claims>(key: K) =>
    (context: WitnessContext<unknown, RegistryPrivateState>) =>
      [context.privateState, context.privateState.claims[key]] as const;
  return {
    issuerSecret: (context: WitnessContext<unknown, RegistryPrivateState>) =>
      [context.privateState, context.privateState.issuerSecret] as const,
    holderBinding: witness('holderBinding'),
    credentialBlind: witness('blind'),
    credentialCountry: witness('country'),
    credentialAgeClass: witness('ageClass'),
    credentialAssurance: witness('assurance'),
    credentialValidUntil: witness('validUntil'),
  };
}

function setupRegistry(overrides: Partial<Claims> = {}) {
  const issuerSecret = bytes(1);
  const voterSecret = bytes(2);
  const holderBlind = bytes(3);
  const issuerId = bytes(4);
  const claims: Claims = {
    holderBinding: holderBinding(voterSecret, holderBlind),
    issuerId,
    country: pad32('032'),
    ageClass: 2n,
    assurance: 2n,
    epoch: 7n,
    validUntil: 2_000_000_000n,
    blind: bytes(5),
    ...overrides,
  };
  const privateState: RegistryPrivateState = { issuerSecret, claims };
  const contract = new RegistryContract(registryWitnesses());
  const constructorContext = createConstructorContext(privateState, sampleCoinPublicKey());
  const initial = contract.initialState(
    constructorContext,
    bytes(6),
    issuerId,
    claims.epoch,
    roleKey('cico:registry:issuer:', issuerSecret),
  );
  const context = createCircuitContext(
    dummyContractAddress(),
    initial.currentZswapLocalState,
    initial.currentContractState,
    initial.currentPrivateState,
  );
  return { contract, context, privateState, voterSecret, holderBlind, claims };
}

type ReferendumPrivateState = {
  organizerSecret: Uint8Array;
  voterSecret: Uint8Array;
  holderBinding: Uint8Array;
  holderBlind: Uint8Array;
  credentialBlind: Uint8Array;
  credentialCountry: Uint8Array;
  credentialAgeClass: bigint;
  credentialAssurance: bigint;
  credentialClaimEpoch: bigint;
  credentialValidUntil: bigint;
  voterPath: MerkleTreePath<Uint8Array>;
  voterChoice: Choice;
  voteSalt: Uint8Array;
  revealPath?: MerkleTreePath<Uint8Array>;
};

function referendumWitnesses() {
  const witness =
    <K extends keyof ReferendumPrivateState>(key: K) =>
    (context: WitnessContext<unknown, ReferendumPrivateState>) =>
      [context.privateState, context.privateState[key]] as const;
  return {
    organizerSecret: witness('organizerSecret'),
    voterSecret: witness('voterSecret'),
    holderBinding: witness('holderBinding'),
    holderBlind: witness('holderBlind'),
    credentialBlind: witness('credentialBlind'),
    credentialCountry: witness('credentialCountry'),
    credentialAgeClass: witness('credentialAgeClass'),
    credentialAssurance: witness('credentialAssurance'),
    credentialClaimEpoch: witness('credentialClaimEpoch'),
    credentialValidUntil: witness('credentialValidUntil'),
    voterPath: witness('voterPath'),
    voterChoice: witness('voterChoice'),
    voteSalt: witness('voteSalt'),
    revealPath: (context: WitnessContext<unknown, ReferendumPrivateState>) => {
      if (!context.privateState.revealPath) throw new Error('reveal path is unavailable');
      return [context.privateState, context.privateState.revealPath] as const;
    },
  };
}

function setupReferendum(
  options: {
    eventId?: Uint8Array;
    root?: MerkleTreeDigest;
    country?: Uint8Array;
    minimumAssurance?: bigint;
    requireAdult?: boolean;
    validityReference?: bigint;
    mutatePrivateState?: (state: ReferendumPrivateState) => void;
  } = {},
) {
  const registry = setupRegistry();
  const issued = registry.contract.impureCircuits.addCredential(registry.context);
  const registryState = registryLedger(issued.context.currentQueryContext.state);
  const leaf = credentialLeaf(registry.claims);
  const voterPath = registryState.credentials.findPathForLeaf(leaf);
  if (!voterPath) throw new Error('credential leaf was not inserted');
  const root = registryState.credentials.root();
  const organizerSecret = bytes(20);
  const eventId = options.eventId ?? bytes(21);
  const privateState: ReferendumPrivateState = {
    organizerSecret,
    voterSecret: registry.voterSecret,
    holderBinding: registry.claims.holderBinding,
    holderBlind: registry.holderBlind,
    credentialBlind: registry.claims.blind,
    credentialCountry: registry.claims.country,
    credentialAgeClass: registry.claims.ageClass,
    credentialAssurance: registry.claims.assurance,
    credentialClaimEpoch: registry.claims.epoch,
    credentialValidUntil: registry.claims.validUntil,
    voterPath,
    voterChoice: Choice.YES,
    voteSalt: bytes(22),
  };
  options.mutatePrivateState?.(privateState);
  const contract = new ReferendumContract(referendumWitnesses());
  const constructorContext = createConstructorContext(privateState, sampleCoinPublicKey());
  const initial = contract.initialState(
    constructorContext,
    bytes(6),
    registry.claims.issuerId,
    registry.claims.epoch,
    options.root ?? root,
    eventId,
    roleKey('cico:referendum-v2:organizer:', organizerSecret),
    options.country ?? registry.claims.country,
    true,
    options.minimumAssurance ?? 2n,
    options.requireAdult ?? true,
    options.validityReference ?? 1_900_000_000n,
  );
  const context = createCircuitContext(
    dummyContractAddress(),
    initial.currentZswapLocalState,
    initial.currentContractState,
    initial.currentPrivateState,
  );
  return { contract, context, privateState, root, eventId, leaf };
}

describe('CredentialRegistryV1', () => {
  it('matches the TypeScript credential-leaf golden vector and freezes irreversibly', () => {
    const { contract, context, claims } = setupRegistry();
    const issued = contract.impureCircuits.addCredential(context);
    const state = registryLedger(issued.context.currentQueryContext.state);
    const expectedLeaf = credentialLeaf(claims);
    expect(expectedLeaf).toEqual(
      deriveRawCredentialLeaf({
        holderBinding: claims.holderBinding,
        issuerId: claims.issuerId,
        country: claims.country,
        ageClass: claims.ageClass,
        assurance: claims.assurance,
        credentialEpoch: claims.epoch,
        validUntil: claims.validUntil,
        credentialBlind: claims.blind,
      }),
    );
    expect(state.credentials.findPathForLeaf(expectedLeaf)?.leaf).toEqual(expectedLeaf);
    const frozen = contract.impureCircuits.freeze(issued.context, state.credentials.root());
    expect(registryLedger(frozen.context.currentQueryContext.state).frozen).toBe(true);
    expect(() => contract.impureCircuits.addCredential(frozen.context)).toThrow('frozen');
  });

  it('changes the leaf when any claim or blind changes', () => {
    const { claims } = setupRegistry();
    const baseline = Buffer.from(credentialLeaf(claims)).toString('hex');
    const variants: Claims[] = [
      { ...claims, holderBinding: bytes(31) },
      { ...claims, issuerId: bytes(32) },
      { ...claims, country: pad32('250') },
      { ...claims, ageClass: 1n },
      { ...claims, assurance: 1n },
      { ...claims, epoch: 8n },
      { ...claims, validUntil: claims.validUntil + 1n },
      { ...claims, blind: bytes(33) },
    ];
    for (const variant of variants) {
      expect(Buffer.from(credentialLeaf(variant)).toString('hex')).not.toBe(baseline);
    }
  });
});

describe('ReferendumV2 credential policy', () => {
  it('casts privately, rejects replay, and binds nullifiers to the referendum', () => {
    const first = setupReferendum({ eventId: bytes(41) });
    const firstVote = first.contract.impureCircuits.castVote(first.context);
    const firstState = referendumLedger(firstVote.context.currentQueryContext.state);
    expect(firstState.spentVoteNullifiers.size()).toBe(1n);
    expect(
      firstState.spentVoteNullifiers.member(
        deriveVoteNullifier(first.privateState.voterSecret, first.eventId),
      ),
    ).toBe(true);
    const expectedBallot = deriveBallotCommitment(
      first.eventId,
      'YES',
      first.privateState.voteSalt,
    );
    expect(firstState.ballotCommitments.findPathForLeaf(expectedBallot)?.leaf).toEqual(
      expectedBallot,
    );
    expect(firstState.tally.lookup(Choice.YES)).toBe(0n);
    expect(() => first.contract.impureCircuits.castVote(firstVote.context)).toThrow(
      'already voted',
    );

    const second = setupReferendum({ eventId: bytes(42) });
    const secondVote = second.contract.impureCircuits.castVote(second.context);
    const secondState = referendumLedger(secondVote.context.currentQueryContext.state);
    const firstNullifier = [...firstState.spentVoteNullifiers][0];
    const secondNullifier = [...secondState.spentVoteNullifiers][0];
    expect(firstNullifier).toBeDefined();
    expect(secondNullifier).toBeDefined();
    expect(firstNullifier).not.toEqual(secondNullifier);
  });

  it('binds ballot commitments to event, choice, and salt', () => {
    const eventId = bytes(61);
    const salt = bytes(62);
    const baseline = deriveBallotCommitment(eventId, 'YES', salt);
    expect(deriveBallotCommitment(bytes(63), 'YES', salt)).not.toEqual(baseline);
    expect(deriveBallotCommitment(eventId, 'NO', salt)).not.toEqual(baseline);
    expect(deriveBallotCommitment(eventId, 'YES', bytes(64))).not.toEqual(baseline);
  });

  it('rejects an unbound secret, wrong root, country, assurance, age, and expiry generically', () => {
    const cases = [
      setupReferendum({ mutatePrivateState: (state) => (state.voterSecret = bytes(51)) }),
      setupReferendum({ root: { field: 123n } }),
      setupReferendum({ country: pad32('250') }),
      setupReferendum({ minimumAssurance: 3n }),
      setupReferendum({ mutatePrivateState: (state) => (state.credentialAgeClass = 1n) }),
      setupReferendum({ validityReference: 2_100_000_000n }),
    ];
    for (const item of cases) {
      expect(() => item.contract.impureCircuits.castVote(item.context)).toThrow(
        'Credential policy not satisfied',
      );
    }
  });
});
