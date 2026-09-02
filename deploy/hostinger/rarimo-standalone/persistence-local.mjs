const privateBase = process.env.RARIMO_PRIVATE_BASE_URL ?? 'http://127.0.0.1:28080';
const mode = process.argv[2];
const requestId = 'deployment-persistence-smoke';
const requestUrl = `${privateBase}/integrations/verificator-svc/v2/private/verification-link`;
const statusUrl = `${privateBase}/integrations/verificator-svc/private/verification-status/${requestId}`;
const cleanupUrl = `${privateBase}/integrations/verificator-svc/private/user/${requestId}`;

if (mode === 'prepare') {
  await fetch(cleanupUrl, { method: 'DELETE' }).catch(() => undefined);
  const response = await jsonApi(requestUrl, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        id: requestId,
        type: 'advanced_verification',
        attributes: {
          event_id:
            process.env.RARIMO_EVENT_ID ??
            '1379135808091333277697990941625042405356244383196951899506166583677958579369',
          selector: '35361',
          identity_counter_lower_bound: 0,
          identity_counter_upper_bound: 1,
          birth_date_lower_bound: '0x303030303030',
          birth_date_upper_bound: '0x303030303030',
          event_data: `0x${'01'.repeat(32)}`,
          expiration_date_lower_bound: '0x303030303030',
          expiration_date_upper_bound: '0x303030303030',
          timestamp_lower_bound: 0,
          timestamp_upper_bound: Number.parseInt(
            process.env.RARIMO_ALLOWED_IDENTITY_TIMESTAMP ?? '1788306168',
            10,
          ),
        },
      },
    }),
  });
  assert(response.response.status === 200, `prepare returned ${response.response.status}`);
  assert(response.body?.data?.id === requestId, 'prepare response ID is not request-bound');
  console.log(JSON.stringify({ result: 'prepared', status: 200 }));
} else if (mode === 'verify-cleanup') {
  const status = await jsonApi(statusUrl);
  assert(status.response.status === 200, `persisted status returned ${status.response.status}`);
  assert(status.body?.data?.attributes?.status === 'not_verified', 'persisted request changed state');

  const cleanup = await fetch(cleanupUrl, { method: 'DELETE' });
  assert(cleanup.status === 204, `cleanup returned ${cleanup.status}`);
  const afterDelete = await fetch(statusUrl);
  assert(afterDelete.status === 404, `deleted request still exists (${afterDelete.status})`);
  console.log(
    JSON.stringify({ result: 'passed', survivedRestart: true, cleanup: 204, statusAfterCleanup: 404 }),
  );
} else {
  throw new Error('usage: node persistence-local.mjs <prepare|verify-cleanup>');
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
