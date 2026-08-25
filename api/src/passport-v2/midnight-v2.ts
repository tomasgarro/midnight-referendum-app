import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type {
  ChargedState,
  MerkleTreeDigest,
  MerkleTreePath,
} from '@midnight-ntwrk/compact-runtime';
import * as GeneratedRegistry from '../generated/credential-registry-v1/index.js';
import * as GeneratedReferendumV2 from '../generated/referendum-v2/index.js';
import type { VoteChoice } from './types.js';

export const CREDENTIAL_REGISTRY_V1_PRIVATE_STATE_ID = 'credentialRegistryV1PrivateState' as const;
export const REFERENDUM_V2_PRIVATE_STATE_ID = 'referendumV2PrivateState' as const;

export interface CredentialRegistryV1PrivateState {
  readonly issuerSecret: Uint8Array;
  readonly holderBinding: Uint8Array;
  readonly credentialBlind: Uint8Array;
  readonly credentialCountry: Uint8Array;
  readonly credentialAgeClass: bigint;
  readonly credentialAssurance: bigint;
  readonly credentialClaimEpoch: bigint;
  readonly credentialValidUntil: bigint;
}

export interface ReferendumV2PrivateState {
  readonly role: 'voter' | 'organizer';
  readonly organizerSecret?: Uint8Array;
  readonly voterSecret?: Uint8Array;
  readonly holderBinding?: Uint8Array;
  readonly holderBlind?: Uint8Array;
  readonly credentialBlind?: Uint8Array;
  readonly credentialCountry?: Uint8Array;
  readonly credentialAgeClass?: bigint;
  readonly credentialAssurance?: bigint;
  readonly credentialClaimEpoch?: bigint;
  readonly credentialValidUntil?: bigint;
  readonly voterPath?: MerkleTreePath<Uint8Array>;
  readonly voterChoice?: VoteChoice;
  readonly voteSalt?: Uint8Array;
  readonly revealPath?: MerkleTreePath<Uint8Array>;
}

export interface CredentialRegistryV1State {
  readonly registryId: Uint8Array;
  readonly issuerId: Uint8Array;
  readonly credentialEpoch: bigint;
  /** Current canonical tree root, which may differ from frozenRoot before freeze. */
  readonly currentRoot: MerkleTreeDigest;
  readonly frozenRoot: MerkleTreeDigest;
  readonly frozen: boolean;
  readonly credentialCount: bigint;
}

export interface ReferendumV2State {
  readonly registryId: Uint8Array;
  readonly issuerId: Uint8Array;
  readonly credentialEpoch: bigint;
  readonly frozenCredentialRoot: MerkleTreeDigest;
  readonly eventId: Uint8Array;
  readonly phase: 'COMMIT' | 'REVEAL' | 'FINALIZED';
  readonly closed: boolean;
  readonly tally: ReadonlyMap<VoteChoice, bigint>;
}

/** Canonical, public registry data that a referendum deployment must pin. */
export interface FrozenCredentialRegistryReference {
  readonly registryContractAddress: string;
  readonly registryId: Uint8Array;
  readonly issuerId: Uint8Array;
  readonly credentialEpoch: bigint;
  readonly frozenRoot: MerkleTreeDigest;
}

export interface ReferendumV2RegistryBinding {
  readonly registryId: Uint8Array;
  readonly issuerId: Uint8Array;
  readonly credentialEpoch: bigint;
  readonly frozenCredentialRoot: MerkleTreeDigest;
}

const registryWitnesses: GeneratedRegistry.Witnesses<CredentialRegistryV1PrivateState> = {
  issuerSecret: (context) => [context.privateState, context.privateState.issuerSecret],
  holderBinding: (context) => [context.privateState, context.privateState.holderBinding],
  credentialBlind: (context) => [context.privateState, context.privateState.credentialBlind],
  credentialCountry: (context) => [context.privateState, context.privateState.credentialCountry],
  credentialAgeClass: (context) => [context.privateState, context.privateState.credentialAgeClass],
  credentialAssurance: (context) => [
    context.privateState,
    context.privateState.credentialAssurance,
  ],
  credentialValidUntil: (context) => [
    context.privateState,
    context.privateState.credentialValidUntil,
  ],
};

