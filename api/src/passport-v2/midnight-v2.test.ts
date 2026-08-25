import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { describe, expect, it } from 'vitest';
import { Choice } from '../generated/referendum-v2/index.js';
import {
  assertReferendumRegistryBinding,
  choiceToGenerated,
  createCompiledCredentialRegistryV1,
  createCompiledReferendumV2,
  createFrozenCredentialRegistryReference,
} from './midnight-v2.js';

describe('Passport v2 compiled bindings', () => {
  it('keeps registry and referendum proving assets in separate namespaces', () => {
    expect(CompiledContract.getCompiledAssetsPath(createCompiledCredentialRegistryV1())).toBe(
      'managed/credential-registry-v1',
    );
    expect(CompiledContract.getCompiledAssetsPath(createCompiledReferendumV2())).toBe(
      'managed/referendum-v2',
    );
  });

  it('maps provider-neutral vote choices to the generated enum', () => {
    expect(choiceToGenerated('YES')).toBe(Choice.YES);
    expect(choiceToGenerated('NO')).toBe(Choice.NO);
    expect(choiceToGenerated('ABSTAIN')).toBe(Choice.ABSTAIN);
  });

  it('pins referendum deployment to one canonical frozen registry', () => {
    const registryId = new Uint8Array(32).fill(1);
    const issuerId = new Uint8Array(32).fill(2);
    const reference = createFrozenCredentialRegistryReference('registry-address', {
      registryId,
      issuerId,
      credentialEpoch: 7n,
      currentRoot: { field: 99n },
      frozenRoot: { field: 99n },
      frozen: true,
      credentialCount: 1n,
    });
    const binding = {
      registryId,
      issuerId,
      credentialEpoch: 7n,
      frozenCredentialRoot: { field: 99n },
    };
    expect(() => assertReferendumRegistryBinding(reference, binding)).not.toThrow();
    expect(() =>
      assertReferendumRegistryBinding(reference, {
        ...binding,
        frozenCredentialRoot: { field: 100n },
      }),
    ).toThrow('canonical frozen registry root');
    expect(() =>
      createFrozenCredentialRegistryReference('registry-address', {
        registryId,
        issuerId,
        credentialEpoch: 7n,
        currentRoot: { field: 99n },
        frozenRoot: { field: 99n },
        frozen: false,
        credentialCount: 1n,
      }),
    ).toThrow('canonically frozen');
    expect(() =>
      createFrozenCredentialRegistryReference('registry-address', {
        registryId,
        issuerId,
        credentialEpoch: 7n,
        currentRoot: { field: 100n },
        frozenRoot: { field: 99n },
        frozen: true,
        credentialCount: 1n,
      }),
    ).toThrow('current canonical root');
  });
});
