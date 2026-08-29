/**
 * Node-only capability issuer for the local Undeployed evidence runner.
 *
 * This module intentionally lives under scripts/ (and not api/src or ui/src):
 * it is never part of a browser bundle. It signs the same short-lived HMAC
 * envelope verified by the relay, but accepts only a fixture credential and
 * one exact referendum castVote route. No credential material is serialized.
 */
import { signV2Capability } from '../relayer/dist/v2-capability.js';

export class UndeployedFixtureCapabilityIssuer {
  #secret;
  #contractAddress;
  #issuerOrigin;
  #ttlSeconds;

  constructor(options = {}) {
    const secret = String(options.secret ?? '').trim();
    const contractAddress = String(options.contractAddress ?? '').trim();
    const issuerOrigin = String(options.issuerOrigin ?? 'http://127.0.0.1').trim();
    const ttlSeconds = Number(options.ttlSeconds ?? 120);
    if (secret.length < 32) throw new TypeError('Undeployed capability secret is too short');
    if (!contractAddress) throw new TypeError('Undeployed referendum contract is required');
    assertLoopbackOrigin(issuerOrigin);
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 3_600) {
      throw new TypeError('Undeployed capability TTL must be between 30 and 3600 seconds');
    }
    this.#secret = secret;
    this.#contractAddress = contractAddress;
    this.#issuerOrigin = issuerOrigin;
    this.#ttlSeconds = ttlSeconds;
  }

  get issuerOrigin() {
    return this.#issuerOrigin;
  }

  async issue(request) {
    if (!request || typeof request !== 'object')
      throw new Error('invalid fixture capability request');
    if (request.network !== 'undeployed') throw new Error('fixture issuer is Undeployed-only');
    if (request.contractAddress !== this.#contractAddress) {
      throw new Error('fixture issuer is bound to a different referendum');
    }
    if (request.circuit !== 'castVote' || request.action !== 'vote') {
      throw new Error('fixture issuer only authorizes castVote');
    }
    if (
      typeof request.actionId !== 'string' ||
      typeof request.idempotencyKey !== 'string' ||
      typeof request.requestHash !== 'string' ||
      !/^[a-f0-9]{64}$/iu.test(request.requestHash) ||
      typeof request.credentialAuthorization !== 'string' ||
      !/^fixture:[^\s]{1,256}$/u.test(request.credentialAuthorization)
    ) {
      throw new Error('invalid fixture capability request');
    }
    return signV2Capability(
      {
        actionId: request.actionId,
        idempotencyKey: request.idempotencyKey,
        network: 'undeployed',
        contractAddress: this.#contractAddress,
        circuit: 'castVote',
        action: 'vote',
        requestHash: request.requestHash.toLowerCase(),
        expiresAt: Math.floor(Date.now() / 1_000) + this.#ttlSeconds,
      },
      this.#secret,
    );
  }
}

function assertLoopbackOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError('Undeployed fixture issuer must use a loopback origin');
  }
  if (
    parsed.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new TypeError('Undeployed fixture issuer must use a loopback origin');
  }
}
