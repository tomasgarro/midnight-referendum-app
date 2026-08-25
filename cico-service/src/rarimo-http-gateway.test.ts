import {
  deriveRarimoIssuanceEventData,
  isoNumericCountry,
  type RarimoVerificationRequest,
  type RarimoVerificationStatus,
} from 'midnight-referendum-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RarimoHttpGatewayError } from './rarimo-http-gateway.js';
import { RarimoHttpVerificationGateway } from './rarimo-http-gateway.js';

const enrollmentId = '01'.repeat(16);
const holderBinding = new Uint8Array(32).fill(2);
const boundEventData = deriveRarimoIssuanceEventData(enrollmentId, holderBinding);
const boundEventDataHex = Array.from(boundEventData, (byte) =>
  byte.toString(16).padStart(2, '0'),
).join('');

const request: RarimoVerificationRequest = {
  requestId: 'request-id',
  eventId: '7',
  eventData: `0x${boundEventDataHex}`,
  eventDataDecimal: BigInt(`0x${boundEventDataHex}`).toString(10),
  selector: '35361',
  birthDateLowerBound: '0x303030303030',
  birthDateUpperBound: '0x3230303830383234',
  identityCounterLowerBound: '0',
  identityCounterUpperBound: '1',
  expirationDateLowerBound: '0x3230323630383234',
  expirationDateUpperBound: '0x393939393939',
  timestampLowerBound: '0',
  timestampUpperBound: '1787594400',
};

const contentType = { 'content-type': 'application/vnd.api+json' };
const birthDateUpperBound = BigInt(request.birthDateUpperBound).toString(10);
const expirationDateLowerBound = BigInt(request.expirationDateLowerBound).toString(10);

function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = contentType,
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers,
  });
}

function proofBody(): unknown {
  const publicSignals = Array.from({ length: 23 }, () => '0');
  publicSignals[6] = '5589842'; // UKR, big-endian ASCII.
  publicSignals[9] = request.eventId;
  publicSignals[10] = request.eventDataDecimal;
  publicSignals[12] = request.selector;
  publicSignals[15] = request.timestampUpperBound;
  publicSignals[17] = request.identityCounterUpperBound;
  publicSignals[19] = birthDateUpperBound;
  publicSignals[20] = expirationDateLowerBound;
  return {
    data: {
      id: 'user-hash',
      type: 'get_proof',
      attributes: {
        proof: {
          proof: {
            pi_a: ['1', '2', '3'],
            pi_b: [
              ['1', '2'],
              ['3', '4'],
              ['5', '6'],
            ],
            pi_c: ['7', '8', '9'],
            protocol: 'groth16',
          },
          pub_signals: publicSignals,
        },
      },
    },
  };
}

function makeGateway(fetcher: typeof fetch): RarimoHttpVerificationGateway {
  return new RarimoHttpVerificationGateway({
    baseUrl: 'https://verificator.example',
    fetcher,
    proofRequestBaseUrl: 'https://app.rarime.com/external',
  });
}

afterEach(() => vi.restoreAllMocks());