const referendumWitnesses: GeneratedReferendumV2.Witnesses<ReferendumV2PrivateState> = {
  organizerSecret: (context) => [
    context.privateState,
    requireBytes(context.privateState, 'organizerSecret'),
  ],
  voterSecret: (context) => [
    context.privateState,
    requireBytes(context.privateState, 'voterSecret'),
  ],
  holderBinding: (context) => [
    context.privateState,
    requireBytes(context.privateState, 'holderBinding'),
  ],
  holderBlind: (context) => [
    context.privateState,
    requireBytes(context.privateState, 'holderBlind'),
  ],
  credentialBlind: (context) => [
    context.privateState,
    requireBytes(context.privateState, 'credentialBlind'),
  ],
  credentialCountry: (context) => [
    context.privateState,
    requireBytes(context.privateState, 'credentialCountry'),
  ],
  credentialAgeClass: (context) => [
    context.privateState,
    requireBigInt(context.privateState, 'credentialAgeClass'),
  ],
  credentialAssurance: (context) => [
    context.privateState,
    requireBigInt(context.privateState, 'credentialAssurance'),
  ],
  credentialClaimEpoch: (context) => [
    context.privateState,
    requireBigInt(context.privateState, 'credentialClaimEpoch'),
  ],
  credentialValidUntil: (context) => [
    context.privateState,
    requireBigInt(context.privateState, 'credentialValidUntil'),
  ],
  voterPath: (context) => [context.privateState, requirePath(context.privateState, 'voterPath')],
  voterChoice: (context) => [
    context.privateState,
    choiceToGenerated(requireChoice(context.privateState)),
  ],
  voteSalt: (context) => [context.privateState, requireBytes(context.privateState, 'voteSalt')],
  revealPath: (context) => [context.privateState, requirePath(context.privateState, 'revealPath')],
};

export function createCompiledCredentialRegistryV1() {
  return CompiledContract.make<
    GeneratedRegistry.Contract<CredentialRegistryV1PrivateState>,
    CredentialRegistryV1PrivateState
  >('credential-registry-v1', GeneratedRegistry.Contract).pipe(
    CompiledContract.withWitnesses(registryWitnesses),
    CompiledContract.withCompiledFileAssets('managed/credential-registry-v1'),
  );
}

export function createCompiledReferendumV2() {
  return CompiledContract.make<
    GeneratedReferendumV2.Contract<ReferendumV2PrivateState>,
    ReferendumV2PrivateState
  >('referendum-v2', GeneratedReferendumV2.Contract).pipe(
    CompiledContract.withWitnesses(referendumWitnesses),
    CompiledContract.withCompiledFileAssets('managed/referendum-v2'),
  );
}

export function parseCredentialRegistryV1(data: ChargedState): CredentialRegistryV1State {
  const ledger = GeneratedRegistry.ledger(data);
  return {
    registryId: ledger.registryId,
    issuerId: ledger.issuerId,
    credentialEpoch: ledger.credentialEpoch,
    currentRoot: ledger.credentials.root(),
    frozenRoot: ledger.frozenRoot,
    frozen: ledger.frozen,
    credentialCount: ledger.credentialCount,
  };
}

export function findCredentialPath(
  data: ChargedState,
  credentialLeaf: Uint8Array,
): MerkleTreePath<Uint8Array> {
  const path = GeneratedRegistry.ledger(data).credentials.findPathForLeaf(credentialLeaf);
  if (!path) throw new Error('Credential is not present in the canonical registry');
  return path;
}

