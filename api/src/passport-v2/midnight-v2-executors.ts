import type { MerkleTreeDigest } from '@midnight-ntwrk/compact-runtime';
import {
  type ContractProviders,
  type DeployedContract,
  deployContract,
  type FinalizedDeployTxData,
  type FoundContract,
  findDeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import {
  asContractAddress,
  type FinalizedTxData,
  SucceedEntirely,
} from '@midnight-ntwrk/midnight-js-types';
import type * as GeneratedRegistry from '../generated/credential-registry-v1/index.js';
import type * as GeneratedReferendumV2 from '../generated/referendum-v2/index.js';
import {
  assertReferendumRegistryBinding,
  CREDENTIAL_REGISTRY_V1_PRIVATE_STATE_ID,
  type CredentialRegistryV1PrivateState,
  choiceToGenerated,
  createCompiledCredentialRegistryV1,
  createCompiledReferendumV2,
  type FrozenCredentialRegistryReference,
  REFERENDUM_V2_PRIVATE_STATE_ID,
  type ReferendumV2PrivateState,
} from './midnight-v2.js';
import type { CanonicalReceipt, MidnightRuntimeNetwork, VoteChoice } from './types.js';

type RegistryContract = GeneratedRegistry.Contract<CredentialRegistryV1PrivateState>;
type ReferendumContract = GeneratedReferendumV2.Contract<ReferendumV2PrivateState>;

export type CredentialRegistryV1Providers = ContractProviders<RegistryContract>;
export type ReferendumV2Providers = ContractProviders<ReferendumContract>;

export interface CredentialRegistryV1ExecutorConfig {
  readonly registryId: Uint8Array;
  readonly issuerId: Uint8Array;
  readonly credentialEpoch: bigint;
  /** Public role key derived from the private issuer secret. */
  readonly issuerKey: Uint8Array;
  readonly network?: MidnightRuntimeNetwork;
  readonly explorerBaseUrl?: string;
}

export interface ReferendumV2ExecutorConfig {
  readonly registry: FrozenCredentialRegistryReference;
  readonly eventId: Uint8Array;
  /** Public role key derived from the private organizer secret. */
  readonly organizerKey: Uint8Array;
  readonly countryPolicy: Uint8Array;
  readonly countryPolicyEnabled: boolean;
  readonly minimumAssurance: bigint;
  readonly requireAdult: boolean;
  readonly validityReference: bigint;
  readonly network?: MidnightRuntimeNetwork;
  readonly explorerBaseUrl?: string;
}

export interface MidnightV2ExecutorDependencies {
  readonly deployContract: typeof deployContract;
  readonly findDeployedContract: typeof findDeployedContract;
}

export interface MidnightV2ExecutorOptions {
  readonly dependencies?: MidnightV2ExecutorDependencies;
}

export interface V2DeploymentReceipt {
  readonly contractAddress: string;
  readonly receipt: CanonicalReceipt;
}

export interface CredentialRegistryV1Executor {
  deploy(initialPrivateState: CredentialRegistryV1PrivateState): Promise<V2DeploymentReceipt>;
  join(
    contractAddress: string,
    initialPrivateState: CredentialRegistryV1PrivateState,
  ): Promise<void>;
  addCredential(): Promise<CanonicalReceipt>;
  freeze(candidateRoot: MerkleTreeDigest): Promise<CanonicalReceipt>;
}

export interface ReferendumV2Executor {
  deploy(initialPrivateState: ReferendumV2PrivateState): Promise<V2DeploymentReceipt>;
  join(contractAddress: string, initialPrivateState: ReferendumV2PrivateState): Promise<void>;
  castVote(): Promise<CanonicalReceipt>;
  closeVote(): Promise<CanonicalReceipt>;
  revealVote(choice: VoteChoice, salt: Uint8Array): Promise<CanonicalReceipt>;
  finalizeVote(): Promise<CanonicalReceipt>;
}

const defaultDependencies: MidnightV2ExecutorDependencies = {
  deployContract,
  findDeployedContract,
};

function requireBytes32(value: Uint8Array, label: string): Uint8Array {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new Error(`${label} must be exactly 32 bytes`);
  }
  return new Uint8Array(value);
}

function requireUnsigned(value: bigint, label: string, bits: number): bigint {
  const maximum = (1n << BigInt(bits)) - 1n;
  if (typeof value !== 'bigint' || value < 0n || value > maximum) {
    throw new Error(`${label} is outside its Uint<${bits}> range`);
  }
  return value;
}

function requireRoot(value: MerkleTreeDigest, label: string): MerkleTreeDigest {
  if (!value || typeof value !== 'object' || typeof value.field !== 'bigint' || value.field < 0n) {
    throw new Error(`${label} must be a valid Merkle tree digest`);
  }
  return { field: value.field };
}

