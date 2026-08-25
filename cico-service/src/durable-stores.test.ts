import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  type CivicCredentialIssuanceRequest,
  type CredentialRegistryV1Executor,
  isoNumericCountry,
} from 'midnight-referendum-api';
import { describe, expect, it } from 'vitest';
import { CredentialIssuerService } from './credential-issuer-service.js';
import {
  DurableStoreConflictError,
  FileCanonicalReceiptStore,
  FileCredentialIssuanceStore,
  FileEvidenceAuthorizationStore,
} from './durable-stores.js';

const receipt = {
  status: 'confirmed' as const,
  action: 'credential' as const,
  network: 'preview' as const,
  transactionId: 'tx-1',
  transactionHash: 'hash-1',
  contractAddress: 'contract-1',
  circuit: 'addCredential',
  blockHeight: 7,
  blockHash: 'block-1',
  blockTimestamp: '2026-08-24T12:00:00.000Z',
};

async function tempState(): Promise<{ directory: string; file: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'cico-store-'));
  return { directory, file: join(directory, 'state.json') };
}

describe('FileEvidenceAuthorizationStore', () => {
  it('atomically allows one authorization and rejects a different enrollment', async () => {
    const { directory, file } = await tempState();
    try {
      const store = new FileEvidenceAuthorizationStore(file);
      const outcomes = await Promise.all(
        Array.from({ length: 12 }, () => store.claim('opaque-auth', 'enrollment-1', 'material-1')),
      );
      expect(outcomes).toEqual(new Array(12).fill(true));
      await expect(store.claim('opaque-auth', 'enrollment-2', 'material-1')).resolves.toBe(false);
      await expect(store.claim('opaque-auth', 'enrollment-1', 'material-2')).resolves.toBe(false);

      const onDisk = await readFile(file, 'utf8');
      expect(onDisk).not.toContain('opaque-auth');
      expect(onDisk).not.toContain('material-1');
      expect(onDisk).not.toContain('enrollment-1');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('recovers state after a new instance starts', async () => {
    const { directory, file } = await tempState();
    try {
      await expect(
        new FileEvidenceAuthorizationStore(file).claim('auth', 'enrollment'),
      ).resolves.toBe(true);
      const restarted = new FileEvidenceAuthorizationStore(file);
      await expect(restarted.claim('auth', 'enrollment')).resolves.toBe(true);
      await expect(restarted.claim('auth', 'other-enrollment')).resolves.toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('recovers a stale lock left by a crashed process on startup', async () => {
    const { directory, file } = await tempState();
    const lockFile = `${file}.lock`;
    try {
      await writeFile(lockFile, JSON.stringify({ pid: 99_999_999 }), { mode: 0o600 });
      const stale = new Date(Date.now() - 60_000);
      await utimes(lockFile, stale, stale);
      const store = new FileEvidenceAuthorizationStore({
        filePath: file,
        staleLockMs: 10,
      });
      await expect(store.claim('crashed-process-token', 'enrollment')).resolves.toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('FileCanonicalReceiptStore', () => {
  it('persists a sanitized canonical receipt and resolves it after restart', async () => {
    const { directory, file } = await tempState();
    try {
      const store = new FileCanonicalReceiptStore(file);
      await store.put({ ...receipt, secret: 'must-not-persist' } as typeof receipt & {
        secret: string;
      });
      const restarted = new FileCanonicalReceiptStore(file);
      await expect(restarted.get('tx-1')).resolves.toEqual(receipt);
      await expect(restarted.getCanonicalReceipt('missing')).resolves.toBeNull();
      expect(await readFile(file, 'utf8')).not.toContain('must-not-persist');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('is idempotent for the same transaction and conflicts on changed public data', async () => {
    const { directory, file } = await tempState();
    try {
      const store = new FileCanonicalReceiptStore(file);
      await store.put(receipt);
      await store.save({ ...receipt });
      await expect(store.put({ ...receipt, blockHeight: 8 })).rejects.toBeInstanceOf(
        DurableStoreConflictError,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('uses restrictive permissions where the platform supports them', async () => {
    const { directory, file } = await tempState();
    try {
      await new FileCanonicalReceiptStore(file).put(receipt);
      const fileMode = (await stat(file)).mode & 0o777;
      const directoryMode = (await stat(directory)).mode & 0o777;
      if (process.platform !== 'win32') {
        expect(fileMode).toBe(0o600);
        expect(directoryMode).toBe(0o700);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('lets the issuer replay the exact result after a service restart', async () => {
    const { directory } = await tempState();
    try {
      let additions = 0;
      const executor = {
        join: async () => undefined,
        addCredential: async () => {
          additions += 1;
          return receipt;
        },
      } as unknown as CredentialRegistryV1Executor;
      const evidence = new FileEvidenceAuthorizationStore(join(directory, 'evidence.json'));
      const issuanceFile = join(directory, 'issuance.json');
      const request: CivicCredentialIssuanceRequest = {
        enrollmentId: 'restart-enrollment',
        provider: 'rarimo',
        evidenceAuthorization: 'restart-opaque-evidence',
        holderBinding: new Uint8Array(32).fill(1),
        claims: {
          issuerId: 'cico-rarimo-preview',
          country: isoNumericCountry('032'),
          ageClass: '18-plus',
          assurance: 'document-nfc',
          credentialEpoch: 7,
          validFrom: '2026-08-24T12:00:00.000Z',
          validUntil: '2026-08-25T12:00:00.000Z',
        },
      };
      const makeIssuer = (blind: number) =>
        new CredentialIssuerService({
          executor,
          registryContractAddress: receipt.contractAddress,
          issuerSecret: new Uint8Array(32).fill(9),
          evidenceAuthorizations: evidence,
          validateEvidenceAuthorization: async () => true,
          issuanceStore: new FileCredentialIssuanceStore(issuanceFile),
          randomBytes: () => new Uint8Array(32).fill(blind),
        });

      const first = await makeIssuer(2).issueCredential(request);
      const second = await makeIssuer(9).issueCredential(request);
      expect(second).toEqual(first);
      expect(additions).toBe(1);

      const changed = { ...request, holderBinding: new Uint8Array(32).fill(4) };
      await expect(makeIssuer(3).issueCredential(changed)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      expect(await readFile(issuanceFile, 'utf8')).not.toContain('restart-opaque-evidence');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects non-Preview receipts at the durable boundary', async () => {
    const { directory, file } = await tempState();
    try {
      await expect(
        new FileCanonicalReceiptStore(file).put({ ...receipt, network: 'mainnet' }),
      ).rejects.toThrow('canonical confirmed public receipt');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