export function parseReferendumV2(data: ChargedState): ReferendumV2State {
  const ledger = GeneratedReferendumV2.ledger(data);
  const phase = ['COMMIT', 'REVEAL', 'FINALIZED'][Number(ledger.phase)] as
    | ReferendumV2State['phase']
    | undefined;
  if (!phase) throw new Error('Canonical referendum has an unknown phase');
  return {
    registryId: ledger.registryId,
    issuerId: ledger.issuerId,
    credentialEpoch: ledger.credentialEpoch,
    frozenCredentialRoot: ledger.frozenCredentialRoot,
    eventId: ledger.eventId,
    phase,
    closed: ledger.closed,
    tally: new Map<VoteChoice, bigint>([
      ['YES', ledger.tally.lookup(GeneratedReferendumV2.Choice.YES)],
      ['NO', ledger.tally.lookup(GeneratedReferendumV2.Choice.NO)],
      ['ABSTAIN', ledger.tally.lookup(GeneratedReferendumV2.Choice.ABSTAIN)],
    ]),
  };
}

export function createFrozenCredentialRegistryReference(
  registryContractAddress: string,
  state: CredentialRegistryV1State,
): FrozenCredentialRegistryReference {
  if (!registryContractAddress.trim()) throw new Error('Registry contract address is required');
  if (!state.frozen) throw new Error('Credential registry must be canonically frozen');
  if (state.frozenRoot.field !== state.currentRoot.field) {
    throw new Error('Credential registry must freeze its current canonical root');
  }
  return {
    registryContractAddress,
    registryId: new Uint8Array(state.registryId),
    issuerId: new Uint8Array(state.issuerId),
    credentialEpoch: state.credentialEpoch,
    frozenRoot: { field: state.frozenRoot.field },
  };
}

/** Prevents deploying a referendum against an arbitrary or stale registry root. */
export function assertReferendumRegistryBinding(
  reference: FrozenCredentialRegistryReference,
  binding: ReferendumV2RegistryBinding,
): void {
  if (!equalBytes(reference.registryId, binding.registryId)) {
    throw new Error('Referendum registry ID does not match the frozen registry');
  }
  if (!equalBytes(reference.issuerId, binding.issuerId)) {
    throw new Error('Referendum issuer ID does not match the frozen registry');
  }
  if (reference.credentialEpoch !== binding.credentialEpoch) {
    throw new Error('Referendum credential epoch does not match the frozen registry');
  }
  if (reference.frozenRoot.field !== binding.frozenCredentialRoot.field) {
    throw new Error('Referendum root does not match the canonical frozen registry root');
  }
}

export function choiceToGenerated(choice: VoteChoice): GeneratedReferendumV2.Choice {
  return GeneratedReferendumV2.Choice[choice];
}

function requireBytes(
  state: ReferendumV2PrivateState,
  key:
    | 'organizerSecret'
    | 'voterSecret'
    | 'holderBinding'
    | 'holderBlind'
    | 'credentialBlind'
    | 'credentialCountry'
    | 'voteSalt',
): Uint8Array {
  const value = state[key];
  if (!(value instanceof Uint8Array) || value.length !== 32) {
    throw new Error(`Required ${key} witness is unavailable`);
  }
  return value;
}

function requireBigInt(
  state: ReferendumV2PrivateState,
  key:
    | 'credentialAgeClass'
    | 'credentialAssurance'
    | 'credentialClaimEpoch'
    | 'credentialValidUntil',
): bigint {
  const value = state[key];
  if (typeof value !== 'bigint') throw new Error(`Required ${key} witness is unavailable`);
  return value;
}

function requirePath(
  state: ReferendumV2PrivateState,
  key: 'voterPath' | 'revealPath',
): MerkleTreePath<Uint8Array> {
  const value = state[key];
  if (!value) throw new Error(`Required ${key} witness is unavailable`);
  return value;
}

function requireChoice(state: ReferendumV2PrivateState): VoteChoice {
  if (
    state.voterChoice !== 'YES' &&
    state.voterChoice !== 'NO' &&
    state.voterChoice !== 'ABSTAIN'
  ) {
    throw new Error('Required voterChoice witness is unavailable');
  }
  return state.voterChoice;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}
