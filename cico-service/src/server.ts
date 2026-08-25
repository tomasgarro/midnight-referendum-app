import { join } from 'node:path';
import { iso31661 } from 'iso-3166';
import { isoNumericCountry, type RarimoCountryMapper } from 'midnight-referendum-api';
import { loadCicoServiceConfig } from './config.js';
import {
  CredentialEpochCoordinator,
  MidnightCredentialEpochReader,
} from './credential-epoch-coordinator.js';
import { CredentialIssuerService } from './credential-issuer-service.js';
import { FileCredentialIssuanceStore, FileEvidenceAuthorizationStore } from './durable-stores.js';
import { createCicoHttpService } from './http.js';
import { startMidnightIssuerRuntime } from './midnight-issuer-runtime.js';
import { createMidnightIssuerWalletAdapter } from './midnight-issuer-wallet.js';
import { RarimoHttpVerificationGateway } from './rarimo-http-gateway.js';

const countryMapper: RarimoCountryMapper = (() => {
  const alpha3ToNumeric = new Map(
    iso31661.map((entry) => [entry.alpha3, isoNumericCountry(entry.numeric)] as const),
  );
  const numericToAlpha3 = new Map(
    iso31661.map((entry) => [isoNumericCountry(entry.numeric), entry.alpha3] as const),
  );
  return {
    fromAlpha3: (value) => alpha3ToNumeric.get(value.trim().toUpperCase()),
    toAlpha3: (value) => numericToAlpha3.get(value),
  };
})();

export async function startCicoService(): Promise<() => Promise<void>> {
  const config = loadCicoServiceConfig();
  const gateway = new RarimoHttpVerificationGateway({
    baseUrl: config.rarimoBaseUrl,
    privateHeaders: config.rarimoPrivateHeaders,
    proofParamsAllowedOrigins: config.rarimoProofParamsAllowedOrigins,
    proofRequestBaseUrl: config.rarimoProofRequestBaseUrl,
  });
  const runtime = await startMidnightIssuerRuntime(config.issuerRuntime, {
    createWallet: createMidnightIssuerWalletAdapter,
  });
  const issuerSecret = hexBytes(config.issuerRuntime.issuerRoleSecretHex);
  const epochCoordinator = new CredentialEpochCoordinator({
    executor: runtime.executor,
    reader: new MidnightCredentialEpochReader(runtime.providers.publicDataProvider),
    registryContractAddress: config.issuerRuntime.registryContractAddress,
    registryId: config.issuerRuntime.registryId,
    issuerId: config.issuerRuntime.issuerId,
    credentialEpoch: config.issuerRuntime.credentialEpoch,
    issuerSecret,
  });
  const issuer = new CredentialIssuerService({
    executor: runtime.executor,
    registryContractAddress: config.issuerRuntime.registryContractAddress,
    issuerSecret,
    epochMutations: epochCoordinator,
    evidenceAuthorizations: new FileEvidenceAuthorizationStore(
      join(config.stateDirectory, 'evidence-authorizations.json'),
    ),
    issuanceStore: new FileCredentialIssuanceStore(
      join(config.stateDirectory, 'credential-issuances.json'),
    ),
    validateEvidenceAuthorization: (request) =>
      gateway.validateCredentialIssuance(request, {
        issuerId: config.issuerIdText,
        credentialEpoch: config.credentialEpoch,
        credentialTtlMs: config.credentialTtlMs,
        maximumIssuanceDelayMs: config.maximumIssuanceDelayMs,
        countryMapper,
      }),
  });
  const server = createCicoHttpService({
    gateway,
    issuer,
    allowedOrigins: config.allowedOrigins,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, () => {
        server.off('error', reject);
        resolve();
      });
    });
  } catch (error) {
    await runtime.stop();
    throw error;
  }
  process.stdout.write(`[cico] ready network=preview host=${config.host} port=${config.port}\n`);
  let stopped = false;
  return async () => {
    if (stopped) return;
    stopped = true;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await runtime.stop();
  };
}

function hexBytes(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{2}/gu) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function main(): Promise<void> {
  const stop = await startCicoService();
  const shutdown = () => {
    void stop().then(
      () => process.exit(0),
      (error: unknown) => {
        process.stderr.write(`[cico] shutdown failed: ${safeError(error)}\n`);
        process.exit(1);
      },
    );
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

void main().catch((error: unknown) => {
  process.stderr.write(`[cico] startup failed: ${safeError(error)}\n`);
  process.exitCode = 1;
});
