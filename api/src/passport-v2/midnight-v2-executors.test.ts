import { type FinalizedTxData, SucceedEntirely } from '@midnight-ntwrk/midnight-js-types';
import { describe, expect, it } from 'vitest';
import { deriveRegistryContractBinding } from './crypto.js';
import type {
  CredentialRegistryV1PrivateState,
  FrozenCredentialRegistryReference,
  ReferendumV2PrivateState,
} from './midnight-v2.js';
import {
  type CredentialRegistryV1Providers,
  canonicalReceiptFromFinalizedPublic,
  createCredentialRegistryV1Executor,
  createReferendumV2Executor,
  credentialRegistryConstructorArgs,
  type MidnightV2ExecutorDependencies,
  type ReferendumV2Providers,
  referendumV2ConstructorArgs,
} from './midnight-v2-executors.js';

function finalized(status: string = SucceedEntirely): FinalizedTxData {
  return {
    status,
    txId: 'tx-id',
    txHash: 'tx-hash',
    blockHeight: 42,
    blockHash: 'block-hash',
    blockTimestamp: 1_700_000_000,
  } as unknown as FinalizedTxData;
}

const registryPrivateState: CredentialRegistryV1PrivateState = {
  issuerSecret: new Uint8Array(32).fill(3),
  holderBinding: new Uint8Array(32).fill(4),
  credentialBlind: new Uint8Array(32).fill(5),
  credentialCountry: new Uint8Array(32).fill(6),
  credentialAgeClass: 2n,
  credentialAssurance: 2n,
  credentialClaimEpoch: 7n,
  credentialValidUntil: 99n,
};

const referendumPrivateState: ReferendumV2PrivateState = {
  role: 'organizer',
  organizerSecret: new Uint8Array(32).fill(7),
};

const registryConfig = {
  registryId: new Uint8Array(32).fill(1),
  issuerId: new Uint8Array(32).fill(2),
  credentialEpoch: 7n,
  issuerKey: new Uint8Array(32).fill(8),
  network: 'preview' as const,
};

const frozenRegistry: FrozenCredentialRegistryReference = {
  registryContractAddress: 'ab'.repeat(32),
  registryContractBinding: deriveRegistryContractBinding('ab'.repeat(32)),
  registryId: new Uint8Array(32).fill(1),
  issuerId: new Uint8Array(32).fill(2),
  credentialEpoch: 7n,
  frozenRoot: { field: 99n },
};

const referendumConfig = {
  registry: frozenRegistry,
  eventId: new Uint8Array(32).fill(9),
  organizerKey: new Uint8Array(32).fill(8),
  countryPolicy: new Uint8Array(32).fill(4),
  countryPolicyEnabled: true,
  minimumAssurance: 2n,
  requireAdult: true,
  validityReference: 99n,
  network: 'preview' as const,
};

function fakeDependencies() {
  const calls: string[] = [];
  const response = () => ({
    public: finalized(),
    private: { provingMaterial: 'must-not-escape' },
  });
  const contract = {
    callTx: {
      addCredential: async () => {
        calls.push('addCredential');
        return response();
      },
      freeze: async () => {
        calls.push('freeze');
        return response();
      },
      castVote: async () => {
        calls.push('castVote');
        return response();
      },
      closeVote: async () => {
        calls.push('closeVote');
        return response();
      },
      revealVote: async () => {
        calls.push('revealVote');
        return response();
      },
      finalizeVote: async () => {
        calls.push('finalizeVote');
        return response();
      },
    },
    deployTxData: {
      public: { ...finalized(), contractAddress: 'contract-address' },
      private: { provingMaterial: 'deploy-secret-must-not-escape' },
    },
  };
  let deployOptions: unknown;
  let joinOptions: unknown;
  const dependencies = {
    deployContract: (async (_providers: unknown, options: unknown) => {
      deployOptions = options;
      return contract;
    }) as unknown as MidnightV2ExecutorDependencies['deployContract'],
    findDeployedContract: (async (_providers: unknown, options: unknown) => {
      joinOptions = options;
      return contract;
    }) as unknown as MidnightV2ExecutorDependencies['findDeployedContract'],
  };
  return {
    calls,
    dependencies,
    deployOptions: () => deployOptions,
    joinOptions: () => joinOptions,
  };
}

