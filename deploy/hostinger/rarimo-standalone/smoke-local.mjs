import { randomBytes } from 'node:crypto';

const privateBase = process.env.RARIMO_PRIVATE_BASE_URL ?? 'http://127.0.0.1:28080';
const gatewayBase = process.env.RARIMO_GATEWAY_BASE_URL ?? 'http://127.0.0.1:28081';
const timestampUpperBound = Number.parseInt(
  process.env.RARIMO_ALLOWED_IDENTITY_TIMESTAMP ?? '1788306168',
  10,
);
const eventId =
  process.env.RARIMO_EVENT_ID ??
  '1379135808091333277697990941625042405356244383196951899506166583677958579369';

if (!Number.isSafeInteger(timestampUpperBound) || timestampUpperBound <= 0) {
  throw new Error('RARIMO_ALLOWED_IDENTITY_TIMESTAMP must be a positive integer');
}

const requestId = `deployment-smoke-${randomBytes(12).toString('hex')}`;
const eventData = `0x${randomBytes(32).toString('hex')}`;
const request = {
  data: {
    id: requestId,
    type: 'advanced_verification',
    attributes: {
      event_id: eventId,
      selector: '35361',
      identity_counter_lower_bound: 0,
      identity_counter_upper_bound: 1,
      birth_date_lower_bound: '0x303030303030',
      birth_date_upper_bound: '0x303030303030',
      event_data: eventData,
      expiration_date_lower_bound: '0x303030303030',
      expiration_date_upper_bound: '0x303030303030',
      timestamp_lower_bound: 0,
      timestamp_upper_bound: timestampUpperBound,
    },
  },
};

let created = false;
try {
  const create = await jsonApi(`${privateBase}/integrations/verificator-svc/v2/private/verification-link`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  assert(create.response.status === 200, `create returned ${create.response.status}`);
  assert(create.body?.data?.id === requestId, 'create response ID is not request-bound');
  assert(create.body?.data?.type === 'verification_link', 'create response type is unexpected');
  const proofParamsUrl = create.body?.data?.attributes?.get_proof_params;
  assert(typeof proofParamsUrl === 'string', 'create response omitted proof-params URL');
  created = true;

  const status = await jsonApi(
    `${privateBase}/integrations/verificator-svc/private/verification-status/${encodeURIComponent(requestId)}`,
  );
  assert(status.response.status === 200, `status returned ${status.response.status}`);
  assert(status.body?.data?.id === requestId, 'status response ID is not request-bound');
  assert(status.body?.data?.attributes?.status === 'not_verified', 'fresh request is not pending');

  const proofPath = new URL(proofParamsUrl).pathname;
  const publicProofParams = await fetch(`${gatewayBase}${proofPath}`);
  assert(publicProofParams.status === 200, `public proof parameters returned ${publicProofParams.status}`);

  const blockedPrivate = await fetch(
    `${gatewayBase}/integrations/verificator-svc/private/verification-status/${encodeURIComponent(requestId)}`,
  );
  assert(blockedPrivate.status === 404, `gateway exposed a private route (${blockedPrivate.status})`);

  const wrongCallbackMethod = await fetch(
    `${gatewayBase}/integrations/verificator-svc/public/callback/${encodeURIComponent(requestId)}`,
  );
  assert(wrongCallbackMethod.status === 404, `gateway accepted callback GET (${wrongCallbackMethod.status})`);

  const cleanup = await fetch(
    `${privateBase}/integrations/verificator-svc/private/user/${encodeURIComponent(requestId)}`,
    { method: 'DELETE' },
  );
  assert(cleanup.status === 204, `cleanup returned ${cleanup.status}`);
  created = false;

  const afterDelete = await fetch(
    `${privateBase}/integrations/verificator-svc/private/verification-status/${encodeURIComponent(requestId)}`,
  );
  assert(afterDelete.status === 404, `deleted request still exists (${afterDelete.status})`);

  console.log(
    JSON.stringify({
      result: 'passed',
      create: 200,
      status: 'not_verified',
      publicProofParams: 200,
      privateGatewayRoute: 404,
      callbackGet: 404,
      cleanup: 204,
      statusAfterCleanup: 404,
    }),
  );
} finally {
  if (created) {
    await fetch(
      `${privateBase}/integrations/verificator-svc/private/user/${encodeURIComponent(requestId)}`,
      { method: 'DELETE' },
    ).catch(() => undefined);
  }
}

async function jsonApi(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/vnd.api+json',
      ...(init.body === undefined ? {} : { 'content-type': 'application/vnd.api+json' }),
    },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
