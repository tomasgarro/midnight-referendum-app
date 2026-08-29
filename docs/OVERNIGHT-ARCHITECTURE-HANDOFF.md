# Overnight architecture handoff (historical context)

This note records an earlier implementation handoff. It is retained for
architecture context, not as current runtime evidence. The review checkout has
not verified an Undeployed v2 run; use the [root README](../README.md),
[environment acceptance matrix](ENVIRONMENT-ACCEPTANCE.md), and
[Wave 1 checklist](WAVE-1-SUBMISSION-CHECKLIST.md) for current status.

## Outcome

The application now has a fail-closed path from Passport identity to a separately
authorized Midnight civic action. Public referendum reads no longer depend on a
wallet connection, Preview voting no longer falls back to the legacy fixture
executor, and the synthetic/demo lanes remain visibly synthetic.

This is an integration hardening milestone, not a claim that a production
Passport issuer, atomic sponsored relay, or deployed Preview contract has been
completed.

## Security and capability boundary

The runtime should be understood as three separate capabilities:

1. **Passport session** — profile and provider-owned identity consent.
2. **Civic credential** — scoped eligibility issued for a frozen credential
   epoch; Passport profile data must not enter the credential leaf, nullifier,
   or ballot.
3. **Action wallet** — explicit user authorization to prove and submit a Compact
   circuit call.

A Passport session cannot sign arbitrary Compact actions. Connecting Passport
must therefore never silently grant wallet, proving, balance, or submission
permissions. A wallet is requested only at the point where the user initiates a
real civic action.

## What changed in this build

- Wallet connection now classifies connector failures, rejects stale concurrent
  attempts, detects network drift, supports reconnection, and asks for broad
  action permissions only when an action needs them.
- Passport capability escalation performs a fresh bridge consent round-trip and
  preserves the previous session on failure. Popup listeners are installed
  before opening the window so early provider messages are not lost.
- A valid Preview v2 configuration routes voting through `CivicActionPort`.
  Missing or invalid v2 configuration blocks the action instead of falling back
  to the fixture/legacy executor.
- Public referendum state is loaded from the indexer independently of wallet and
  action readiness.
- Poll availability follows lifecycle timestamps; closed polls cannot be
  selected. Unsupported “one person, one vote” language was removed.
- Wallet selection is keyboard-accessible, focus-contained, dismissible, and
  uses minimum 44 px targets. Passport expiry, retry, cancellation, and narrow
  viewport behavior are represented in the UI.
- Public showcase bundles no longer embed loopback service defaults. Local
  undeployed URLs must be supplied through the undeployed environment.

## Intended mode truth table

| Mode | Passport | Public reads | Vote execution |
| --- | --- | --- | --- |
| Demo | deterministic simulation | synthetic | synthetic, clearly labelled |
| Showcase | intended Passport presentation (origin approval pending) | showcase data | no vote execution |
| Preview | configured Passport/credential lane (not verified here) | configured indexer (not verified here) | v2 only after a reviewed valid configuration; incomplete configuration blocks |
| Undeployed | simulated app identity plus local services when run | configured local indexer when run | v2 lifecycle is in progress; no current transaction or receipt is asserted |

## Next architectural build, in priority order

### 1. Atomic v2 sponsored transaction service

Replace the legacy two-step relayer with one state machine that validates the
requested circuit and contract, checks/reserves DUST, finalizes and submits once,
waits for canonical indexer confirmation, confirms DUST change, and returns an
idempotent receipt. Persist request ids and terminal states so retries cannot
double-submit. Until this exists, the legacy relayer must not be exposed as a v2
or production voting path.

Once this service has an end-to-end deployment transcript, remove the remaining
“no v2 configuration means legacy Preview” compatibility branch so every
Preview build fails closed unless its intended action lane is explicit.

### 2. Canonical receipt resolution

Build a durable receipt resolver keyed by action/request id. The UI should show a
public receipt only after the configured indexer confirms the transaction and
contract state. Wallet submission alone is not finality.

### 3. Real Preview deployment transcript

Using the supported Node/WSL environment, deploy credential-registry-v1 and
referendum-v2, configure the issuer/CICO service, enroll one credential, cast one
vote through the connector, and preserve the contract addresses, transaction
hashes, indexer observations, and DUST before/after evidence. This is the next
proof that the adapters work beyond mocks.

### 4. Provider and credential productionization

Implement the official Passport bridge/provider contract and a production
credential issuer policy. Keep provider profile attributes outside on-chain and
proof inputs. Document revocation, credential expiry, epoch rotation, audit
retention, and recovery before enabling public enrollment.

### 5. Organizer lifecycle and operations

Add v2 organizer flows for proposal creation, freeze/open/close transitions,
reveal/counting where applicable, and operational recovery. Every transition
needs authorization, idempotency, and indexer-observed state tests.

## Verification record

No current verification result is asserted in this historical note. Rerun the
repository checks from the reviewed checkout and record their observed output
only in a reviewed release record. Do not copy test totals, CI status, release
SHA, deployment URL, transaction identifiers, or video references into active
documentation without source evidence.

## Known limits

- No real browser wallet, proof server, indexer, DUST-funded wallet, or deployed
  v2 contract was available for a live transaction transcript.
- The current checkout includes a large inherited worktree from the previous
  build. These changes were preserved and were not silently committed or pushed.
- Generated Compact source-map warnings remain during tests/builds.