describe('Midnight v2 executors', () => {
  it('keeps registry constructor inputs public and excludes the issuer secret', () => {
    const args = credentialRegistryConstructorArgs(registryConfig);
    expect(args).toEqual([
      registryConfig.registryId,
      registryConfig.issuerId,
      7n,
      registryConfig.issuerKey,
    ]);
    expect(args).not.toContain(registryPrivateState.issuerSecret);
  });

  it('pins referendum constructor inputs to the frozen registry reference', () => {
    expect(referendumV2ConstructorArgs(referendumConfig)).toEqual([
      frozenRegistry.registryId,
      frozenRegistry.issuerId,
      frozenRegistry.credentialEpoch,
      frozenRegistry.frozenRoot,
      frozenRegistry.registryContractBinding,
      referendumConfig.eventId,
      referendumConfig.organizerKey,
      referendumConfig.countryPolicy,
      true,
      2n,
      true,
      99n,
    ]);
  });

  it('maps only finalized public fields into canonical receipts', () => {
    const receipt = canonicalReceiptFromFinalizedPublic(finalized(), {
      action: 'vote',
      circuit: 'castVote',
      network: 'preview',
      contractAddress: 'contract-address',
      explorerBaseUrl: 'https://explorer.example/tx/',
    });
    expect(receipt).toMatchObject({
      status: 'confirmed',
      action: 'vote',
      circuit: 'castVote',
      network: 'preview',
      transactionId: 'tx-id',
      transactionHash: 'tx-hash',
      contractAddress: 'contract-address',
      blockHeight: 42,
      blockTimestamp: '2023-11-14T22:13:20.000Z',
      explorerUrl: 'https://explorer.example/tx/tx-id',
    });
    expect(JSON.stringify(receipt)).not.toContain('private');
  });

  it('rejects failed finalized transactions and mainnet configuration', () => {
    expect(() =>
      canonicalReceiptFromFinalizedPublic(finalized('FailFallible'), {
        action: 'vote',
        circuit: 'castVote',
        network: 'preview',
        contractAddress: 'contract-address',
      }),
    ).toThrow('did not succeed');
    expect(() =>
      createCredentialRegistryV1Executor({} as CredentialRegistryV1Providers, {
        ...registryConfig,
        network: 'mainnet',
      }),
    ).toThrow('restricted to Preview');
  });

  it('deploys and calls the registry without returning private SDK data', async () => {
    const fake = fakeDependencies();
    const executor = createCredentialRegistryV1Executor(
      {} as CredentialRegistryV1Providers,
      registryConfig,
      { dependencies: fake.dependencies },
    );
    const deployment = await executor.deploy(registryPrivateState);
    const credentialReceipt = await executor.addCredential();
    expect(deployment.contractAddress).toBe('contract-address');
    expect(deployment.receipt.circuit).toBe('deploy');
    expect(credentialReceipt.circuit).toBe('addCredential');
    expect(fake.calls).toEqual(['addCredential']);
    expect(JSON.stringify([deployment, credentialReceipt])).not.toContain('must-not-escape');
  });

  it('joins and executes the referendum circuit surface with public receipts', async () => {
    const fake = fakeDependencies();
    const contractAddress = 'ab'.repeat(32);
    const executor = createReferendumV2Executor({} as ReferendumV2Providers, referendumConfig, {
      dependencies: fake.dependencies,
    });
    await executor.join(contractAddress, referendumPrivateState);
    const receipts = [
      await executor.castVote(),
      await executor.closeVote(),
      await executor.revealVote('YES', new Uint8Array(32).fill(1)),
      await executor.finalizeVote(),
    ];
    expect(receipts.map((receipt) => receipt.circuit)).toEqual([
      'castVote',
      'closeVote',
      'revealVote',
      'finalizeVote',
    ]);
    expect(fake.calls).toEqual(['castVote', 'closeVote', 'revealVote', 'finalizeVote']);
    expect(JSON.stringify(receipts)).not.toContain('must-not-escape');
    expect(fake.joinOptions()).toMatchObject({ contractAddress });
  });
});
