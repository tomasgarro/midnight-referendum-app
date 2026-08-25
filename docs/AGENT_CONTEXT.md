# CICO Passport v2 agent context

## Objective

Build a Midnight Passport-first, passport-backed, non-binding civic consultation on Midnight Preview. Rarimo is a temporary evidence adapter. Do not claim mainnet, official-election, human-uniqueness, biometric-holder, or anti-coercion guarantees.

## Source of truth

- Repository: `/home/tomas/src/referendum`
- Implementation branch: `feat/passport-credential-v2`
- Baseline: `feat/wallet-less-voting` at `ed10357`
- Runtime: Linux/WSL, Node `22.22.0` from `.nvmrc`
- Baseline verification: `bash scripts/verify-linux.sh demo`
- Compact compiler metadata: compiler `0.31.1`, language `0.23`, runtime `0.16.0`

Never edit the historical Windows project copy. Generated Compact assets are synchronized by repository scripts.

## Current implementation status (2026-08-24)

Implemented and locally verified:

- `CredentialRegistryV1` and `ReferendumV2` contracts, generated assets,
  TS/Compact golden vectors, frozen-root policy, nullifier replay rejection,
  country/adult/assurance/validity predicates, and constructor public role keys;
- separate registry/referendum private-state IDs, contract-address-scoped
  storage, typed witnesses, Preview/devnet executors, and public-only canonical
  receipts;
- Midnight Passport profile/session adapter with only `session` and `profile`
  capabilities;
- Rarimo request/evidence/issuer boundary with exact verified status, fresh
  bindings, minimal claims, replay/idempotent cleanup, QR interaction, and no
  raw proof in the browser contract;
- full Preview UI composition through injected session, credential, and action
  ports, including a second canonical-receipt equality check;
- optional browser-safe HTTPS ports selected by
  `VITE_PASSPORT_V2_API_URL`; unset deployments connect Passport and then stop
  honestly before document verification.

Latest green gate: 8 Compact simulator tests, 26 API tests, 69 UI tests, 2
Chromium E2E tests, production API/UI builds, Biome quality (warnings only),
`git diff --check`, and `npm audit --omit=dev` with zero findings.

Still external/live-environment gated:

- self-hosted and authenticated Rarimo verificator/callback service;
- single-use evidence-authorization store and real Midnight credential issuer;
- deployed v2 registry/referendum addresses and fresh Preview transaction
  transcript;
- atomic sponsored-relay job, DUST concurrency/idempotency, encrypted recovery,
  and pilot operations.

## Architecture decisions

Read every record in `docs/adr/` before changing a trust boundary, credential schema, proof route, relayer, receipt, or geography behavior.

Stable boundaries:

1. `PassportSessionPort`
2. `CivicCredentialPort`
3. `CivicActionPort`
4. canonical read/receipt path through the Midnight indexer

Passport profile fields are display/session data only. They never enter credential commitments, voter secrets, ballot commitments, or nullifiers.

## Cryptographic constraints

- Witnesses and exported parameters are attacker-controlled inputs until constrained.
- Use domain-separated hashes and commitments with shared TS/Compact golden vectors.
- The issuer receives a blinded holder binding, never the voter secret or holder blind.
- The credential leaf binds issuer, country, age class, assurance, epoch, and validity.
- Every referendum pins an exact frozen credential root.
- Vote and cohort nullifiers use separate domains and include a random referendum ID.
- Ballot commitments include the referendum ID and fresh 32-byte randomness.
- Failed policy proofs use a generic public error.
- `castVote` must not disclose country, age, holder binding/opening, credential leaf/path, choice, or salt.

## Privacy and trust constraints

Never log or persist raw passport data, MRZ, NFC payload, face image, birth date, voter secret, witness, ballot choice, credential opening, or stable cross-referendum identifier.

Only the server-side verified provider result can authorize issuance. Browser claims such as `verified`, nationality, age, or uniqueness are untrusted.

The HTTP proof provider receives private witnesses. Allow only loopback or an explicitly approved Passport provider, with user-facing disclosure.

Geography is separate from voting. A public country counter is public even when the UI suppresses small buckets. Follow ADR-004.

## Package ownership

- Contract/security worker: registry and referendum v2 Compact sources, simulator tests, golden vectors.
- Credential worker: provider ports, enrollment API, synthetic/Rarimo adapters, issuer worker, conformance tests.
- Product worker: Passport capability UI, enrollment and voting journeys, organizer UX, accessibility, Playwright specifications.
- Root integrator: shared domain interfaces, dependencies, lockfiles, generated assets, private-state integration, relayer integration, and merges.

One owner at a time for shared interfaces, Compact sources, generated assets, package manifests, and lockfiles.

## Required handoff

Every work package reports:

1. objective and frozen acceptance criteria;
2. files changed;
3. commands and tests run;
4. security/privacy invariants checked;
5. remaining risks or assumptions; and
6. exact next dependency.

## Quality gates

- Compact compile and simulator tests
- TS/Compact golden-vector parity
- API and UI Vitest suites
- provider conformance suite
- headless Playwright critical journeys
- production build
- secret/log/privacy scan
- relayer authorization, concurrency, idempotency, and indexer-lag tests
- fresh Preview issuance/vote/reveal/finalize evidence
- public transcript and ZKIR disclosure audit

## Stop conditions

Stop and escalate when:

- an architecture or schema change conflicts with an ADR;
- a task requires a new external service, dependency, API key, callback origin, contract deployment, or funded wallet;
- the worktree contains overlapping user changes;
- an unexpected credential is accepted;
- sensitive data reaches logs or an unapproved service;
- a receipt disagrees with the canonical indexer;
- a relayer can fund an unapproved action; or
- geography is described as private while country updates are public.
