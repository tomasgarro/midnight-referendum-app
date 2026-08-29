/**
 * Idempotently deploys the public Passport v2 vertical slice.
 *
 * The command deliberately uses the existing local/Preview relayer as a fee
 * provider, while issuer and organizer authority secrets remain independent
 * environment values. It writes only public constructor data, canonical
 * receipts, and ledger snapshots to the versioned manifest. Fixture holder
 * material is read from the environment and is never persisted or printed.
 *
 * Required build step (Linux/WSL):
 *   npm run compile:v2 && npm run build
 *
 * Required runtime values are documented by the V2_* names below. The same
 * command works against local `undeployed` services and Preview by selecting
 * RELAYER_NETWORK_ID in the corresponding relayer environment file.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import WebSocket from 'ws';

globalThis.WebSocket ??= WebSocket;

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const api = await import('../api/dist/index.js');
const { NodeZkConfigProvider } = await import(
  '@midnight-ntwrk/midnight-js-node-zk-config-provider'
);
const { httpClientProofProvider } = await import(
  '@midnight-ntwrk/midnight-js-http-client-proof-provider'
);
const { indexerPublicDataProvider } = await import(
  '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
);
const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
const { ShieldedCoinPublicKey, ShieldedEncryptionPublicKey } = await import(
  '@midnight-ntwrk/wallet-sdk-address-format'
);
const { firstValueFrom, filter, timeout } = await import('rxjs');
const { loadConfig } = await import('../relayer/dist/config.js');
const { balanceAndFinalize, startRelayerWallet } = await import('../relayer/dist/wallet.js');
const { UndeployedFixtureCapabilityIssuer } = await import(
  './undeployed-fixture-capability-issuer.mjs'
);

const relayer = loadConfig();

const networkId = optional('V2_NETWORK_ID', process.env.RELAYER_NETWORK_ID ?? 'undeployed');
if (networkId !== 'undeployed' && networkId !== 'preview') {
  fail('V2_NETWORK_ID must be undeployed or preview');
}
setNetworkId(networkId);
const evidencePhase = optional('V2_EVIDENCE_PHASE', 'complete');
if (!['prepare', 'complete'].includes(evidencePhase)) {
  fail('V2_EVIDENCE_PHASE must be prepare or complete');
}

const manifestPath = resolve(
  ROOT,
  optional('V2_MANIFEST_PATH', `deploy/passport-v2/${networkId}.manifest.json`),
);
const issuerId = optional('V2_ISSUER_ID', 'cico-fixture-issuer');
const issuerIdBytes = bytes32(required('V2_ISSUER_ID_HEX'));
if (!equalBytes(api.padBytes32(issuerId), issuerIdBytes)) {
  fail('V2_ISSUER_ID and V2_ISSUER_ID_HEX must encode the same issuer identifier');
}

const registryIdHex = normalizeHex(required('V2_REGISTRY_ID_HEX'));
const registryId = bytes32(registryIdHex);
const credentialEpoch = unsigned(required('V2_CREDENTIAL_EPOCH'), 64, 'V2_CREDENTIAL_EPOCH');
const issuerSecret = bytes32(required('V2_ISSUER_ROLE_SECRET_HEX'));
const organizerSecret = bytes32(required('V2_ORGANIZER_ROLE_SECRET_HEX'));
if (equalBytes(issuerSecret, organizerSecret)) {
  fail('V2 issuer and organizer role secrets must be independent');
}

const fixtureHolderSecret = bytes32(required('V2_FIXTURE_HOLDER_SECRET_HEX'));
const fixtureHolderBlind = bytes32(required('V2_FIXTURE_HOLDER_BLIND_HEX'));
const fixtureCredentialBlind = bytes32(required('V2_FIXTURE_CREDENTIAL_BLIND_HEX'));
const country = api.isoNumericCountry(optional('V2_FIXTURE_COUNTRY', '032'));
const ageClass = optional('V2_FIXTURE_AGE_CLASS', '18-plus');
const assurance = optional('V2_FIXTURE_ASSURANCE', 'document-nfc');
if (!['unknown', 'under-18', '18-plus'].includes(ageClass)) {
  fail('V2_FIXTURE_AGE_CLASS must be unknown, under-18, or 18-plus');
}
if (!['self-asserted', 'document', 'document-nfc', 'passport-native'].includes(assurance)) {
  fail('V2_FIXTURE_ASSURANCE must be self-asserted, document, document-nfc, or passport-native');
}
const validFrom = required('V2_FIXTURE_VALID_FROM');
const validUntil = required('V2_FIXTURE_VALID_UNTIL');
const validFromSeconds = api.isoTimestampSeconds(validFrom, 'V2_FIXTURE_VALID_FROM');
const validUntilSeconds = api.isoTimestampSeconds(validUntil, 'V2_FIXTURE_VALID_UNTIL');
if (validUntilSeconds <= validFromSeconds) {
  fail('V2_FIXTURE_VALID_UNTIL must be after V2_FIXTURE_VALID_FROM');
}
const validityReference = unsigned(
  optional('V2_VALIDITY_REFERENCE_UNIX_SECONDS', validFromSeconds.toString()),
  64,
  'V2_VALIDITY_REFERENCE_UNIX_SECONDS',
);
const countryPolicyText = optional('V2_COUNTRY_POLICY', '');
const countryPolicy = countryPolicyText ? api.isoNumericCountry(countryPolicyText) : null;
const minimumAssurance = unsigned(
  optional('V2_MINIMUM_ASSURANCE', String(api.assuranceCode(assurance))),
  8,
  'V2_MINIMUM_ASSURANCE',
);
if (minimumAssurance > 3n) fail('V2_MINIMUM_ASSURANCE must be a credential assurance code (0..3)');
const requireAdult = booleanValue(optional('V2_REQUIRE_ADULT', 'true'), 'V2_REQUIRE_ADULT');
const referendumId = required('V2_REFERENDUM_ID');
const eventIdHex = normalizeHex(required('V2_EVENT_ID_HEX'));
const eventId = bytes32(eventIdHex);
const fixtureVoteSalt = bytes32(required('V2_FIXTURE_VOTE_SALT_HEX'));
const fixtureVoteChoice = optional('V2_FIXTURE_VOTE_CHOICE', 'YES');
if (!['YES', 'NO', 'ABSTAIN'].includes(fixtureVoteChoice)) {
  fail('V2_FIXTURE_VOTE_CHOICE must be YES, NO, or ABSTAIN');
}
const title = optional('V2_REFERENDUM_TITLE', 'Passport v2 local referendum');
const question = optional('V2_REFERENDUM_QUESTION', 'Should this civic consultation proceed?');
const description = optional('V2_REFERENDUM_DESCRIPTION', '');
const apiUrl = optional('V2_API_URL', 'http://127.0.0.1:8791');
const credentialTtlMs = Number.parseInt(optional('V2_CREDENTIAL_TTL_MS', '86400000'), 10);
if (!Number.isSafeInteger(credentialTtlMs) || credentialTtlMs < 1_000) {
  fail('V2_CREDENTIAL_TTL_MS must be a positive safe integer in milliseconds');
}
const uniquenessUpperBound = unsigned(
  optional('V2_UNIQUENESS_TIMESTAMP_UPPER_BOUND', '4102444800'),
  64,
  'V2_UNIQUENESS_TIMESTAMP_UPPER_BOUND',
);
const explorerBaseUrl = optional(
  'V2_EXPLORER_BASE_URL',
  networkId === 'preview' ? 'https://explorer.preview.midnight.network/tx' : '',
);

const source = readSourceIdentity();
const services = readServiceIdentity();

const artifacts = {
  compactLanguageVersion: optional('V2_COMPACT_LANGUAGE_VERSION', '0.23'),
  compactCompilerVersion: optional('V2_COMPACT_COMPILER_VERSION', '0.31.1'),
  compactRuntimeVersion: optional('V2_COMPACT_RUNTIME_VERSION', '0.16.0'),
  midnightJsVersion: optional('V2_MIDNIGHT_JS_VERSION', '4.1.1'),
  ledgerVersion: optional('V2_LEDGER_VERSION', '8.1.0'),
  onchainRuntimeVersion: optional('V2_ONCHAIN_RUNTIME_VERSION', '3.0.0'),
  registryArtifact: 'credential-registry-v1',
  referendumArtifact: 'referendum-v2',
};
const endpoints = {
  nodeRpc: relayer.relayUrl,
  indexerHttp: relayer.indexerHttpUrl,
  indexerWs: relayer.indexerWsUrl,
  proofServer: relayer.provingServerUrl,
  relay: `http://${relayer.host}:${relayer.port}`,
  explorer: explorerBaseUrl || null,
};

const claims = {
  issuerId,
  country,
  ageClass,
  assurance,
  credentialEpoch: Number(credentialEpoch),
  validFrom,
  validUntil,
};
const holderBinding = api.deriveHolderBinding(fixtureHolderSecret, fixtureHolderBlind);
const credentialLeaf = api.deriveCredentialLeaf({
  holderBinding,
  claims,
  credentialBlind: fixtureCredentialBlind,
});
const issuerKey = api.deriveRoleKey('cico:registry:issuer:', issuerSecret);
const organizerKey = api.deriveRoleKey('cico:referendum-v2:organizer:', organizerSecret);
const executorNetwork = networkId;

let manifest;
manifest = loadOrCreateManifest({
  apiUrl,
  credentialTtlMs,
  uniquenessUpperBound,
  registryIdHex,
  issuerId,
  issuerIdHex: normalizeHex(required('V2_ISSUER_ID_HEX')),
  credentialEpoch,
  eventIdHex,
  referendumId,
  organizerKeyHex: toHex(organizerKey),
  fixtureVoteChoice,
  countryPolicy: countryPolicyText || null,
  minimumAssurance,
  requireAdult,
  validityReference,
  title,
  question,
  description,
  artifacts,
  endpoints,
  source,
  services,
});
if (relayer.networkId !== networkId) {
  fail(
    `Relayer network ${relayer.networkId} does not match V2_NETWORK_ID ${networkId}; use the matching relayer environment`,
  );
}
const relayerUrl = `http://${relayer.host}:${relayer.port}`;
const health = await fetch(`${relayerUrl}/health`)
  .then((response) => (response.ok ? response.json() : null))
  .catch(() => null);
if (!health) {
  fail(`The relayer is not responding at ${relayerUrl}; start the matching relayer first`);
}
if (BigInt(health.dustBalance ?? '0') <= 0n) {
  fail('The relayer has no DUST; fund it before deploying the v2 vertical slice');
}
if (equalBytes(issuerSecret, bytes32(relayer.seedHex))) {
  fail('V2 issuer role secret must be independent from the relayer fee key');
}
if (equalBytes(organizerSecret, bytes32(relayer.seedHex))) {
  fail('V2 organizer role secret must be independent from the relayer fee key');
}
manifest = updateManifest({
  endpoints,
  dust: {
    ...manifest.dust,
    before: manifest.dust.before ?? String(health.dustBalance ?? '0'),
  },
});

const registryZk = new NodeZkConfigProvider(
  resolve(ROOT, 'contracts/credential-registry-v1/managed/credential-registry-v1'),
);
const referendumZk = new NodeZkConfigProvider(
  resolve(ROOT, 'contracts/referendum-v2/managed/referendum-v2'),
);
for (const directory of [registryZk.directory, referendumZk.directory]) {
  if (!existsSync(directory)) {
    fail(`Missing compiled v2 assets at ${directory}; run npm run compile:v2 first`);
  }
}
manifest = updateManifest({
  artifacts: {
    ...manifest.artifacts,
    hashes: {
      'credential-registry-v1': hashDirectory(registryZk.directory),
      'referendum-v2': hashDirectory(referendumZk.directory),
    },
  },
});
// Operator authority is an in-process wallet/provider. It never traverses the
// public relay's compatibility /balance or /submit routes. Undeployed uses the
// well-known local genesis fee wallet; issuer and organizer contract authority
// remain independent run secrets. Preview must provide its own fee seed.
const operatorFeeSeed =
  networkId === 'undeployed'
    ? optional('V2_OPERATOR_FEE_SEED_HEX', `${'0'.repeat(63)}1`)
    : required('V2_OPERATOR_FEE_SEED_HEX');
if (!/^[0-9a-f]{64}$/iu.test(operatorFeeSeed)) {
  fail('V2_OPERATOR_FEE_SEED_HEX must be 32 bytes of hexadecimal');
}
const operatorWallet = await startRelayerWallet({ ...relayer, seedHex: operatorFeeSeed });
const operatorState = await firstValueFrom(
  operatorWallet.facade.state().pipe(
    filter(
      (state) =>
        state.isSynced &&
        state.dust.availableCoins.length > 0 &&
        state.dust.balance(new Date()) > 0n &&
        Boolean(state.shielded.coinPublicKey) &&
        Boolean(state.shielded.encryptionPublicKey),
    ),
    timeout({ first: 8 * 60 * 1_000 }),
  ),
);
const operatorProviders = {
  privateStateProvider: api.inMemoryPrivateStateProvider(),
  publicDataProvider: indexerPublicDataProvider(relayer.indexerHttpUrl, relayer.indexerWsUrl),
  zkConfigProvider: registryZk,
  proofProvider: httpClientProofProvider(relayer.provingServerUrl, registryZk),
  walletProvider: {
    getCoinPublicKey: () =>
      ShieldedCoinPublicKey.codec
        .encode(networkId, operatorState.shielded.coinPublicKey)
        .asString(),
    getEncryptionPublicKey: () =>
      ShieldedEncryptionPublicKey.codec
        .encode(networkId, operatorState.shielded.encryptionPublicKey)
        .asString(),
    balanceTx: (transaction) => balanceAndFinalize(operatorWallet, transaction),
  },
  midnightProvider: {
    submitTx: (transaction) => operatorWallet.facade.submitTransaction(transaction),
  },
};

const referendumOperatorProviders = {
  ...operatorProviders,
  zkConfigProvider: referendumZk,
  proofProvider: httpClientProofProvider(relayer.provingServerUrl, referendumZk),
};

const registryPrivateState = {
  issuerSecret,
  holderBinding,
  credentialBlind: fixtureCredentialBlind,
  credentialCountry: api.padBytes32(country),
  credentialAgeClass: api.ageClassCode(ageClass),
  credentialAssurance: api.assuranceCode(assurance),
  credentialClaimEpoch: credentialEpoch,
  credentialValidUntil: validUntilSeconds,
};
const registryConfig = {
  registryId,
  issuerId: issuerIdBytes,
  credentialEpoch,
  issuerKey,
  network: executorNetwork,
  ...(explorerBaseUrl ? { explorerBaseUrl } : {}),
};
const registryExecutor = api.createCredentialRegistryV1Executor(operatorProviders, registryConfig);
let registryAddress = manifest.registry.contractAddress;
let registryReceipt = stepReceipt('registry.deploy');
if (registryAddress) {
  await registryExecutor.join(registryAddress, registryPrivateState);
  recordStep('registry.deploy', registryReceipt ? 'confirmed' : 'reconciled', registryReceipt);
} else {
  const deployment = await registryExecutor.deploy(registryPrivateState);
  registryAddress = deployment.contractAddress;
  registryReceipt = deployment.receipt;
  manifest = updateRegistry({
    contractAddress: registryAddress,
    registryContractBindingHex: toHex(api.deriveRegistryContractBinding(registryAddress)),
  });
  recordStep('registry.deploy', 'confirmed', registryReceipt);
}

let registryState = await readRegistryState(registryAddress);
assertRegistryMetadata(registryState);
manifest = updateRegistrySnapshot(registryState);
await observe('registry.deploy', registryAddress);

let existingCredentialPath = await findCredentialPathOrNull(registryState);
if (existingCredentialPath) {
  recordStep(
    'registry.issue',
    stepReceipt('registry.issue') ? 'confirmed' : 'reconciled',
    stepReceipt('registry.issue'),
    {
      credentialCount: registryState.credentialCount.toString(),
    },
  );
} else {
  if (registryState.frozen)
    fail('The existing registry is frozen before the fixture credential was issued');
  const receipt = await registryExecutor.addCredential();
  recordStep('registry.issue', 'confirmed', receipt, {
    credentialCount: '1+',
  });
  registryState = await readRegistryState(registryAddress);
  existingCredentialPath = await findCredentialPathOrNull(registryState);
  if (!existingCredentialPath) {
    fail('Canonical registry state does not contain the issued fixture credential');
  }
  manifest = updateRegistrySnapshot(registryState);
}
await observe('registry.issue', registryAddress);

if (!registryState.frozen) {
  const receipt = await registryExecutor.freeze(registryState.currentRoot);
  recordStep('registry.freeze', 'confirmed', receipt);
  registryState = await readRegistryState(registryAddress);
} else {
  if (registryState.frozenRoot.field !== registryState.currentRoot.field) {
    fail('Existing registry has a frozen root that is not its current root');
  }
  recordStep(
    'registry.freeze',
    stepReceipt('registry.freeze') ? 'confirmed' : 'reconciled',
    stepReceipt('registry.freeze'),
  );
}
assertRegistryFrozen(registryState);
manifest = updateRegistrySnapshot(registryState);
await observe('registry.freeze', registryAddress);

const frozenRegistry = api.createFrozenCredentialRegistryReference(registryAddress, registryState);
manifest = updateRegistry({
  contractAddress: registryAddress,
  registryContractBindingHex: toHex(frozenRegistry.registryContractBinding),
});
const referendumConfig = {
  registry: frozenRegistry,
  eventId,
  organizerKey,
  countryPolicy: countryPolicy ? api.padBytes32(countryPolicy) : new Uint8Array(32),
  countryPolicyEnabled: countryPolicy !== null,
  minimumAssurance,
  requireAdult,
  validityReference,
  network: executorNetwork,
  ...(explorerBaseUrl ? { explorerBaseUrl } : {}),
};
if (!existingCredentialPath)
  fail('The canonical registry has no fixture path for lifecycle verification');
const referendumPrivateState = {
  role: 'organizer',
  organizerSecret,
  voterSecret: fixtureHolderSecret,
  holderBinding,
  holderBlind: fixtureHolderBlind,
  credentialBlind: fixtureCredentialBlind,
  credentialCountry: api.padBytes32(country),
  credentialAgeClass: api.ageClassCode(ageClass),
  credentialAssurance: api.assuranceCode(assurance),
  credentialClaimEpoch: credentialEpoch,
  credentialValidUntil: validUntilSeconds,
  voterPath: existingCredentialPath,
  voterChoice: fixtureVoteChoice,
  voteSalt: fixtureVoteSalt,
};
const referendumExecutor = api.createReferendumV2Executor(
  referendumOperatorProviders,
  referendumConfig,
);
const referendumEntry = manifest.referenda[0];
let referendumAddress = referendumEntry.contractAddress;
let referendumReceipt = stepReceipt('referendum.deploy');
if (referendumAddress) {
  await referendumExecutor.join(referendumAddress, referendumPrivateState);
  recordStep(
    'referendum.deploy',
    referendumReceipt ? 'confirmed' : 'reconciled',
    referendumReceipt,
  );
} else {
  const deployment = await referendumExecutor.deploy(referendumPrivateState);
  referendumAddress = deployment.contractAddress;
  referendumReceipt = deployment.receipt;
  manifest = updateReferendum({
    contractAddress: referendumAddress,
    registryContractBindingHex: toHex(frozenRegistry.registryContractBinding),
  });
  recordStep('referendum.deploy', 'confirmed', referendumReceipt);
}

const referendumState = await readReferendumState(referendumAddress);
assertReferendumState(referendumState);
manifest = updateReferendum({
  contractAddress: referendumAddress,
  registryContractBindingHex: toHex(referendumState.registryContractBinding),
});
await observe('referendum.deploy', registryAddress, referendumAddress);

if (evidencePhase === 'prepare') {
  await operatorWallet.stop().catch(() => undefined);
  console.log(`Passport v2 ${networkId} preparation manifest: ${manifestPath}`);
  process.exit(0);
}

// The citizen cast path has its own provider/private-state boundary. The
// operator provider above remains available for close/reveal/finalize, but is
// deliberately never passed to the citizen executor.
const citizenCapabilityIssuer =
  networkId === 'undeployed'
    ? new UndeployedFixtureCapabilityIssuer({
        secret: relayer.v2CapabilitySecret,
        contractAddress: referendumAddress,
        issuerOrigin: 'http://127.0.0.1',
        ttlSeconds: 1_800,
      })
    : new api.HttpWalletlessActionCapabilityIssuer({ baseUrl: apiUrl });
const citizenRuntime = await api.createReferendumV2WalletlessProviders({
  relayUrl: relayerUrl,
  proofServerUri: relayer.provingServerUrl,
  networkId,
  indexerUri: relayer.indexerHttpUrl,
  indexerWsUri: relayer.indexerWsUrl,
  capabilityIssuer: citizenCapabilityIssuer,
  // Local managed assets keep the runner independent of a browser server and
  // ensure the citizen proof uses the exact compiled referendum-v2 artifact.
  zkConfigProvider: referendumZk,
});
const citizenReferendumExecutor = api.createReferendumV2Executor(
  citizenRuntime.providers,
  referendumConfig,
);
await citizenReferendumExecutor.join(referendumAddress, { ...referendumPrivateState });
const fixtureCredentialAuthorization = `fixture:${referendumId}`;
await verifyLifecycle(referendumAddress, referendumState);
manifest = await updateDustAfterRun();
manifest = finalizeLifecycleManifest();
saveManifest();

await operatorWallet.stop().catch(() => undefined);

console.log(`Passport v2 ${networkId} manifest: ${manifestPath}`);
if (manifest.status === 'complete') {
  console.log(JSON.stringify(api.passportV2ManifestRuntimeEnvironment(manifest), null, 2));
} else {
  console.log(
    JSON.stringify(
      {
        status: manifest.status,
        network: manifest.network,
        submissionTransport: manifest.submissionTransport,
        message: 'Lifecycle is finalized; relay restart and DUST evidence are still pending.',
      },
      null,
      2,
    ),
  );
}

async function readRegistryState(address) {
  const canonical = await waitForState(address, 'credential registry');
  return api.parseCredentialRegistryV1(canonical.data);
}

async function readReferendumState(address) {
  const canonical = await waitForState(address, 'referendum');
  return api.parseReferendumV2(canonical.data);
}

async function waitForState(address, label) {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const state = await operatorProviders.publicDataProvider.queryContractState(address);
      if (state) return state;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
  throw new Error(
    `Timed out waiting for canonical ${label} state${lastError ? `: ${lastError.message}` : ''}`,
  );
}

async function findCredentialPathOrNull(_state) {
  try {
    return api.findCredentialPath(
      await operatorProviders.publicDataProvider
        .queryContractState(registryAddress)
        .then((value) => {
          if (!value) throw new Error('registry state disappeared');
          return value.data;
        }),
      credentialLeaf,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('not present')) return null;
    throw error;
  }
}

/** Record a public-only snapshot at each operator boundary. The indexer is
 * the source of truth for the observation; absence is retained explicitly so
 * a partially available deployment cannot be mistaken for confirmation. */
