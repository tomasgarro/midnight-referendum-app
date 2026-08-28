import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { digestCapability, digestTransaction } from './v2-hash.js';
import { FileV2ActionStore, InMemoryV2ActionStore } from './v2-store.js';
import type { NewV2ActionJob, V2CapabilityReservation } from './v2-types.js';

const jobInput = (id: string): NewV2ActionJob => ({
  id,
  actionId: id,
  idempotencyKey: `idempotency-${id}`,
  capabilityDigest: digestCapability(`capability-${id}`),
  requestHash: digestCapability(`request-${id}`),
  txDigest: digestTransaction(`tx-${id}`),
  network: 'preview',
  contractAddress: 'contract-1',
  circuit: 'castVote',
  action: 'vote',
  now: '2026-01-01T00:00:00.000Z',
});

const capability = (id: string): V2CapabilityReservation => ({
  digest: digestCapability(`capability-${id}`),
  actionId: id,
  idempotencyKey: `idempotency-${id}`,
  requestHash: digestCapability(`request-${id}`),
  network: 'preview',
  contractAddress: 'contract-1',
  circuit: 'castVote',
  action: 'vote',
  expiresAt: 2_000,
});

describe('v2 action stores', () => {
  it.each([
    ['in-memory', () => new InMemoryV2ActionStore()],
    [
      'file',
      async () => {
        const directory = await mkdtemp(join(tmpdir(), 'midnight-relayer-v2-'));
        return { store: new FileV2ActionStore(join(directory, 'actions.json')), directory };
      },
    ],
  ])('holds one DUST lease through indexer_pending (%s)', async (_name, makeStore) => {
    const created = await makeStore();
    const store = 'store' in created ? created.store : created;
    const first = jobInput('action-1');
    const second = jobInput('action-2');
    await store.consumeCapability(capability('action-1'));
    await store.consumeCapability(capability('action-2'));
    await store.createOrGet(first);
    await store.createOrGet(second);
    await store.transition(first.id, 'authorized', { status: 'validated' });
    await store.transition(second.id, 'authorized', { status: 'validated' });
    await expect(store.reserveDust(first.id, 'dust-1')).resolves.toMatchObject({
      status: 'dust_reserved',
      dustReservationId: 'dust-1',
    });
    await store.transition(first.id, 'dust_reserved', { status: 'finalized' });
    await store.transition(first.id, 'finalized', { status: 'submitted', transactionId: 'tx-1' });
    await store.transition(first.id, 'submitted', { status: 'indexer_pending' });

    await expect(store.reserveDust(second.id, 'dust-2')).resolves.toBeNull();

    if ('directory' in created) {
      await rm(created.directory, { recursive: true, force: true });
    }
  });

  it('consumes a capability exactly once and persists only sanitized public receipts', async () => {
    const store = new InMemoryV2ActionStore();
    const input = jobInput('action-1');
    expect(await store.consumeCapability(capability('action-1'))).toBe(true);
    expect(await store.consumeCapability(capability('action-1'))).toBe(false);
    await store.createOrGet(input);

    const receipt = {
      status: 'confirmed' as const,
      action: 'vote' as const,
      network: 'preview' as const,
      transactionId: 'tx-1',
      transactionHash: 'hash-1',
      contractAddress: 'contract-1',
      circuit: 'castVote',
      blockHeight: 1,
      blockHash: 'block-1',
      blockTimestamp: '2026-01-01T00:00:00.000Z',
      secret: 'must-not-persist',
    };
    await store.transition(input.id, 'authorized', { status: 'confirmed', receipt });
    const persisted = await store.get(input.id);
    expect(persisted?.receipt).toBeDefined();
    expect(JSON.stringify(persisted)).not.toContain('must-not-persist');
  });

  it('file store survives a fresh store instance and keeps idempotency records', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'midnight-relayer-v2-'));
    const file = join(directory, 'actions.json');
    try {
      const input = jobInput('action-1');
      const first = new FileV2ActionStore(file);
      await first.consumeCapability(capability('action-1'));
      await first.createOrGet(input);
      const second = new FileV2ActionStore(file);
      await expect(second.getByIdempotencyKey(input.idempotencyKey)).resolves.toMatchObject({
        id: input.id,
        status: 'authorized',
      });
      expect(await second.consumeCapability(capability('action-1'))).toBe(false);
      expect(JSON.parse(await readFile(file, 'utf8')).jobs[input.id].txDigest).toBe(input.txDigest);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
