import type { CredentialRegistryV1Executor } from 'midnight-referendum-api';
import { describe, expect, it, vi } from 'vitest';
import {
  type MidnightIssuerRuntimeConfig,
  type MidnightIssuerTransactionCodec,
  type MidnightIssuerWalletAdapter,
  startMidnightIssuerRuntime,
} from './midnight-issuer-runtime.js';

const config = (): MidnightIssuerRuntimeConfig => ({
  issuerSeedHex: '11'.repeat(32),
  issuerRoleSecretHex: '22'.repeat(32),
  networkId: 'preview',
  indexerHttpUrl: 'https://indexer.example/graphql',
  indexerWsUrl: 'wss://indexer.example/graphql/ws',
  proofServerUrl: 'http://localhost:6300',
  zkConfigBasePath: '/tmp/managed/credential-registry-v1',
  registryContractAddress: 'registry-address',
  registryId: new Uint8Array(32).fill(1),
  issuerId: new Uint8Array(32).fill(2),
  credentialEpoch: 7n,
});

function fakeWallet() {
  const calls = {
    balance: vi.fn(async () => ({ type: 'recipe' })),
    finalize: vi.fn(async () => ({ serialize: () => new Uint8Array([2]) })),
    submit: vi.fn(async () => 'tx-id'),
    start: vi.fn(async () => undefined),
    ready: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  };
  return {
    calls,
    wallet: {
      facade: {
        balanceUnboundTransaction: calls.balance,
        finalizeRecipe: calls.finalize,
        submitTransaction: calls.submit,
      },
      secretKeys: {},
      issuerSecret: new Uint8Array(32).fill(9),
      coinPublicKey: 'coin-key',
      encryptionPublicKey: 'encryption-key',
      start: calls.start,
      waitUntilSynced: calls.ready,
      stop: calls.stop,
    } as unknown as MidnightIssuerWalletAdapter,
  };
}

const codec = (): MidnightIssuerTransactionCodec => ({
  serialize: (tx) => {
    const value = tx as unknown as {
      readonly bytes?: Uint8Array;
      readonly serialize?: () => Uint8Array;
    };
    if (value.serialize) return value.serialize();
    if (value.bytes) return value.bytes;
    throw new TypeError('test transaction is not serializable');
  },
  deserializeUnbound: (bytes) => ({ tag: 'pre-binding', bytes }),
  deserializeFinalized: (bytes) => ({
    tag: 'binding',
    bytes,
    serialize: () => bytes,
  }),
});

describe('dedicated Preview issuer runtime', () => {
  it('fails closed outside Preview and waits for wallet readiness', async () => {
    const fake = fakeWallet();
    await expect(
      startMidnightIssuerRuntime(
        { ...config(), networkId: 'preprod' },
        { createWallet: async () => fake.wallet },
      ),
    ).rejects.toThrow('Preview-only');
    expect(fake.calls.start).not.toHaveBeenCalled();
    await expect(
      startMidnightIssuerRuntime(
        { ...config(), issuerRoleSecretHex: config().issuerSeedHex },
        { createWallet: async () => fake.wallet },
      ),
    ).rejects.toThrow('must be independent');
    await expect(
      startMidnightIssuerRuntime(
        { ...config(), proofServerUrl: 'https://proof.example' },
        { createWallet: async () => fake.wallet },
      ),
    ).rejects.toThrow('not local or explicitly approved');
  });

  it('injects provider edges and round-trips binding tags without network access', async () => {
    const fake = fakeWallet();
    const executor = {} as CredentialRegistryV1Executor;
    const setNetworkId = vi.fn();
    const providers = {
      publicData: {},
      zk: {},
      proof: {},
    };
    const runtime = await startMidnightIssuerRuntime(config(), {
      createWallet: async () => fake.wallet,
      setNetworkId,
      createPublicDataProvider: () => providers.publicData as never,
      createZkConfigProvider: () => providers.zk as never,
      createProofProvider: () => providers.proof as never,
      transactionCodec: codec(),
      createExecutor: (_providers, executorConfig) => {
        expect(executorConfig.network).toBe('preview');
        expect(executorConfig.issuerKey).toHaveLength(32);
        return executor;
      },
    });

    expect(setNetworkId).toHaveBeenCalledWith('preview');
    expect(fake.calls.start).toHaveBeenCalledOnce();
    expect(fake.calls.ready).toHaveBeenCalledOnce();
    expect(runtime.executor).toBe(executor);
    expect(runtime.providers.publicDataProvider).toBe(providers.publicData);
    expect(runtime.providers.zkConfigProvider).toBe(providers.zk);
    expect(runtime.providers.proofProvider).toBe(providers.proof);
    expect(runtime.providers.walletProvider.getCoinPublicKey()).toBe('coin-key');

    const unbound = { serialize: () => new Uint8Array([1]) };
    const finalized = await runtime.providers.walletProvider.balanceTx(unbound as never);
    expect(fake.calls.balance).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'pre-binding' }),
      fake.wallet.secretKeys,
      expect.objectContaining({ ttl: expect.any(Date) }),
    );
    expect((finalized as never as { tag: string }).tag).toBe('binding');
    await runtime.providers.midnightProvider.submitTx(finalized);
    expect(fake.calls.submit).toHaveBeenCalledWith(expect.objectContaining({ tag: 'binding' }));

    await runtime.stop();
    await runtime.stop();
    expect(fake.calls.stop).toHaveBeenCalledOnce();
  });

  it('accepts bracketed IPv6 loopback without weakening the HTTPS boundary', async () => {
    const fake = fakeWallet();
    const runtime = await startMidnightIssuerRuntime(
      { ...config(), proofServerUrl: 'http://[::1]:6300' },
      {
        createWallet: async () => fake.wallet,
        setNetworkId: vi.fn(),
        createPublicDataProvider: () => ({}) as never,
        createZkConfigProvider: () => ({}) as never,
        createProofProvider: () => ({}) as never,
        transactionCodec: codec(),
        createExecutor: () => ({}) as CredentialRegistryV1Executor,
      },
    );

    await runtime.stop();
    expect(fake.calls.start).toHaveBeenCalledOnce();
    expect(fake.calls.stop).toHaveBeenCalledOnce();

    await expect(
      startMidnightIssuerRuntime(
        { ...config(), proofServerUrl: 'http://192.0.2.1:6300' },
        { createWallet: async () => fake.wallet },
      ),
    ).rejects.toThrow('Non-local proof servers must use HTTPS');
  });
});