async function observe(stage, registryAddressValue, referendumAddressValue) {
  let registrySnapshot;
  let referendumSnapshot;
  try {
    if (registryAddressValue) registrySnapshot = await readRegistryState(registryAddressValue);
    if (referendumAddressValue)
      referendumSnapshot = await readReferendumState(referendumAddressValue);
  } catch {
    // Keep the observation and mark the indexer unavailable below. The next
    // idempotent run can reconcile the same stage from canonical state.
  }
  const observation = {
    stage,
    observedAt: new Date().toISOString(),
    ...(stepReceipt(stage)?.transactionId
      ? { transactionId: stepReceipt(stage).transactionId }
      : {}),
    indexer: {
      available: Boolean(registrySnapshot || referendumSnapshot),
      source: endpoints.indexerHttp,
    },
    ...(registrySnapshot && registryAddressValue
      ? {
          registry: {
            contractAddress: registryAddressValue,
            currentRootField: registrySnapshot.currentRoot.field.toString(),
            frozenRootField: registrySnapshot.frozenRoot.field.toString(),
            credentialCount: registrySnapshot.credentialCount.toString(),
            frozen: registrySnapshot.frozen,
          },
        }
      : {}),
    ...(referendumSnapshot && referendumAddressValue
      ? {
          referendum: {
            contractAddress: referendumAddressValue,
            phase: referendumSnapshot.phase,
            closed: referendumSnapshot.closed,
            issuedVotes: referendumSnapshot.issuedVotes.toString(),
            tally: Object.fromEntries(
              [...referendumSnapshot.tally].map(([choice, count]) => [choice, count.toString()]),
            ),
          },
        }
      : {}),
  };
  manifest = {
    ...manifest,
    transcript: {
      ...manifest.transcript,
      observations: [
        ...(manifest.transcript.observations ?? []).filter(
          (candidate) => candidate.stage !== stage,
        ),
        observation,
      ],
    },
  };
  saveManifest();
}

