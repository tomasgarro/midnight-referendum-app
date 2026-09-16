import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Real PHP request validation with a local outbox. No email leaves this test.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(tmpdir(), 'midnight-feedback-test-'));
const outbox = path.join(dir, 'outbox');
await copyFile(path.join(root, 'ui/public/api/feedback.php'), path.join(dir, 'feedback.php'));
const transport = path.join(dir, 'sendmail');
await writeFile(transport, `#!/bin/sh\ncat >> '${outbox}'\n`, { mode: 0o700 });
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
const server = spawn(
  'php',
  ['-d', `sendmail_path=${transport}`, '-S', `127.0.0.1:${port}`, '-t', dir],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
let startupError;
server.on('error', (error) => {
  startupError = error;
});
const url = `http://127.0.0.1:${port}/feedback.php`;
const payload = {
  message: 'Synthetic delivery validation only.',
  email: '',
  locale: 'en',
  website: '',
  requestId: '00000000-0000-4000-8000-000000000001',
};
const send = (body = payload, origin = 'https://midnight.vote') =>
  fetch(url, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (startupError) throw startupError;
    try {
      if ((await fetch(url)).status === 405) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'PHP server starts and rejects GET');
  assert.equal((await send(payload, 'https://untrusted.example')).status, 403);
  assert.equal((await send({ ...payload, message: 'short' })).status, 400);
  assert.equal(
    (await send({ ...payload, email: 'a@example.com\r\nBcc: victim@example.com' })).status,
    400,
  );
  assert.equal((await send({ ...payload, website: 'spam.example' })).status, 400);
  assert.equal((await send({ ...payload, message: 'x'.repeat(19000) })).status, 413);
  assert.equal((await send()).status, 202);
  const first = await readFile(outbox, 'utf8');
  assert.match(first, /To: contact@midnight.vote/);
  assert.match(first, /Synthetic delivery validation only/);
  assert.equal((await send()).status, 200);
  assert.equal(await readFile(outbox, 'utf8'), first, 'retry does not send twice');
  for (const n of ['2', '3'])
    assert.equal(
      (await send({ ...payload, requestId: payload.requestId.slice(0, -1) + n })).status,
      202,
    );
  assert.equal(
    (await send({ ...payload, requestId: payload.requestId.slice(0, -1) + '4' })).status,
    429,
  );
  console.log(
    'Feedback PHP: validation, fixed recipient, local delivery, deduplication and rate limits passed.',
  );
} finally {
  server.kill();
  if (server.exitCode === null && !startupError)
    await new Promise((resolve) => server.once('exit', resolve));
  await rm(
    path.join(tmpdir(), `midnight-feedback-${createHash('sha256').update(dir).digest('hex')}.json`),
    { force: true },
  );
  await rm(dir, { recursive: true, force: true });
}
