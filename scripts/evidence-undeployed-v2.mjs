/** Reproducible, fail-closed Undeployed Passport-v2 evidence runner. */
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const composeFile = resolve(ROOT, 'docker-compose.undeployed.yml');
const relayEnvPath = resolve(ROOT, 'relayer/.env.undeployed');
const deploymentEnvPath = resolve(ROOT, '.env.v2.undeployed');
const manifestPath = resolve(ROOT, 'deploy/passport-v2/undeployed.manifest.json');
const transcriptPath = resolve(ROOT, 'deploy/passport-v2/undeployed-v2.transcript.json');
const transcriptMarkdownPath = resolve(ROOT, 'deploy/passport-v2/undeployed-v2.transcript.md');
const publicRelayOrigin = 'http://127.0.0.1:8790';
const internalRelayOrigin = 'http://127.0.0.1:8792';
const run = { startedAt: new Date().toISOString(), network: 'undeployed', steps: [] };
const trace = { paths: [], legacyPaths: [], concurrentResponses: [] };
let relayProcess;
let proxyServer;
let capturedAction;
let secrets = [];
let runtimeEnv = {};
let relayOutput = '';
let indexerRecoveryStarts = 0;

try {
  if (process.argv.includes('--help')) {
    console.log('npm run evidence:undeployed:v2');
    process.exit(0);
  }
  record('preflight', preflight());
  // A failed local run may leave a public journal behind. Each invocation
  // starts a new evidence identity while preserving the chain and PostgreSQL
  // history needed to test durable behavior.
  rmSync(manifestPath, { force: true });
  rmSync(transcriptPath, { force: true });
  rmSync(transcriptMarkdownPath, { force: true });
  rmSync(relayEnvPath, { force: true });
  rmSync(deploymentEnvPath, { force: true });
  const generated = generateRunEnvironment();
  secrets = generated.secrets;
  runtimeEnv = generated.environment;
  record('run-secrets', { generated: true, count: secrets.length });
  const proofServerReused = await endpointMatches('http://127.0.0.1:6300/version', '8.1.0');
  const composeServices = ['postgres', 'node', 'indexer'];
  if (!proofServerReused) composeServices.push('proof-server');
  command(
    'docker',
    ['compose', '-f', composeFile, 'up', '-d', ...composeServices],
    'Docker services',
  );
  record('proof-server-source', {
    reusedHealthyLocalService: proofServerReused,
    requiredVersion: '8.1.0',
    requiredProtocol: 'V2',
  });
  await waitForServices();
  record('service-health', await serviceHealth());
  command(npmCommand(), ['run', 'compile'], 'Legacy compatibility compilation');
  command(npmCommand(), ['run', 'compile:v2'], 'Compact v2 compilation');
  command(npmCommand(), ['run', 'build'], 'production build');
  assertCleanCheckout();
  command(npmCommand(), ['run', 'relayer:fund:undeployed'], 'Undeployed genesis funding');

  proxyServer = await startTraceProxy();
  relayProcess = await startRelay({ requireDust: true });
  record('relay-before-prepare', await getJson(`${publicRelayOrigin}/health`));
  await commandAsync(
    npmCommand(),
    ['run', 'deploy:undeployed'],
    'Registry/referendum preparation',
    {
      V2_EVIDENCE_PHASE: 'prepare',
    },
  );
  const prepared = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const referendumAddress = prepared.referenda?.[0]?.contractAddress;
  if (!/^[0-9a-f]{64}$/iu.test(referendumAddress ?? '')) {
    throw new Error('Preparation did not produce one exact referendum address');
  }
  updateRelayAllowlist(referendumAddress);
  await stopRelay();
  relayProcess = await startRelay({ requireDust: true });
  const dustValuationAt = isoWholeSecond(Date.now());
  const dustBefore = await getDustSnapshot(dustValuationAt);
  record('relay-policy', {
    network: 'undeployed',
    contractAddress: referendumAddress,
    circuit: 'castVote',
  });

  await commandAsync(npmCommand(), ['run', 'deploy:undeployed'], 'Atomic walletless lifecycle', {
    V2_EVIDENCE_PHASE: 'complete',
  });
  if (!capturedAction) throw new Error('No POST /v2/actions request crossed the trace proxy');
  const first = await waitForAction(capturedAction.actionId);
  if (first.status !== 'confirmed' || !first.transactionId) {
    throw new Error('The initial action did not reach an indexer-confirmed receipt');
  }

  await stopRelay();
  relayProcess = await startRelay();
  const retryResponse = await forwardCapturedAction(capturedAction);
  const recovered = await waitForAction(capturedAction.actionId);
  if (retryResponse.status >= 400 || recovered.transactionId !== first.transactionId) {
    throw new Error('Post-restart idempotency did not resolve to the original transaction');
  }
  const dustAfter = await getDustSnapshot(dustValuationAt);
  const concurrentIdempotent =
    trace.concurrentResponses.length === 2 &&
    trace.concurrentResponses.every(
      (response) =>
        [200, 202].includes(response.status) && response.actionId === capturedAction.actionId,
    );
  if (!concurrentIdempotent) throw new Error('Concurrent duplicate action requests diverged');
  if (trace.legacyPaths.length > 0) throw new Error('The active evidence path used a legacy relay');

  finalizeManifest({
    dustBefore: dustBefore.balance,
    dustAfter: dustAfter.balance,
    dustBeforeObservedAt: dustBefore.observedAt,
    dustAfterObservedAt: dustAfter.observedAt,
    dustValuationAt,
    transactionId: first.transactionId,
    relayStates: first.transitions,
  });
  record('relay-evidence', {
    submissionTransport: 'v2-actions',
    concurrentIdempotent,
    restartRecovered: true,
    transactionId: first.transactionId,
    networkPaths: [...new Set(trace.paths)],
    legacyRequests: 0,
  });
  run.status = 'complete';
} catch (error) {
  run.status = 'failed';
  run.error = error instanceof Error ? error.message : 'Undeployed evidence runner failed';
  process.exitCode = 1;
} finally {
  await stopRelay();
  if (proxyServer) await new Promise((resolveClose) => proxyServer.close(resolveClose));
  rmSync(relayEnvPath, { force: true });
  rmSync(deploymentEnvPath, { force: true });
  record('run-secret-cleanup', { persistentFiles: false });
  run.finishedAt = new Date().toISOString();
  writeTranscript(run);
}