/**
 * Reconciles and proves the complete local lifecycle. Every successful step
 * is followed by a fresh canonical read; a replay is required to fail before
 * the manifest can be marked complete. This makes a restarted run safe and
 * prevents a relay acknowledgement from being treated as a receipt.
 */
async function verifyLifecycle(address, initialState) {
  let state = initialState;
  if (state.phase === 'COMMIT') {
    if (state.issuedVotes === 0n) {
      const receipt = await castCitizenVote();
      recordStep('lifecycle.cast', 'confirmed', receipt);
      state = await readReferendumState(address);
    } else {
      recordStep('lifecycle.cast', 'reconciled', stepReceipt('lifecycle.cast'));
    }
    await observe('lifecycle.cast', registryAddress, address);

    let replayRejected = false;
    try {
      await castCitizenVote();
    } catch (error) {
      replayRejected = true;
      recordStep('lifecycle.replay-rejected', 'rejected', undefined, {
        reason: error instanceof Error ? error.message.slice(0, 160) : 'contract rejected replay',
      });
    }
    if (!replayRejected) fail('Lifecycle replay was accepted by the referendum contract');
    await observe('lifecycle.replay-rejected', registryAddress, address);
  } else {
    recordStep(
      'lifecycle.cast',
      stepStatus('lifecycle.cast', 'reconciled'),
      stepReceipt('lifecycle.cast'),
    );
    const replayStep = manifest.transcript.steps.find(
      (candidate) => candidate.id === 'lifecycle.replay-rejected',
    );
    if (replayStep?.status === 'rejected') {
      recordStep('lifecycle.replay-rejected', 'rejected', replayStep.receipt, replayStep.details);
    } else {
      let replayRejected = false;
      try {
        await castCitizenVote();
      } catch (error) {
        replayRejected = true;
        recordStep('lifecycle.replay-rejected', 'rejected', undefined, {
          reason: error instanceof Error ? error.message.slice(0, 160) : 'contract rejected replay',
        });
      }
      if (!replayRejected) fail('Lifecycle replay was accepted by the referendum contract');
    }
  }

  state = await readReferendumState(address);
  if (state.phase === 'COMMIT') {
    const receipt = await referendumExecutor.closeVote();
    recordStep('lifecycle.close', 'confirmed', receipt);
    state = await readReferendumState(address);
  } else {
    recordStep(
      'lifecycle.close',
      stepStatus('lifecycle.close', 'reconciled'),
      stepReceipt('lifecycle.close'),
    );
  }
  await observe('lifecycle.close', registryAddress, address);

  state = await readReferendumState(address);
  if (state.phase === 'REVEAL') {
    const canonical = await operatorProviders.publicDataProvider.queryContractState(address);
    if (!canonical) fail('Referendum canonical state disappeared before reveal');
    const ballot = api.deriveBallotCommitment(eventId, fixtureVoteChoice, fixtureVoteSalt);
    referendumPrivateState.revealPath = api.findBallotPath(canonical.data, ballot);
    let revealReceipt;
    try {
      revealReceipt = await referendumExecutor.revealVote(fixtureVoteChoice, fixtureVoteSalt);
      recordStep('lifecycle.reveal', 'confirmed', revealReceipt);
    } catch (error) {
      if (!(error instanceof Error) || !/already been revealed|revealed/u.test(error.message))
        throw error;
      recordStep('lifecycle.reveal', 'reconciled', stepReceipt('lifecycle.reveal'), {
        reason: 'already revealed',
      });
    }
    state = await readReferendumState(address);
  } else {
    recordStep(
      'lifecycle.reveal',
      stepStatus('lifecycle.reveal', 'reconciled'),
      stepReceipt('lifecycle.reveal'),
    );
  }
  await observe('lifecycle.reveal', registryAddress, address);

  state = await readReferendumState(address);
  if (state.phase === 'REVEAL') {
    const receipt = await referendumExecutor.finalizeVote();
    recordStep('lifecycle.finalize', 'confirmed', receipt);
    state = await readReferendumState(address);
  } else {
    recordStep(
      'lifecycle.finalize',
      stepStatus('lifecycle.finalize', 'reconciled'),
      stepReceipt('lifecycle.finalize'),
    );
  }
  if (state.phase !== 'FINALIZED' || !state.closed)
    fail('Referendum did not reach a closed FINALIZED state');
  await observe('lifecycle.finalize', registryAddress, address);
}

