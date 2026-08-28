# CICO Passport product roadmap

Status: working roadmap for a non-binding civic-consultation product targeting
Midnight Preview. This is an outcome-driven plan, not a promise of dates or a
claim that the product is suitable for governmental elections. Source code may
be present while runtime evidence remains pending; this document does not
assert a deployed network, Passport approval, NFC session, release identity,
CI result, test total, URL, or video.

The weekly product and submission cadence for the August–November 2026 program
lives in [`BUILDATHON-ROADMAP.md`](BUILDATHON-ROADMAP.md). This document remains
the source of truth for cryptographic release gates.

## Strategy context

CICO should let a person use one passport-backed civic credential across
global and country-restricted consultations without attaching their identity,
nationality, or Passport profile to a ballot. Midnight Passport is the durable
consent and capability surface. Rarimo is a replaceable evidence adapter until
a Passport-native credential capability is available.

Primary outcomes:

1. A person can understand, enroll, and participate without owning a wallet.
2. A referendum can enforce a frozen passport-backed policy without learning
   who voted or how a country-eligible person voted.
3. A confirmed receipt is independently resolvable through the Midnight
   indexer and reveals no ballot choice or Passport identifier.
4. Replacing Rarimo with a Passport-native provider changes an adapter, not the
   product journey or Compact policy.
5. Preview evidence—not interface copy—determines readiness for an invited
   pilot.

Non-goals for the Preview MVP: mainnet, binding elections, biometric holder
proof, human uniqueness, anti-coercion, individual credential revocation, and
private geography percentages.

## Now / next / later

| Stage | Initiative | Intended outcome | Exit evidence | Status |
| --- | --- | --- | --- | --- |
| Now | Passport-first preview journey | People can understand the trust model and complete a wallet-less demo | Consent-to-receipt journey; explicit synthetic/provider disclosures | Source path present; runtime evidence pending |
| Now | Provider-neutral domain ports | Rarimo and future Passport-native providers remain replaceable | Session, credential, and action conformance checks; no provider transports in use cases | Source path present; verification pending |
| Now | Quality and deployment foundation | Every change has repeatable checks and a safe hosting topology | Compact/API/UI/E2E pipeline, production build, Vercel package, Hostinger separation plan | Configuration present; release checks pending |
| Now | Credential Registry V1 + referendum policy | Claims are issuer-bound and reusable while every referendum pins an exact frozen root | Compact simulator checks, TS/Compact golden vectors, wrong-root and policy rejection | Source path present; current review verification pending |
| Next | Rarimo evidence adapter + issuer | A physical passport verification can authorize a provider-neutral credential for an open enrollment epoch | Server-verified callback, claim-bound authorization, replay/idempotency checks, raw-data deletion check, synthetic and Rarimo conformance parity | In progress; source boundary exists, but trusted verificator, callback approval, funded issuer, physical NFC transcript, and runtime evidence remain gates |
| Now | Credential epoch coordinator | A bounded cohort enrolls, the canonical root freezes, and only then do matching consultations open | Indexer-reconciled enrollment close/freeze transcript; UI states for enrollment, freeze, eligible epoch, and next epoch | Source path present; no committed runtime manifest/transcript |
| Now | Real Midnight v2 action | The browser proves and submits the v2 vote, then waits for canonical confirmation | Fresh issue/cast/reveal/finalize transaction IDs and independent indexer reconciliation | Source path present; fresh Undeployed and Preview evidence pending |
| Now | Atomic sponsored relay | Wallet-less voting cannot double-spend DUST or fund arbitrary actions | Authorization, allowlist, idempotency, concurrency, restart, and indexer-lag checks | Source path present; service/DUST/restart transcript pending |
| Next | Encrypted private state and receipts | Refresh/restart recovery does not require cleartext browser persistence | Threat model, encrypted IndexedDB checks, export/recovery UX, no sensitive storage/log matches | In progress; runtime recovery and durable receipt evidence pending |
| Later | Invited Preview pilot | A small cohort completes real passport-backed consultations reliably | Acceptance funnel, support runbook, incident exercise, privacy review, uptime/error data | Gated |
| Later | Geography decision | Country participation reporting has an honest privacy and trust model | Explicit approval of public opt-in or delayed ZK aggregation; dedicated audit | Human decision gate |
| Later | Passport-native credential adapter | Passport becomes the credential provider when its supported capabilities permit it | Adapter conformance parity and migration rehearsal; no Compact/use-case rewrite | Capability-gated |

## Release sequence and acceptance gates

### R0 — executable local product slice (complete)

Scope: provider-neutral ports, deterministic Passport journey, World/Argentina
policy UX, choice-free receipt, quality/CI, production build, headless browser
tests, and static-host packaging.

Gate:

- all Compact, API, and UI tests pass;
- the critical Passport journey passes in Chromium;
- production dependencies have zero known npm audit findings;
- targeted storage/log scans contain no sensitive values;
- Preview copy never represents a synthetic credential as real.

### R1 — cryptographic vertical slice

Scope: `CredentialRegistryV1`, referendum v2, claim-bound leaf, frozen-root
policy, country/adult/assurance predicates, vote nullifier, and referendum-bound
ballot commitment.

Gate:

- Compact compiles with the repository-pinned compiler;
- TypeScript and Compact golden vectors match;
- every claim, secret, blind, domain, and referendum ID sensitivity case passes;
- issuance after freeze and membership against another root fail;
- public transcript and ZKIR review find no country, age, holder binding,
  credential opening, choice, or salt disclosure in `castVote`.