function preflight() {
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  if (major !== 22) throw new Error(`Node 22 is required; found ${process.version}`);
  if (process.platform !== 'linux') {
    throw new Error('Run Undeployed evidence from Linux or WSL2');
  }
  assertCleanCheckout();
  command(
    'docker',
    ['compose', '-f', composeFile, 'config', '--quiet'],
    'Docker Compose preflight',
  );
  const content = readFileSync(composeFile, 'utf8');
  for (const version of ['proof-server:8.1.0', 'indexer-standalone:4.3.3', 'midnight-node:1.0.0']) {
    if (!content.includes(version)) throw new Error(`Pinned service is missing: ${version}`);
  }
  const compact = spawnSync('compact', ['compile', '--version'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const compactVersion = compact.status === 0 ? compact.stdout.trim() : '';
  if (compactVersion !== '0.31.1') {
    throw new Error(`Compact compiler 0.31.1 is required; found ${compactVersion || 'missing'}`);
  }
  return {
    node: process.version,
    dockerCompose: 'valid',
    compactCompiler: compactVersion,
  };
}

function assertCleanCheckout() {
  const gitStatus = spawnSync('git', ['status', '--porcelain'], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (gitStatus.status !== 0 || gitStatus.stdout.trim()) {
    throw new Error('Undeployed evidence requires a clean, committed checkout');
  }
}

function generateRunEnvironment() {
  const secret = () => randomBytes(32).toString('hex');
  const values = Array.from({ length: 10 }, secret);
  const [
    relayerSeed,
    actionSecret,
    issuerSecret,
    organizerSecret,
    holderSecret,
    holderBlind,
    credentialBlind,
    voteSalt,
    registryId,
    eventId,
  ] = values;
  const issuerId = Buffer.from('cico-fixture-issuer', 'utf8').toString('hex').padEnd(64, '0');
  const now = Date.now();
  return {
    secrets: values,
    environment: {
      RELAYER_SEED: relayerSeed,
      RELAYER_NETWORK_ID: 'undeployed',
      RELAYER_INDEXER_HTTP_URL: 'http://127.0.0.1:8088/api/v4/graphql',
      RELAYER_INDEXER_WS_URL: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
      RELAYER_NODE_URL: 'ws://127.0.0.1:9944',
      RELAYER_PROOF_SERVER_URL: 'http://127.0.0.1:6300',
      RELAYER_HOST: '127.0.0.1',
      RELAYER_PORT: '8790',
      RELAYER_ALLOWED_ORIGINS: 'http://localhost:4173',
      RELAYER_V2_CAPABILITY_SECRET: actionSecret,
      RELAYER_V2_ALLOWED_NETWORKS: 'undeployed',
      RELAYER_V2_ALLOWED_CONTRACTS: '',
      RELAYER_V2_ALLOWED_CIRCUITS: 'castVote',
      RELAYER_V2_DATABASE_URL: 'postgresql://v2_evidence:v2_evidence@127.0.0.1:5433/v2_evidence',
      RELAYER_V2_JOB_STORE_PATH: '.state/v2-actions-undeployed.json',
      RELAYER_LEGACY_API_ENABLED: 'false',
      V2_NETWORK_ID: 'undeployed',
      V2_ISSUER_ID: 'cico-fixture-issuer',
      V2_ISSUER_ID_HEX: issuerId,
      V2_REGISTRY_ID_HEX: registryId,
      V2_CREDENTIAL_EPOCH: '1',
      V2_ISSUER_ROLE_SECRET_HEX: issuerSecret,
      V2_ORGANIZER_ROLE_SECRET_HEX: organizerSecret,
      V2_FIXTURE_HOLDER_SECRET_HEX: holderSecret,
      V2_FIXTURE_HOLDER_BLIND_HEX: holderBlind,
      V2_FIXTURE_CREDENTIAL_BLIND_HEX: credentialBlind,
      V2_FIXTURE_COUNTRY: '032',
      V2_FIXTURE_AGE_CLASS: '18-plus',
      V2_FIXTURE_ASSURANCE: 'document-nfc',
      V2_FIXTURE_VALID_FROM: isoWholeSecond(now - 60_000),
      V2_FIXTURE_VALID_UNTIL: isoWholeSecond(now + 86_400_000),
      V2_FIXTURE_VOTE_SALT_HEX: voteSalt,
      V2_FIXTURE_VOTE_CHOICE: 'YES',
      V2_REFERENDUM_ID: 'undeployed:evidence:v2',
      V2_EVENT_ID_HEX: eventId,
      V2_API_URL: 'http://127.0.0.1:8791',
    },
  };
}

async function startRelay({ requireDust = false } = {}) {
  relayOutput = '';
  const child = spawn(
    process.execPath,
    ['--env-file-if-exists=relayer/.env.undeployed', 'relayer/dist/server.js'],
    {
      cwd: ROOT,
      env: { ...process.env, ...runtimeEnv, RELAYER_PORT: '8792' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  child.stdout?.on('data', (chunk) => appendRelayOutput(chunk));
  child.stderr?.on('data', (chunk) => appendRelayOutput(chunk));
  child.once('exit', (code) => {
    if (relayProcess === child && code && code !== 0) {
      run.relayFailure = redact(relayOutput);
    }
  });
  await waitForRelayReady(requireDust);
  return child;
}

async function waitForRelayReady(requireDust) {
  const deadline = Date.now() + 180_000;
  for (;;) {
    try {
      const health = await getJson(`${internalRelayOrigin}/health`);
      if (health.synced && (!requireDust || BigInt(health.dustBalance ?? '0') > 0n)) return;
    } catch {}
    if (Date.now() > deadline) {
      throw new Error(
        requireDust
          ? 'Timed out waiting for a synced relay wallet with DUST'
          : 'Timed out waiting for the relay wallet to sync',
      );
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
}

async function stopRelay() {
  if (!relayProcess) return;
  const child = relayProcess;
  if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  if (child.exitCode === null) {
    await Promise.race([
      new Promise((resolveExit) => child.once('exit', resolveExit)),
      new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000)),
    ]);
  }
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await new Promise((resolveExit) => child.once('exit', resolveExit));
  }
  relayProcess = undefined;
}

async function startTraceProxy() {
  const server = createServer((request, response) => {
    void (async () => {
      const requestUrl = new URL(request.url ?? '/', publicRelayOrigin);
      const path = requestUrl.pathname;
      trace.paths.push(path);
      if (path === '/balance' || path === '/submit') {
        trace.legacyPaths.push(path);
        response.writeHead(409, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'legacy_transport_forbidden' }));
        return;
      }
      const body = await readBody(request);
      const captured = {
        method: request.method ?? 'GET',
        path: `${requestUrl.pathname}${requestUrl.search}`,
        headers: safeForwardHeaders(request.headers),
        body,
      };
      if (request.method === 'POST' && path === '/v2/actions' && !capturedAction) {
        const parsed = JSON.parse(body);
        capturedAction = { ...captured, actionId: parsed.actionId };
        const results = await Promise.all([
          forwardCapturedAction(capturedAction),
          forwardCapturedAction(capturedAction),
        ]);
        trace.concurrentResponses = results.map(({ status, body: resultBody }) => {
          let actionId = null;
          try {
            actionId = JSON.parse(resultBody).actionId ?? null;
          } catch {}
          return { status, actionId };
        });
        sendForwarded(response, results[0]);
        return;
      }
      sendForwarded(response, await forwardCapturedAction(captured));
    })().catch((error) => {
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({ error: 'trace_proxy_failed', detail: String(error?.message ?? error) }),
      );
    });
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(8790, '127.0.0.1', resolveListen);
  });
  return server;
}

async function forwardCapturedAction(request) {
  const response = await fetch(`${internalRelayOrigin}${request.path}`, {
    method: request.method,
    headers: request.headers,
    ...(request.body ? { body: request.body } : {}),
  });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  };
}

function safeForwardHeaders(headers) {
  const allowed = [
    'accept',
    'authorization',
    'content-type',
    'idempotency-key',
    'x-action-capability',
    'x-request-hash',
  ];
  return Object.fromEntries(
    allowed.flatMap((key) => (headers[key] ? [[key, String(headers[key])]] : [])),
  );
}

function sendForwarded(response, forwarded) {
  response.writeHead(forwarded.status, {
    'content-type': forwarded.headers['content-type'] ?? 'application/json',
    'cache-control': 'no-store',
  });
  response.end(forwarded.body);
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function waitForAction(actionId) {
  const deadline = Date.now() + 180_000;
  for (;;) {
    const response = await fetch(
      `${internalRelayOrigin}/v2/actions/${encodeURIComponent(actionId)}`,
    );
    if (response.ok) {
      const job = await response.json();
      if (['confirmed', 'failed', 'recovery_required'].includes(job.status)) return job;
    }
    if (Date.now() > deadline)
      throw new Error('Timed out waiting for the canonical action receipt');
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
}

function finalizeManifest({
  dustBefore,
  dustAfter,
  dustBeforeObservedAt,
  dustAfterObservedAt,
  dustValuationAt,
  transactionId,
  relayStates,
}) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const before = BigInt(dustBefore);
  const after = BigInt(dustAfter);
  if (after > before) throw new Error('DUST accounting increased across the sponsored action');
  if (after === before) throw new Error('The sponsored action did not account for a DUST spend');
  const requiredRelayStates = [
    'authorized',
    'validated',
    'dust_reserved',
    'finalized',
    'submitted',
    'indexer_pending',
    'confirmed',
  ];
  if (
    !Array.isArray(relayStates) ||
    !requiredRelayStates.every((state, index) => relayStates[index] === state)
  ) {
    throw new Error('The durable relay journal did not record the required state sequence');
  }
  manifest.dust = {
    before: dustBefore,
    after: dustAfter,
    spent: String(before - after),
    beforeObservedAt: dustBeforeObservedAt,
    afterObservedAt: dustAfterObservedAt,
    valuationAt: dustValuationAt,
    accounted: true,
  };
  manifest.relay = {
    ...manifest.relay,
    states: relayStates,
    accepted: true,
    duplicateResolved: true,
    concurrentIdempotent: true,
    restartRecovered: true,
  };
  manifest.action.transactionId = transactionId;
  manifest.status = 'complete';
  delete manifest.manifestDigest;
  manifest.manifestDigest = sha256(stableJson(manifest));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  command(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { readFileSync } from 'node:fs'; import { validatePassportV2DeploymentManifest } from './api/dist/index.js'; validatePassportV2DeploymentManifest(JSON.parse(readFileSync(${JSON.stringify(manifestPath)}, 'utf8')));`,
    ],
    'complete manifest validation',
  );
}

function updateRelayAllowlist(address) {
  runtimeEnv.RELAYER_V2_ALLOWED_CONTRACTS = address;
}

function command(executable, args, label, extraEnv = {}) {
  const result = spawnSync(executable, args, {
    cwd: ROOT,
    env: { ...process.env, ...runtimeEnv, ...extraEnv },
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  record(label, redact(`${result.stdout ?? ''}\n${result.stderr ?? ''}`));
  if (result.error || result.status !== 0) throw new Error(`${label} failed`);
  return result;
}

async function commandAsync(executable, args, label, extraEnv = {}) {
  const child = spawn(executable, args, {
    cwd: ROOT,
    env: { ...process.env, ...runtimeEnv, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  child.stdout?.on('data', (chunk) => {
    output = appendBounded(output, chunk);
  });
  child.stderr?.on('data', (chunk) => {
    output = appendBounded(output, chunk);
  });
  const status = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolveExit(code));
  });
  record(label, redact(output));
  if (status !== 0) throw new Error(`${label} failed`);
}

async function waitForServices() {
  await waitForPostgres();
  await waitForHttp('http://127.0.0.1:9944/health', 120_000);
  await waitForHttp('http://127.0.0.1:6300/version', 120_000, '8.1.0');
  await waitForHttp('http://127.0.0.1:6300/proof-versions', 120_000, '["V2"]');
  await waitForStableIndexer();
}

async function waitForStableIndexer() {
  const deadline = Date.now() + 120_000;
  let consecutiveHealthyChecks = 0;
  for (;;) {
    try {
      const response = await fetch('http://127.0.0.1:8088/api/v4/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
        signal: AbortSignal.timeout(2_500),
      });
      consecutiveHealthyChecks = response.ok ? consecutiveHealthyChecks + 1 : 0;
      if (consecutiveHealthyChecks >= 3) return;
    } catch {
      consecutiveHealthyChecks = 0;
    }

    if (!indexerIsRunning()) {
      const restart = spawnSync('docker', ['compose', '-f', composeFile, 'up', '-d', 'indexer'], {
        cwd: ROOT,
        encoding: 'utf8',
        windowsHide: true,
      });
      if (restart.error || restart.status !== 0) {
        throw new Error('Failed to recover the Indexer after its startup race');
      }
      indexerRecoveryStarts += 1;
    }
    if (Date.now() > deadline) throw new Error('Timed out waiting for a stable Indexer');
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
}

function indexerIsRunning() {
  const result = spawnSync(
    'docker',
    ['compose', '-f', composeFile, 'ps', '--status', 'running', '--services'],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true },
  );
  return result.status === 0 && result.stdout.split(/\r?\n/u).includes('indexer');
}

async function waitForPostgres() {
  const deadline = Date.now() + 120_000;
  for (;;) {
    const result = spawnSync(
      'docker',
      [
        'compose',
        '-f',
        composeFile,
        'exec',
        '-T',
        'postgres',
        'pg_isready',
        '-U',
        'v2_evidence',
        '-d',
        'v2_evidence',
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    if (!result.error && result.status === 0) return;
    if (Date.now() > deadline) throw new Error('Timed out waiting for PostgreSQL');
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
}

async function serviceHealth() {
  return {
    node: await getJson('http://127.0.0.1:9944/health'),
    indexer: {
      status: 'GraphQL stable',
      recoveryStarts: indexerRecoveryStarts,
    },
    proofServerVersion: (await (await fetch('http://127.0.0.1:6300/version')).text()).trim(),
    proofProtocol: await getJson('http://127.0.0.1:6300/proof-versions'),
  };
}

async function waitForHttp(url, timeoutMs, expected) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_500) });
      const text = await response.text();
      if (response.ok && (expected === undefined || text.trim() === expected)) return;
    } catch {}
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${url}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
}

async function endpointMatches(url, expected) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_500) });
    return response.ok && (await response.text()).trim() === expected;
  } catch {
    return false;
  }
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function getDustSnapshot(valuationAt) {
  const url = new URL('/health', publicRelayOrigin);
  url.searchParams.set('dustAt', valuationAt);
  const observedAt = new Date().toISOString();
  const health = await getJson(url.toString());
  if (Date.parse(String(health.dustEvaluationTime ?? '')) !== Date.parse(valuationAt)) {
    throw new Error('Relay did not honor the fixed DUST valuation instant');
  }
  return { balance: String(health.dustBalance ?? '0'), observedAt };
}

function record(name, value) {
  run.steps.push({ name, completedAt: new Date().toISOString(), value });
}

function redact(value) {
  let result = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of secrets) result = result.split(secret).join('[REDACTED]');
  return result.replace(
    /(seed|secret|witness|proof|votesalt|capability)[=:]\s*[^\s,]+/giu,
    '$1=[REDACTED]',
  );
}

function appendRelayOutput(chunk) {
  relayOutput = appendBounded(relayOutput, chunk);
}

function appendBounded(previous, chunk) {
  const next = `${previous}${String(chunk)}`;
  return next.length > 16 * 1024 ? next.slice(-16 * 1024) : next;
}

function writeTranscript(value) {
  const safe = JSON.parse(redact(JSON.stringify(value)));
  safe.secretPolicy =
    'memory-only process environment; no generated secret files; raw actions and capabilities are memory-only';
  safe.networkTrace = {
    paths: [...new Set(trace.paths)],
    legacyRequests: trace.legacyPaths.length,
  };
  mkdirSync(resolve(transcriptPath, '..'), { recursive: true });
  writeFileSync(transcriptPath, `${JSON.stringify(safe, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  chmodSync(transcriptPath, 0o600);

  let manifest;
  try {
    manifest = JSON.parse(redact(readFileSync(manifestPath, 'utf8')));
  } catch {
    manifest = undefined;
  }
  writeFileSync(transcriptMarkdownPath, renderJuryTranscript(safe, manifest), {
    encoding: 'utf8',
    mode: 0o600,
  });
  chmodSync(transcriptMarkdownPath, 0o600);
}

function renderJuryTranscript(evidence, manifest) {
  const lines = [
    '# Undeployed Passport-v2 jury transcript',
    '',
    '> Sanitized local evidence. This is not Midnight Preview, live Passport consent, or physical NFC evidence.',
    '',
    '## Outcome',
    '',
    `- Status: ${markdownCell(evidence.status ?? 'unknown')}`,
    `- Network: ${markdownCell(evidence.network ?? 'unknown')}`,
    `- Started: ${markdownCell(evidence.startedAt ?? 'unknown')}`,
    `- Finished: ${markdownCell(evidence.finishedAt ?? 'unknown')}`,
    `- Reproduce: \`npm ci && npm run evidence:undeployed:v2\` from Linux/WSL with Docker running.`,
    '',
  ];

  if (manifest) {
    lines.push(
      '## Reproducible source and stack',
      '',
      `- Source commit: \`${markdownCell(manifest.source?.commit ?? 'missing')}\``,
      `- Source tree: \`${markdownCell(manifest.source?.tree ?? 'missing')}\``,
      `- Manifest digest: \`${markdownCell(manifest.manifestDigest ?? 'missing')}\``,
      `- Compact compiler: ${markdownCell(manifest.artifacts?.compactCompilerVersion ?? 'missing')}`,
      `- Midnight.js: ${markdownCell(manifest.artifacts?.midnightJsVersion ?? 'missing')}`,
      `- Node / indexer / proof server: ${markdownCell(manifest.services?.node?.version ?? 'missing')} / ${markdownCell(manifest.services?.indexer?.version ?? 'missing')} / ${markdownCell(manifest.services?.proofServer?.version ?? 'missing')}`,
      '',
      '## Public deployment bindings',
      '',
      '| Item | Public value |',
      '| --- | --- |',
      `| Registry contract | \`${markdownCell(manifest.registry?.contractAddress ?? 'missing')}\` |`,
      `| Frozen registry root | \`${markdownCell(manifest.registry?.frozenRootField ?? 'missing')}\` |`,
      `| Referendum contract | \`${markdownCell(manifest.referenda?.[0]?.contractAddress ?? 'missing')}\` |`,
      `| Registry binding | \`${markdownCell(manifest.referenda?.[0]?.registryContractBindingHex ?? 'missing')}\` |`,
      '',
      '## Indexer-confirmed lifecycle',
      '',
      '| Step | Status | Circuit | Transaction | Block |',
      '| --- | --- | --- | --- | ---: |',
    );
    for (const step of manifest.transcript?.steps ?? []) {
      lines.push(
        `| ${markdownCell(step.id)} | ${markdownCell(step.status)} | ${markdownCell(step.receipt?.circuit ?? '—')} | ${step.receipt?.transactionId ? `\`${markdownCell(step.receipt.transactionId)}\`` : '—'} | ${markdownCell(step.receipt?.blockHeight ?? '—')} |`,
      );
    }
    lines.push(
      '',
      `Canonical final state: **${manifest.lifecycle?.finalized ? 'FINALIZED' : 'NOT FINALIZED'}**. Replay rejected: **${manifest.lifecycle?.replayRejected ? 'yes' : 'no'}**.`,
      '',
      '## Atomic walletless relay',
      '',
      `- Submission transport: \`${markdownCell(manifest.submissionTransport ?? 'missing')}\``,
      `- Action ID: \`${markdownCell(manifest.action?.actionId ?? 'missing')}\``,
      `- Idempotency digest: \`${markdownCell(manifest.action?.idempotencyKeyDigest ?? 'missing')}\``,
      `- Confirmed transaction: \`${markdownCell(manifest.action?.transactionId ?? 'missing')}\``,
      `- Durable states: ${(manifest.relay?.states ?? []).map((state) => `\`${markdownCell(state)}\``).join(' → ') || 'missing'}`,
      `- Concurrent duplicate resolved once: **${manifest.relay?.concurrentIdempotent ? 'yes' : 'no'}**`,
      `- Post-restart retry recovered the same action: **${manifest.relay?.restartRecovered ? 'yes' : 'no'}**`,
      `- Legacy \`/balance\` or \`/submit\` requests: **${markdownCell(evidence.networkTrace?.legacyRequests ?? 'unknown')}**`,
      '',
      '## DUST accounting',
      '',
      `- Fixed valuation instant: ${markdownCell(manifest.dust?.valuationAt ?? 'missing')}`,
      `- Before / after: ${markdownCell(manifest.dust?.before ?? 'missing')} / ${markdownCell(manifest.dust?.after ?? 'missing')}`,
      `- Accounted spend: ${markdownCell(manifest.dust?.spent ?? 'missing')}`,
      '',
    );
  } else {
    lines.push(
      '## Manifest',
      '',
      'No readable runtime manifest was produced. This transcript is incomplete and cannot satisfy the release gate.',
      '',
    );
  }

  lines.push(
    '## Privacy boundary',
    '',
    '- Operator-only deployment, issuance, freeze, close, reveal, and finalize actions never traverse the public relay.',
    '- The public relay is allowlisted to the exact Undeployed network, referendum contract, and `castVote` circuit.',
    '- This transcript contains public addresses, transaction identifiers, state and digests only. It omits private keys, holder openings, witness/proof payloads, vote salt, raw transaction bodies, Passport profile data, and bearer capabilities.',
    `- Runtime secret policy: ${markdownCell(evidence.secretPolicy ?? 'missing')}.`,
    '',
    '## Remaining external gates',
    '',
    '- Real Passport HTTPS-origin consent and encrypted recovery.',
    '- Deployment of the same artifacts to Midnight Preview with independent funded identities.',
    '- Physical iOS/Android Rarimo NFC evidence.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function markdownCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ');
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isoWholeSecond(milliseconds) {
  return new Date(Math.floor(milliseconds / 1_000) * 1_000).toISOString().replace('.000Z', 'Z');
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(',')}}`;
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}