async function castCitizenVote() {
  const receipt = await citizenRuntime.actionContext.run(
    {
      credentialAuthorization: fixtureCredentialAuthorization,
      contractAddress: referendumAddress,
      circuit: 'castVote',
      action: 'vote',
    },
    () => citizenReferendumExecutor.castVote(),
  );
  const trace = citizenRuntime.getLastActionTrace();
  if (!trace) fail('Atomic citizen cast completed without action evidence');
  manifest = updateManifest({
    action: {
      actionId: trace.actionId,
      actionIdDigest: trace.actionIdDigest,
      idempotencyKeyDigest: trace.idempotencyKeyDigest,
      requestHash: trace.requestHash,
      txDigest: trace.txDigest,
      capabilityDigest: trace.capabilityDigest,
      transactionId: trace.transactionId,
      status: trace.status,
    },
    submissionTransport: 'v2-actions',
  });
  return receipt;
}

function assertRegistryMetadata(state) {
  if (!equalBytes(state.registryId, registryId))
    fail('Registry ID does not match the operator manifest');
  if (!equalBytes(state.issuerId, issuerIdBytes))
    fail('Issuer ID does not match the operator manifest');
  if (state.credentialEpoch !== credentialEpoch)
    fail('Credential epoch does not match the operator manifest');
}