Source status: the contract and policy boundaries are in the checkout. The
remaining evidence belongs to R2/R3 and requires a fresh local/Preview runtime
transcript rather than additional prose or simulator claims.

### R2 — real passport enrollment

Scope: Rarimo adapter, CICO issuer, callback verification, blinded holder
binding, credential vault, status/retry/recovery UI, and an explicitly open
credential enrollment epoch.

Gate:

- only server-verified provider results authorize issuance;
- browser `verified`, country, age, and uniqueness claims are ignored;
- provider replays and duplicate issuance are rejected idempotently;
- an arbitrary or claim-modified evidence authorization cannot mint a
  credential;
- issuer never receives the voter secret or holder blind;
- MRZ, NFC payload, face image, birth date, and raw provider result are neither
  logged nor retained after the minimum verified claims are derived.

Source status: the provider-neutral request, claim binding, minimal-claim
boundary, replay/idempotency model, cleanup path, QR interaction, HTTP façade,
issuer runtime, and Preview-only process are represented in the checkout. A
trusted/pinned verificator, authenticated callback, funded and deployed
registry, physical-phone/NFC transcript, and recovery across the
post-confirmation/pre-journal crash window remain required evidence gates.

### R3 — real Preview consultation

Scope: enrollment close and registry freeze, browser private-state integration,
local/approved proving disclosure, v2 contract deployment, sponsored action,
indexer receipt, organizer close/reveal/finalize, and result view.

Gate:

- one fresh end-to-end Preview transcript is independently reproducible;
- every selectable referendum uses the frozen root and epoch containing the
  browser-held credential; late enrollees are routed to the next epoch;
- failed/unconfirmed actions stay pending and never create confirmed receipts;
- voter, issuer, organizer, and relayer keys are independent;
- contract/circuit/network allowlists reject all other relay work;
- two concurrent jobs cannot reuse a DUST input.

Source status: registry/referendum assets, typed witnesses, address-scoped
private state, contract-specific providers, canonical root/path binding,
browser-owned choice/witness preparation, choice-free receipts, pending
confirmation recovery, and environment-driven composition exist in the
checkout. The issuer/coordinator and catalog fail-closed boundaries are part
of the source design. The v2 operator command, one-time capability issuer,
durable relay, restart path, and indexer-only receipt lookup still need a fresh
Undeployed transcript and independent review. No current transaction or
indexer observation is asserted here. ADR-006 deliberately rejects an
immediate passport scan against an already-frozen live referendum.

### R4 — invited pilot

Scope: HTTPS pilot domain, Vercel static UI, hardened Hostinger VPS relay,
operator monitoring, support/recovery, accessibility, and an approved
geography decision.

Gate:

- pilot threat model and privacy disclosures are approved;
- physical-device Passport/NFC coverage meets the agreed device matrix;
- accessibility critical paths pass automated and manual checks;
- relayer restart and indexer-lag exercises complete without duplicate work or
  false receipts;
- a stop/rollback procedure is rehearsed.

## Workstream dependencies

```text
Credential schema + golden vectors
        |
        +--> CredentialRegistryV1 --> frozen root
        |                              |
Rarimo callback --> issuer/vault ------+--> referendum v2 --> Preview action
                                                               |
Passport consent/capabilities ---------------------------------+
                                                               |
Atomic relayer + indexer receipt -------------------------------+--> pilot
```

Geography is not on this critical path. It is a separate privacy workstream
after the first passport-backed vote works.

## Agent and model orchestration

Use one owner for every cryptographic or shared boundary. Agents work in
parallel only when their file ownership does not overlap.

| Role | Recommended model | Owns | Must not own concurrently |
| --- | --- | --- | --- |
| Root integrator / security reviewer | GPT-5.6 Sol, xhigh | Architecture, shared interfaces, manifests, generated assets, integration, final gates | A second root/integrator |
| Compact contract worker | GPT-5.6 Sol, xhigh | Compact source, simulator tests, golden vectors, disclosure review | Manifests, generated assets, UI |
| Credential/provider worker | GPT-5.6 Terra, high or xhigh | Rarimo adapter, issuer callback, vault, provider conformance | Compact schema after freeze, relayer wallet |
| Product/UX worker | GPT-5.6 Terra, high | Journey, accessibility, organizer UI, Playwright specifications | Provider verification or cryptographic claims |
| Quality/operations worker | GPT-5.6 Luna, xhigh for bounded checks; Terra high for deployment code | CI, test matrices, deploy scripts, monitoring, runbooks | Product/crypto decisions |

Why: cryptographic schema and integration failures have the highest blast
radius and need the strongest reasoning model. Terra is the default for
well-bounded product and adapter implementation. Luna is efficient for
isolated test, audit, and documentation packages with frozen acceptance
criteria. A faster model never approves its own security boundary.

Every work package freezes acceptance criteria first and hands back: objective,
files, commands, invariants, remaining risks, and exact next dependency. The
root re-runs the whole pipeline; an agent's local green test is supporting
evidence, not integration approval.

## Product metrics

Before a real pilot, collect only privacy-minimised operational metrics:

- consent-to-enrollment completion and median duration;
- enrollment failures by coarse provider/error class, never document or person;
- eligible-to-proof, proof-to-relay, and relay-to-indexer-confirmation success;
- median and p95 proof/confirmation latency;
- pending actions older than the service objective;
- receipt/indexer reconciliation rate (target 100%);