function requireSupportedNetwork(
  network: MidnightRuntimeNetwork | undefined,
): 'preview' | 'devnet' | 'undeployed' {
  const selected = network ?? 'preview';
  if (selected === 'mainnet') {
    throw new Error('Passport v2 executors are restricted to Preview and local devnet');
  }
  return selected;
}

export function credentialRegistryConstructorArgs(
  config: CredentialRegistryV1ExecutorConfig,
): [Uint8Array, Uint8Array, bigint, Uint8Array] {
  return [
    requireBytes32(config.registryId, 'registryId'),
    requireBytes32(config.issuerId, 'issuerId'),
    requireUnsigned(config.credentialEpoch, 'credentialEpoch', 64),
    requireBytes32(config.issuerKey, 'issuerKey'),
  ];
}

export function referendumV2ConstructorArgs(
  config: ReferendumV2ExecutorConfig,
): [
  Uint8Array,
  Uint8Array,
  bigint,
  MerkleTreeDigest,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  boolean,
  bigint,
  boolean,
  bigint,
] {
  if (!config.registry.registryContractAddress.trim()) {
    throw new Error('A canonical frozen registry contract address is required');
  }

  const binding = {
    registryId: requireBytes32(config.registry.registryId, 'registry.registryId'),
    issuerId: requireBytes32(config.registry.issuerId, 'registry.issuerId'),
    credentialEpoch: requireUnsigned(
      config.registry.credentialEpoch,
      'registry.credentialEpoch',
      64,
    ),
    frozenCredentialRoot: requireRoot(config.registry.frozenRoot, 'registry.frozenRoot'),
    registryContractBinding: requireBytes32(
      config.registry.registryContractBinding,
      'registry.registryContractBinding',
    ),
  };
  assertReferendumRegistryBinding(config.registry, binding);

  return [
    binding.registryId,
    binding.issuerId,
    binding.credentialEpoch,
    binding.frozenCredentialRoot,
    binding.registryContractBinding,
    requireBytes32(config.eventId, 'eventId'),
    requireBytes32(config.organizerKey, 'organizerKey'),
    requireBytes32(config.countryPolicy, 'countryPolicy'),
    config.countryPolicyEnabled,
    requireUnsigned(config.minimumAssurance, 'minimumAssurance', 8),
    config.requireAdult,
    requireUnsigned(config.validityReference, 'validityReference', 64),
  ];
}

function explorerUrl(baseUrl: string | undefined, transactionId: string): string | undefined {
  if (!baseUrl?.trim()) return undefined;
  return `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(transactionId)}`;
}

function toIsoTimestamp(value: number): string {
  const milliseconds = value < 1_000_000_000_000 ? value * 1_000 : value;
  const date = new Date(milliseconds);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Midnight returned an invalid block timestamp');
  }
  return date.toISOString();
}

/** Maps finalized public data only; proving material and next private state cannot enter the receipt. */
export function canonicalReceiptFromFinalizedPublic(
  publicData: FinalizedTxData,
  context: {
    readonly action: CanonicalReceipt['action'];
    readonly circuit: string;
    readonly network: 'preview' | 'devnet' | 'undeployed';
    readonly contractAddress: string;
    readonly explorerBaseUrl?: string;
  },
): CanonicalReceipt {
  if (publicData.status !== SucceedEntirely) {
    throw new Error(`Midnight ${context.circuit} transaction did not succeed`);
  }
  const transactionId = String(publicData.txId);
  const url = explorerUrl(context.explorerBaseUrl, transactionId);
  return {
    status: 'confirmed',
    action: context.action,
    network: context.network,
    transactionId,
    transactionHash: String(publicData.txHash),
    contractAddress: context.contractAddress,
    circuit: context.circuit,
    blockHeight: Number(publicData.blockHeight),
    blockHash: String(publicData.blockHash),
    blockTimestamp: toIsoTimestamp(Number(publicData.blockTimestamp)),
    ...(url ? { explorerUrl: url } : {}),
  };
}

/**
 * The SDK runtime keeps the deployed address on the deployment's public
 * payload, while the v4 declaration narrows `public` to FinalizedTxData.
 * Keep that compatibility cast at this one public-only boundary.
 */
function finalizedDeployAddress<C extends RegistryContract | ReferendumContract>(
  data: FinalizedDeployTxData<C>,
): string {
  const address = (data.public as FinalizedTxData & { readonly contractAddress?: unknown })
    .contractAddress;
  if (typeof address !== 'string' || address.length === 0) {
    throw new Error('Midnight deployment returned no contract address');
  }
  return address;
}