function assertRegistryFrozen(state) {
  assertRegistryMetadata(state);
  if (!state.frozen || state.frozenRoot.field !== state.currentRoot.field) {
    fail('Registry did not reach a canonical current-root frozen state');
  }
}

function assertReferendumState(state) {
  if (!equalBytes(state.registryId, registryId))
    fail('Referendum registry ID is not bound to the frozen registry');
  if (!equalBytes(state.issuerId, issuerIdBytes))
    fail('Referendum issuer ID is not bound to the registry');
  if (state.credentialEpoch !== credentialEpoch)
    fail('Referendum credential epoch is not bound to the registry');
  if (state.frozenCredentialRoot.field !== registryState.frozenRoot.field)
    fail('Referendum root is not bound to the frozen registry');
  if (
    !equalBytes(state.registryContractBinding, api.deriveRegistryContractBinding(registryAddress))
  )
    fail('Referendum is not bound to the selected registry contract');
  if (!equalBytes(state.eventId, eventId))
    fail('Referendum event ID does not match the operator manifest');
  if (!equalBytes(state.organizerKey, organizerKey))
    fail('Referendum organizer key does not match the operator manifest');
  if (state.countryPolicyEnabled !== (countryPolicy !== null))
    fail('Referendum country policy flag does not match the operator manifest');
  if (state.minimumAssurance !== minimumAssurance)
    fail('Referendum assurance policy does not match the operator manifest');
  if (state.requireAdult !== requireAdult)
    fail('Referendum adult policy does not match the operator manifest');
  if (state.validityReference !== validityReference)
    fail('Referendum validity reference does not match the operator manifest');
}