describe('RarimoHttpVerificationGateway', () => {
  it('maps the documented request, status, evidence, and deletion lifecycle', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith('/v2/private/verification-link')) {
        return response({
          data: {
            id: request.requestId,
            type: 'verification_link',
            attributes: {
              get_proof_params:
                'https://verificator.example/integrations/verificator-svc/public/proof-params/user-hash',
            },
          },
        });
      }
      if (url.endsWith('/private/verification-status/request-id')) {
        return response({
          data: {
            id: request.requestId,
            type: 'user_status',
            attributes: { status: 'verified' satisfies RarimoVerificationStatus },
          },
        });
      }
      if (url.endsWith('/private/proof/request-id')) return response(proofBody());
      if (url.endsWith('/private/user/request-id')) return response(undefined, 204, {});
      throw new Error(`unexpected URL ${url}`);
    });
    const gateway = makeGateway(fetcher);

    const link = await gateway.createVerificationRequest(request);
    expect(link).toEqual({
      requestId: request.requestId,
      userIdHash: 'user-hash',
      proofParamsUrl:
        'https://verificator.example/integrations/verificator-svc/public/proof-params/user-hash',
      proofRequestUrl:
        'https://app.rarime.com/external?type=proof-request&proof_params_url=https%3A%2F%2Fverificator.example%2Fintegrations%2Fverificator-svc%2Fpublic%2Fproof-params%2Fuser-hash',
    });
    expect(await gateway.getVerificationStatus(request.requestId)).toBe('verified');
    const evidence = await gateway.getVerifiedEvidence(request.requestId);
    expect(evidence).toMatchObject({
      requestId: request.requestId,
      userIdHash: 'user-hash',
      eventId: request.eventId,
      eventDataDecimal: request.eventDataDecimal,
      selector: request.selector,
      citizenshipAlpha3: 'UKR',
      adultPredicateSatisfied: true,
    });
    expect(evidence?.evidenceAuthorization).toMatch(/^rarimo-evidence-v1:[0-9a-f]{64}$/u);
    expect(JSON.stringify(evidence)).not.toMatch(/pi_a|pi_b|pi_c|pub_signals|passport|mrz|nfc/i);
    if (!evidence) throw new Error('expected verified evidence');
    const issuance = {
      enrollmentId,
      provider: 'rarimo' as const,
      evidenceAuthorization: evidence.evidenceAuthorization,
      holderBinding,
      claims: {
        issuerId: 'cico-rarimo-preview',
        country: isoNumericCountry('804'),
        ageClass: '18-plus' as const,
        assurance: 'document-nfc' as const,
        credentialEpoch: 7,
        validFrom: '2026-08-24T12:00:00.000Z',
        validUntil: '2026-08-25T12:00:00.000Z',
      },
    };
    const policy = {
      issuerId: 'cico-rarimo-preview',
      credentialEpoch: 7,
      credentialTtlMs: 24 * 60 * 60 * 1_000,
      countryMapper: {
        fromAlpha3: (value: string) =>
          value.toUpperCase() === 'UKR' ? isoNumericCountry('804') : undefined,
        toAlpha3: () => undefined,
      },
      maximumIssuanceDelayMs: Number.MAX_SAFE_INTEGER,
      clockSkewMs: Number.MAX_SAFE_INTEGER,
    };
    expect(await gateway.validateCredentialIssuance(issuance, policy)).toBe(true);
    expect(
      await gateway.validateCredentialIssuance(
        { ...issuance, claims: { ...issuance.claims, country: isoNumericCountry('032') } },
        policy,
      ),
    ).toBe(false);
    const altered = [
      { ...issuance, evidenceAuthorization: 'arbitrary-unverified-token' },
      { ...issuance, enrollmentId: 'different-enrollment' },
      { ...issuance, holderBinding: new Uint8Array(32).fill(3) },
      { ...issuance, claims: { ...issuance.claims, issuerId: 'attacker' } },
      { ...issuance, claims: { ...issuance.claims, ageClass: 'unknown' as const } },
      { ...issuance, claims: { ...issuance.claims, assurance: 'passport-native' as const } },
      { ...issuance, claims: { ...issuance.claims, credentialEpoch: 8 } },
      {
        ...issuance,
        claims: { ...issuance.claims, validUntil: '2026-08-26T12:00:00.000Z' },
      },
    ];
    for (const candidate of altered) {
      expect(await gateway.validateCredentialIssuance(candidate, policy)).toBe(false);
    }
    await gateway.deleteVerification(request.requestId);
    expect(await gateway.validateCredentialIssuance(issuance, policy)).toBe(false);

    const body = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
    expect((body.data as Record<string, unknown>).id).toBe(request.requestId);
    expect(
      ((body.data as Record<string, unknown>).attributes as Record<string, unknown>).event_data,
    ).toBe(request.eventData);
    expect(calls.at(-1)?.init?.method).toBe('DELETE');
  });

  it('preserves upstream failure statuses and treats a missing proof as not-yet-evidence', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/v2/private/verification-link')) {
        return response({
          data: {
            id: request.requestId,
            type: 'verification_link',
            attributes: { get_proof_params: 'https://verificator.example/proof-params/hash' },
          },
        });
      }
      if (url.endsWith('/private/verification-status/request-id')) {
        return response({
          data: {
            id: request.requestId,
            type: 'user_status',
            attributes: { status: 'uniqueness_check_failed' },
          },
        });
      }
      if (url.endsWith('/private/proof/request-id')) return response(undefined, 404, contentType);
      throw new Error('unexpected URL');
    });
    const gateway = makeGateway(fetcher);
    await gateway.createVerificationRequest(request);
    expect(await gateway.getVerificationStatus(request.requestId)).toBe('uniqueness_check_failed');
    expect(await gateway.getVerifiedEvidence(request.requestId)).toBeNull();
  });

  it('fails closed on malformed content type and proof schema', async () => {
    const badContentType = makeGateway(
      vi.fn(async () =>
        response(
          { data: { id: request.requestId, type: 'verification_link', attributes: {} } },
          200,
          { 'content-type': 'text/plain' },
        ),
      ),
    );
    await expect(badContentType.createVerificationRequest(request)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });

    const malformed = makeGateway(
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).endsWith('/v2/private/verification-link')) {
          return response({
            data: {
              id: request.requestId,
              type: 'verification_link',
              attributes: { get_proof_params: 'https://verificator.example/proof-params/hash' },
            },
          });
        }
        return response({ data: { id: 'hash', type: 'get_proof', attributes: { proof: {} } } });
      }),
    );
    await malformed.createVerificationRequest(request);
    await expect(malformed.getVerifiedEvidence(request.requestId)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
  });

  it('pins the public proof-params origin and requires explicit split-origin configuration', async () => {
    const fetcher = vi.fn(async () =>
      response({
        data: {
          id: request.requestId,
          type: 'verification_link',
          attributes: { get_proof_params: 'https://public.example/proof-params/hash' },
        },
      }),
    );
    await expect(makeGateway(fetcher).createVerificationRequest(request)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
    const allowed = new RarimoHttpVerificationGateway({
      baseUrl: 'https://verificator.example',
      proofParamsAllowedOrigins: ['https://public.example'],
      fetcher,
    });
    await expect(allowed.createVerificationRequest(request)).resolves.toMatchObject({
      userIdHash: 'hash',
    });
  });

  it('aborts a request after the configured timeout', async () => {
    const fetcher = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const timed = new RarimoHttpVerificationGateway({
      baseUrl: 'https://verificator.example',
      fetcher,
      timeoutMs: 5,
    });
    await expect(timed.createVerificationRequest(request)).rejects.toMatchObject({
      code: 'TIMEOUT',
    } satisfies Partial<RarimoHttpGatewayError>);
  });
});