function requireJoined<C>(contract: C | null, label: string): C {
  if (contract === null) throw new Error(`${label} contract is not joined`);
  return contract;
}

export function createCredentialRegistryV1Executor(
  providers: CredentialRegistryV1Providers,
  config: CredentialRegistryV1ExecutorConfig,
  options: MidnightV2ExecutorOptions = {},
): CredentialRegistryV1Executor {
  const args = credentialRegistryConstructorArgs(config);
  const network = requireSupportedNetwork(config.network);
  const dependencies = options.dependencies ?? defaultDependencies;
  const compiledContract = createCompiledCredentialRegistryV1();
  let contract: DeployedContract<RegistryContract> | FoundContract<RegistryContract> | null = null;
  let address: string | null = null;

  const receipt = (publicData: FinalizedTxData, circuit: string): CanonicalReceipt =>
    canonicalReceiptFromFinalizedPublic(publicData, {
      action: 'credential',
      circuit,
      network,
      contractAddress: address ?? 'unavailable',
      explorerBaseUrl: config.explorerBaseUrl,
    });

  return {
    async deploy(initialPrivateState) {
      const deployed = await dependencies.deployContract(providers, {
        compiledContract,
        privateStateId: CREDENTIAL_REGISTRY_V1_PRIVATE_STATE_ID,
        initialPrivateState,
        args,
      });
      address = finalizedDeployAddress(deployed.deployTxData);
      contract = deployed;
      return {
        contractAddress: address,
        receipt: receipt(deployed.deployTxData.public, 'deploy'),
      };
    },
    async join(contractAddress, initialPrivateState) {
      const normalized = asContractAddress(contractAddress);
      contract = await dependencies.findDeployedContract(providers, {
        contractAddress: normalized,
        compiledContract,
        privateStateId: CREDENTIAL_REGISTRY_V1_PRIVATE_STATE_ID,
        initialPrivateState,
      });
      address = String(normalized);
    },
    async addCredential() {
      const result = await requireJoined(contract, 'Credential registry').callTx.addCredential();
      return receipt(result.public, 'addCredential');
    },
    async freeze(candidateRoot) {
      const result = await requireJoined(contract, 'Credential registry').callTx.freeze(
        requireRoot(candidateRoot, 'candidateRoot'),
      );
      return receipt(result.public, 'freeze');
    },
  };
}

export function createReferendumV2Executor(
  providers: ReferendumV2Providers,
  config: ReferendumV2ExecutorConfig,
  options: MidnightV2ExecutorOptions = {},
): ReferendumV2Executor {
  const args = referendumV2ConstructorArgs(config);
  const network = requireSupportedNetwork(config.network);
  const dependencies = options.dependencies ?? defaultDependencies;
  const compiledContract = createCompiledReferendumV2();
  let contract: DeployedContract<ReferendumContract> | FoundContract<ReferendumContract> | null =
    null;
  let address: string | null = null;

  const receipt = (publicData: FinalizedTxData, circuit: string): CanonicalReceipt =>
    canonicalReceiptFromFinalizedPublic(publicData, {
      action: 'vote',
      circuit,
      network,
      contractAddress: address ?? 'unavailable',
      explorerBaseUrl: config.explorerBaseUrl,
    });

  return {
    async deploy(initialPrivateState) {
      const deployed = await dependencies.deployContract(providers, {
        compiledContract,
        privateStateId: REFERENDUM_V2_PRIVATE_STATE_ID,
        initialPrivateState,
        args,
      });
      address = finalizedDeployAddress(deployed.deployTxData);
      contract = deployed;
      return {
        contractAddress: address,
        receipt: receipt(deployed.deployTxData.public, 'deploy'),
      };
    },
    async join(contractAddress, initialPrivateState) {
      const normalized = asContractAddress(contractAddress);
      contract = await dependencies.findDeployedContract(providers, {
        contractAddress: normalized,
        compiledContract,
        privateStateId: REFERENDUM_V2_PRIVATE_STATE_ID,
        initialPrivateState,
      });
      address = String(normalized);
    },
    async castVote() {
      const result = await requireJoined(contract, 'Referendum').callTx.castVote();
      return receipt(result.public, 'castVote');
    },
    async closeVote() {
      const result = await requireJoined(contract, 'Referendum').callTx.closeVote();
      return receipt(result.public, 'closeVote');
    },
    async revealVote(choice, salt) {
      const result = await requireJoined(contract, 'Referendum').callTx.revealVote(
        choiceToGenerated(choice),
        requireBytes32(salt, 'salt'),
      );
      return receipt(result.public, 'revealVote');
    },
    async finalizeVote() {
      const result = await requireJoined(contract, 'Referendum').callTx.finalizeVote();
      return receipt(result.public, 'finalizeVote');
    },
  };
}