function loadOrCreateManifest(expected) {
  if (existsSync(manifestPath)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      fail(`Cannot parse existing manifest ${manifestPath}`);
    }
    // Manifests written by the first draft predate the observation journal;
    // normalize only this additive public field before schema validation so a
    // restart can reconcile instead of forcing a destructive redeploy.
    parsed.transcript ??= { steps: [], observations: [] };
    parsed.transcript.observations ??= [];
    parsed.registry.registryContractBindingHex ??= null;
    parsed.dust.beforeObservedAt ??= null;
    parsed.dust.afterObservedAt ??= null;
    parsed.dust.valuationAt ??= null;
    for (const referendum of parsed.referenda ?? []) referendum.registryContractBindingHex ??= null;
    api.validatePassportV2DeploymentManifest(parsed);
    assertManifestMatches(parsed, expected);
    return parsed;
  }
  const created = {
    kind: api.PASSPORT_V2_MANIFEST_KIND,
    version: api.PASSPORT_V2_MANIFEST_VERSION,
    status: 'in-progress',
    network: networkId,
    networkId,
    generatedAt: new Date().toISOString(),
    source: expected.source,
    services: expected.services,
    artifacts: expected.artifacts,
    endpoints: expected.endpoints,
    dust: {
      before: null,
      after: null,
      spent: null,
      beforeObservedAt: null,
      afterObservedAt: null,
      valuationAt: null,
      accounted: false,
    },
    runtime: {
      apiUrl: expected.apiUrl,
      credentialTtlMs: expected.credentialTtlMs,
      uniquenessTimestampUpperBoundUnixSeconds: expected.uniquenessUpperBound.toString(),
    },
    registry: {
      contractAddress: null,
      registryContractBindingHex: null,
      registryIdHex: expected.registryIdHex,
      issuerId: expected.issuerId,
      issuerIdHex: expected.issuerIdHex,
      credentialEpoch: expected.credentialEpoch.toString(),
      currentRootField: null,
      frozenRootField: null,
      credentialCount: null,
      frozen: false,
    },
    referenda: [
      {
        referendumId: expected.referendumId,
        contractAddress: null,
        registryContractBindingHex: null,
        eventIdHex: expected.eventIdHex,
        organizerKeyHex: expected.organizerKeyHex,
        countryPolicy: expected.countryPolicy,
        minimumAssurance: expected.minimumAssurance.toString(),
        requireAdult: expected.requireAdult,
        validityReference: expected.validityReference.toString(),
        title: expected.title,
        question: expected.question,
        ...(expected.description ? { description: expected.description } : {}),
      },
    ],
    transcript: { steps: [], observations: [] },
  };
  manifest = created;
  saveManifest();
  return created;
}

