import { describe, expect, it } from 'vitest';
import { toRuntimePolls } from '../App';
import type { PassportV2RuntimeReferendum } from '../integration/passport-v2-runtime-config';

function policy(value: string | null): Uint8Array {
  const result = new Uint8Array(32);
  if (value) result.set(new TextEncoder().encode(value));
  return result;
}

function referendum(
  overrides: Partial<PassportV2RuntimeReferendum['config']> & {
    referendumId: string;
    contractAddress: string;
    title: string;
    question: string;
  },
): PassportV2RuntimeReferendum {
  const { referendumId, contractAddress, title, question, ...configOverrides } = overrides;
  return {
    referendumId,
    contractAddress,
    title,
    question,
    config: {
      registry: {} as PassportV2RuntimeReferendum['config']['registry'],
      eventId: new Uint8Array(32),
      organizerKey: new Uint8Array(32),
      rootPublisherKey: new Uint8Array(32).fill(1),
      opensAtUnix: 1_000n,
      enrollmentClosesAtUnix: 2_000n,
      closesAtUnix: 3_000n,
      revealClosesAtUnix: 4_000n,
      countryPolicy: new Uint8Array(32),
      countryPolicyEnabled: false,
      minimumAssurance: 0n,
      requireAdult: false,
      validityReference: 0n,
      network: 'preview',
      ...configOverrides,
    },
  };
}

describe('runtime poll catalog projection', () => {
  it('uses catalog identity and copy without retaining static fixture consultations', () => {
    const polls = toRuntimePolls([
      referendum({
        referendumId: 'runtime-policy-01',
        contractAddress: '0xruntime-contract',
        title: 'Consulta publicada en runtime',
        question: '¿Aprobás la política publicada?',
      }),
    ]);

    expect(polls).toHaveLength(1);
    expect(polls[0]).toMatchObject({
      id: 'runtime-policy-01',
      title: 'Consulta publicada en runtime',
      question: '¿Aprobás la política publicada?',
      runtimeScope: 'global',
      runtimeContractAddress: '0xruntime-contract',
    });
    expect(polls[0]?.id).not.toBe('tierras-rurales');
  });

  it('projects country policies for country routing while preserving the runtime address', () => {
    const polls = toRuntimePolls([
      {
        ...referendum({
          referendumId: 'runtime-policy-argentina',
          contractAddress: '0xcountry-contract',
          title: 'Consulta territorial',
          question: '¿Aprobás esta consulta?',
        }),
        config: {
          ...referendum({
            referendumId: 'runtime-policy-argentina',
            contractAddress: '0xcountry-contract',
            title: 'Consulta territorial',
            question: '¿Aprobás esta consulta?',
          }).config,
          countryPolicy: policy('032'),
          countryPolicyEnabled: true,
        },
      },
    ]);

    expect(polls[0]).toMatchObject({
      id: 'runtime-policy-argentina',
      runtimeScope: 'country',
      runtimeCountryCode: 'AR',
      runtimeContractAddress: '0xcountry-contract',
    });
  });
});
