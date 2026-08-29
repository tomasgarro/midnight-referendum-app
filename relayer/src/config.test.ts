import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const controlledVariables = [
  'RELAYER_SEED',
  'RELAYER_V2_ALLOWED_CIRCUITS',
  'RELAYER_LEGACY_API_ENABLED',
] as const;
const originalValues = Object.fromEntries(
  controlledVariables.map((name) => [name, process.env[name]]),
) as Record<(typeof controlledVariables)[number], string | undefined>;

beforeEach(() => {
  for (const name of controlledVariables) delete process.env[name];
  process.env.RELAYER_SEED = 'ab'.repeat(32);
});

afterEach(() => {
  for (const name of controlledVariables) {
    const value = originalValues[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('relayer configuration boundaries', () => {
  it('disables the legacy transaction API by default and requires an explicit opt-in', () => {
    expect(loadConfig().legacyApiEnabled).toBe(false);
    process.env.RELAYER_LEGACY_API_ENABLED = 'true';
    expect(loadConfig().legacyApiEnabled).toBe(true);
  });

  it('rejects ambiguous legacy API flags', () => {
    process.env.RELAYER_LEGACY_API_ENABLED = 'yes';
    expect(() => loadConfig()).toThrow('RELAYER_LEGACY_API_ENABLED must be either');
  });

  it('fails closed when an operator circuit is configured on the public v2 relay', () => {
    process.env.RELAYER_V2_ALLOWED_CIRCUITS = 'castVote,closeVote';
    expect(() => loadConfig()).toThrow('public v2 relayer may allow only the castVote circuit');
  });
});