function assertManifestMatches(existing, expected) {
  if (existing.network !== networkId || existing.networkId !== networkId)
    fail('Existing manifest belongs to another network');
  const registry = existing.registry;
  if (
    registry.registryIdHex !== expected.registryIdHex ||
    registry.issuerId !== expected.issuerId ||
    registry.issuerIdHex !== expected.issuerIdHex ||
    registry.credentialEpoch !== expected.credentialEpoch.toString()
  ) {
    fail('Existing manifest registry metadata does not match the requested deployment');
  }
  const referendum = existing.referenda[0];
  if (
    !referendum ||
    referendum.referendumId !== expected.referendumId ||
    referendum.eventIdHex !== expected.eventIdHex ||
    referendum.organizerKeyHex !== expected.organizerKeyHex ||
    referendum.countryPolicy !== expected.countryPolicy ||
    referendum.minimumAssurance !== expected.minimumAssurance.toString() ||
    referendum.requireAdult !== expected.requireAdult ||
    referendum.validityReference !== expected.validityReference.toString()
  ) {
    fail('Existing manifest referendum metadata does not match the requested deployment');
  }
}

function updateRegistry(patch) {
  manifest = { ...manifest, registry: { ...manifest.registry, ...patch } };
  saveManifest();
  return manifest;
}

function updateRegistrySnapshot(state) {
  return updateRegistry({
    currentRootField: state.currentRoot.field.toString(),
    frozenRootField: state.frozenRoot.field.toString(),
    credentialCount: state.credentialCount.toString(),
    frozen: state.frozen,
  });
}

function updateReferendum(patch) {
  manifest = {
    ...manifest,
    referenda: manifest.referenda.map((entry, index) =>
      index === 0 ? { ...entry, ...patch } : entry,
    ),
  };
  saveManifest();
  return manifest;
}

function recordStep(id, status, receipt, details) {
  const existing = manifest.transcript.steps.find((step) => step.id === id);
  const step = {
    id,
    status,
    completedAt: new Date().toISOString(),
    ...(receipt ? { receipt } : existing?.receipt ? { receipt: existing.receipt } : {}),
    ...(details ? { details } : existing?.details ? { details: existing.details } : {}),
  };
  manifest = {
    ...manifest,
    transcript: {
      steps: [...manifest.transcript.steps.filter((candidate) => candidate.id !== id), step],
      observations: manifest.transcript.observations ?? [],
    },
  };
  saveManifest();
}

function updateManifest(patch) {
  manifest = { ...manifest, ...patch };
  saveManifest();
  return manifest;
}

async function updateDustAfterRun() {
  const response = await fetch(`${relayerUrl}/health`);
  if (!response.ok) throw new Error(`Relayer health returned ${response.status}`);
  const health = await response.json();
  const after = String(health.dustBalance ?? '0');
  const before = manifest.dust.before;
  const spent =
    before !== null && BigInt(before) >= BigInt(after)
      ? (BigInt(before) - BigInt(after)).toString()
      : null;
  return updateManifest({
    dust: {
      ...manifest.dust,
      after,
      spent,
      accounted: spent !== null,
    },
  });
}

function stepReceipt(id) {
  return manifest.transcript.steps.find((step) => step.id === id)?.receipt;
}

function stepStatus(id, fallback) {
  return manifest.transcript.steps.find((step) => step.id === id)?.status ?? fallback;
}

