# CICO Passport v2 agent context

## Objective

Build a Midnight Passport-first, passport-backed, non-binding civic consultation on Midnight Preview. Rarimo is a temporary evidence adapter. Do not claim mainnet, official-election, human-uniqueness, biometric-holder, or anti-coercion guarantees.

## Source of truth

- Repository: the reviewed checkout containing this document
- Implementation branch: `feat/undeployed-v2-evidence-release`
- Baseline: no release SHA is assigned; inspect the current worktree before
  making evidence claims
- Runtime: Linux/WSL, Node `22.22.0` from `.nvmrc`
- Baseline verification: `bash scripts/verify-linux.sh demo`
- Compact compiler metadata: compiler `0.31.1`, language `0.23`, runtime `0.16.0`

Never edit the historical Windows project copy. Generated Compact assets are synchronized by repository scripts.

## Current implementation status (review checkout)

The checkout contains v2 contract, provider, issuer, browser, relayer, and
operator-runner code. The current Undeployed v2 lifecycle and relay run have
been verified locally by an operator, and the sanitized manifest/transcript are
committed at
`docs/evidence/undeployed-v2/abdd0a2/undeployed.manifest.json` and
`docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json`
(manifest digest `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`).
Do not turn that local result into a Preview transaction, Passport approval,
physical NFC/provider approval, CI result, test total, hosted URL, or video
claim; those remain separate release gates.

The bounded local procedure is `npm run evidence:undeployed:v2`. It generates
secrets in ignored files, starts the pinned services, and fails closed when
genesis funding or a lifecycle step is unavailable. The committed manifest and
transcript were reviewed against the gate in `docs/ENVIRONMENT-ACCEPTANCE.md`
before being deliberately staged and committed.

Still external or release-record gated:

- self-hosted and authenticated Rarimo verificator/callback service and a
  physical NFC transcript;
- a real credential issuer run against the provider and canonical Preview
  registry (the local run uses the fixture issuer);
- a fresh Preview transaction transcript;
- independent Passport origin approval and account/network validation;
- Preview/pilot sponsored-relay, DUST concurrency/idempotency, restart/recovery,
  and operations evidence beyond the verified local run.

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