function saveManifest() {
  mkdirSync(dirname(manifestPath), { recursive: true });
  const temporaryPath = `${manifestPath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, api.serializePassportV2DeploymentManifest(manifest), {
    encoding: 'utf8',
    mode: 0o600,
  });
  renameSync(temporaryPath, manifestPath);
}

function finalizeLifecycleManifest() {
  const cast = stepReceipt('lifecycle.cast');
  const close = stepReceipt('lifecycle.close');
  const reveal = stepReceipt('lifecycle.reveal');
  const finalize = stepReceipt('lifecycle.finalize');
  const replayRejected = manifest.transcript.steps.some(
    (step) => step.id === 'lifecycle.replay-rejected' && step.status === 'rejected',
  );
  const evidence = {
    submissionTransport: 'v2-actions',
    relay: {
      submissionTransport: 'v2-actions',
      states: [
        'authorized',
        'validated',
        'dust_reserved',
        'finalized',
        'submitted',
        'indexer_pending',
        'confirmed',
      ],
      accepted: Boolean(manifest.action?.transactionId),
      duplicateResolved: false,
      concurrentIdempotent: false,
      restartRecovered: false,
    },
    lifecycle: {
      castTransactionId: cast?.transactionId ?? '',
      closeTransactionId: close?.transactionId ?? '',
      revealTransactionId: reveal?.transactionId ?? '',
      finalizeTransactionId: finalize?.transactionId ?? '',
      replayRejected,
      finalized: true,
      indexerObservations: manifest.transcript.observations.filter((observation) =>
        ['lifecycle.cast', 'lifecycle.close', 'lifecycle.reveal', 'lifecycle.finalize'].includes(
          observation.stage,
        ),
      ).length,
    },
  };
  return { ...manifest, ...evidence, status: 'in-progress' };
}

function readSourceIdentity() {
  const commit = gitValue(['rev-parse', 'HEAD']);
  const tree = gitValue(['rev-parse', 'HEAD^{tree}']);
  if (!/^[0-9a-f]{40}$/iu.test(commit) || !/^[0-9a-f]{40}$/iu.test(tree)) {
    fail('Unable to capture the source commit/tree identity');
  }
  return { commit, tree };
}

function readServiceIdentity() {
  const packageVersion = (path) => {
    try {
      const value = JSON.parse(readFileSync(path, 'utf8'));
      return typeof value.version === 'string' && value.version ? value.version : 'unknown';
    } catch {
      return 'unknown';
    }
  };
  const apiPackage = resolve(ROOT, 'api/package.json');
  const relayerPackage = resolve(ROOT, 'relayer/package.json');
  const lockHash = hashFile(resolve(ROOT, 'package-lock.json'));
  const nodeImage = optional('V2_NODE_VERSION', 'midnightntwrk/midnight-node:1.0.0');
  const indexerImage = optional('V2_INDEXER_VERSION', 'midnightntwrk/indexer-standalone:4.3.3');
  const proofImage = optional('V2_PROOF_SERVER_VERSION', 'midnightntwrk/proof-server:8.1.0');
  return {
    api: { version: packageVersion(apiPackage), hash: hashDirectory(resolve(ROOT, 'api/dist')) },
    relayer: {
      version: packageVersion(relayerPackage),
      hash: hashDirectory(resolve(ROOT, 'relayer/dist')),
    },
    node: { version: nodeImage, hash: dockerImageHash(nodeImage) },
    indexer: {
      version: indexerImage,
      hash: dockerImageHash(indexerImage),
    },
    proofServer: {
      version: proofImage,
      hash: dockerImageHash(proofImage),
    },
    lockfile: { version: 'npm-lock', hash: lockHash },
  };
}

function dockerImageHash(image) {
  try {
    const value = execFileSync('docker', ['image', 'inspect', '--format', '{{.Id}}', image], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .trim()
      .replace(/^sha256:/u, '');
    if (/^[0-9a-f]{64}$/iu.test(value)) return value;
  } catch {}
  fail(`Unable to resolve the Docker image identity for ${image}`);
}

function gitValue(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function hashFile(path) {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return sha256(`missing:${path}`);
  }
}

function hashDirectory(path) {
  const files = [];
  walk(path, files);
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    hash.update(file.slice(path.length).replaceAll('\\', '/'));
    hash.update(readFileSync(file));
  }
  return hash.digest('hex');
}

function walk(path, files) {
  for (const entry of readdirSync(path)) {
    const child = resolve(path, entry);
    if (statSync(child).isDirectory()) walk(child, files);
    else files.push(child);
  }
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required`);
  return value;
}

function optional(name, fallback) {
  return process.env[name]?.trim() || fallback;
}

function normalizeHex(value) {
  const normalized = value.trim().replace(/^0x/u, '').toLowerCase();
  if (!/^[0-9a-f]+$/u.test(normalized) || normalized.length % 2 !== 0)
    fail('Expected an even-length hexadecimal value');
  return normalized;
}

function bytes32(value) {
  const normalized = normalizeHex(value);
  if (normalized.length !== 64) fail('Expected exactly 32 bytes of hexadecimal data');
  return Uint8Array.from(normalized.match(/.{2}/gu), (byte) => Number.parseInt(byte, 16));
}

function toHex(value) {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function unsigned(value, bits, label) {
  let parsed;
  try {
    parsed = BigInt(value);
  } catch {
    fail(`${label} must be an unsigned decimal integer`);
  }
  if (parsed < 0n || parsed > (1n << BigInt(bits)) - 1n) fail(`${label} is outside Uint<${bits}>`);
  return parsed;
}

function booleanValue(value, label) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`${label} must be true or false`);
}

function equalBytes(left, right) {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}
