# CICO Passport Buildathon roadmap

Status: execution roadmap for the Midnight Buildathon. This document owns the
three-wave product cadence and submission evidence. The current Undeployed v2
lifecycle has an operator-verified local run, and its sanitized
manifest/transcript are committed at
[docs/evidence/undeployed-v2/abdd0a2/](docs/evidence/undeployed-v2/abdd0a2/).
This roadmap contains targets and source-status notes, not Preview
transaction, Passport, NFC, CI, test-count, release-SHA, URL, or video
evidence.
[`ROADMAP.md`](ROADMAP.md)
remains the source of truth for cryptographic release gates and
[`FIRST-PUBLIC-DEPLOYMENT.md`](FIRST-PUBLIC-DEPLOYMENT.md) owns the release
runbook.

CICO is an independent, non-binding civic-consultation prototype. It is not an
official election system and makes no mainnet, anti-coercion, human-uniqueness,
biometric-holder, residency, or governmental-election claim.

## Product thesis

Midnight Passport is the persistent, seedless identity and consent surface.
Passport owns passkey onboarding, wallet custody, the visible `.night` profile,
and every profile disclosure. CICO asks Passport for the minimum visible
profile fields and never uses the Passport profile as a voting identity.

Passport evidence is a separate capability. Rarimo is the temporary NFC
evidence provider until a Passport-native credential capability exists. It may
prove nationality, adult class and document assurance; nationality must never
be described as residency. The credential holder opening and voter secret stay
in the browser, while each referendum receives a separate nullifier.

```text
Passport profile / .night name     visible, consented, never in a ballot
             |
             +--> CICO eligibility credential     private holder binding
                              |
                              +--> referendum nullifier     one poll only
                                                   |
                                                   +--> private ballot
```

The product supports global and nationality-restricted consultations.
Geography percentages remain absent until the delayed privacy-preserving
aggregation design in ADR-004 is approved and implemented.

## Buildathon strategy

The program begins with the August 26, 2026 kickoff and uses three connected
waves: build, submit, learn and improve. Dates below are the announced working
calendar and must be revalidated in AKINDO before each submission.

| Wave | Dates | Product outcome | Committed evidence |
| --- | --- | --- | --- |
| Wave 1 | Aug 27–Sep 16 | A public Passport-first showcase people can understand and use | Live Passport profile consent, bilingual synthetic journey, public HTTPS URL and usability evidence |
| Wave 2 | Sep 27–Oct 17 | A physical passport can authorize a real reusable nationality credential | Two-country physical NFC transcript, minimal-claim issuance and deletion/replay evidence |
| Wave 3 | Oct 27–Nov 16 | A polished invited-pilot candidate | Real profile + real credential; a real wallet-less Preview vote only if every security gate passes |

Program references: [Midnight Buildathon overview](https://midnight.network/hackathon),
[kickoff workshop](https://luma.com/midnight-buildathon), and
[AKINDO program](https://app.akindo.io/wave-hacks/jaMZjqPOBsLXvjdG).

## What already exists

| Capability | Evidence today | Status |
| --- | --- | --- |
| Passport-first journey | Deterministic consent-to-receipt unit and browser journeys | Synthetic journey path present; live Passport evidence pending |
| Provider-neutral boundaries | Session, credential and civic-action ports with conformance checks | Source path present; verification pending |
| Passport bridge | Exact origin/source, request ID and nonce binding; embedded and popup paths | Source path present; origin approval pending |
| Credential policy | Issuer-bound reusable leaf, frozen epoch root, global/country/adult/assurance predicates | Exercised by the operator-verified local Undeployed run; manifest/transcript committed at `docs/evidence/undeployed-v2/abdd0a2/` |
| Rarimo boundary | Verified-status gate, request/holder binding, minimal claims, replay state and cleanup | In progress; provider and physical-device evidence pending |
| CICO issuer | Fixture-backed local issuer path, canonical root checks and epoch coordinator | Local run exercised the fixture path; real provider/Preview issuer remains gated |
| Private browser state | Address-scoped AES-GCM IndexedDB state and choice-free receipts | Source path present; recovery evidence pending |
| Public-mode isolation | Demo/showcase cannot activate wallet, relayer, proof, CICO, indexer or real contract ports | Source path present; privacy check pending |
| Seedless onboarding signal | Showcase performs a non-invasive platform-passkey capability check without creating a credential or contacting a wallet | Source path present; no vendor integration claim |
| Vercel release path | Protected-main, pinned Compact/Vercel CLI, strict CSP, local font and exact prebuilt showcase artifact | Workflow present; deployment not verified |
| Physical NFC evidence | Hosted verifier and physical-device transcript | Not yet evidenced |
| Wallet-less v2 action | Atomic sponsored action job and canonical local receipt | Undeployed run verified locally; manifest/transcript committed at `docs/evidence/undeployed-v2/abdd0a2/`; Preview action pending |
| Private geography | Delayed ZK aggregation and audit | Intentionally deferred |

## Pre-wave foundation — Aug 25–27

### Outcome

Prepare a safe `showcase` mode in which Midnight Passport may be enabled only
after origin approval and every credential/vote state is explicitly synthetic.

### Delivery

- Support three modes: `demo` (fully local), `showcase` (Passport-only after
  origin approval), and `preview` (real configured credential/action ports only
  after their runtime gates are evidenced).
- In showcase mode, hard-disable wallet, CICO, Rarimo, relayer, proof, indexer
  and contract initialization even when stale environment variables exist.
- Request only Passport `displayName` by default. Render an approved `.night`
  name as profile presentation, never as credential or voter identity.
- Keep `.night` claiming and management inside Passport; CICO links to Passport
  rather than reimplementing the registry.
- Label the current network split honestly: Passport's current passkey PWA
  transacts on Stagenet/ledger-9; CICO v2 contracts target Preview/ledger-8.
- Ship English and Spanish with browser-language selection and a persistent
  manual switch.

### Public deployment gate

The protected GitHub `public-preview` environment requires
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Build with:

```text
VITE_APP_MODE=showcase
VITE_PASSPORT_ORIGIN=<APPROVED_PASSPORT_ORIGIN>
VITE_MIDNIGHT_CONTRACT_ADDRESS=
VITE_RELAYER_URL=
VITE_MIDNIGHT_PROOF_SERVER_URL=
VITE_PASSPORT_V2_API_URL=
VITE_CICO_REFERENDA_JSON=[]
```

The release uses the pinned `vercel pull` → `vercel build` →
`vercel deploy --prebuilt` workflow. Automatic Git builds remain disabled.
The response must enforce the reviewed CSP, load deep links, and pass the
deployed Passport journeys before the URL is published.

## Wave 1 — public Passport-first product

### Week 1: identity boundary

- Use the interim Passport profile bridge in the showcase journey, with a
  controlled-origin E2E fixture until the official `mn-passport-connect` C23
  package is published and its wire contract is adopted.
- Support Passport-embedded per-field consent and standalone popup consent.
- Add retry, denial, popup-blocked, closed, timeout, malformed-response and
  unsupported-context states.
- Keep an honest “explore without Passport” path that never creates a live
  session badge.
- Show the approved `.night` display name and live/synthetic boundary before
  enrollment begins.

### Week 2: product design

The citizen journey is:

1. Understand the privacy promise.
2. Connect Midnight Passport.
3. Review exactly which profile fields were approved.
4. See nationality verification as a separate optional capability.
5. Explore global and nationality-specific referendum policies.
6. Complete a visibly synthetic vote and choice-free receipt.

Use persistent “Live Passport”, “Synthetic credential”, and “Simulated vote”
labels. Complete mobile-first English and Spanish layouts, shared design
tokens, empty/error/pending/recovery states, a citizen journey map, and an
organizer service blueprint.

### Week 3: validate and submit

- Run eight supervised sessions: four English, four Spanish, including Android
  and iOS.
- Target median time to approved Passport profile below two minutes.
- Require at least 80% of participants to explain which stages are live versus
  simulated.
- Fix the three highest-severity usability failures.
- Submit the public URL, two-minute demo, architecture diagram, privacy model,
  test evidence and exact release SHA.

## Wave 2 — real nationality credential

### Week 1: hosted evidence boundary

- Run a pinned self-hosted Rarimo verificator and dedicated PostgreSQL on a
  private network.
- Run `cico-service` separately with callback authentication, exact origins,
  body/rate limits, durable state and independent issuer secrets.
- Fund and deploy an open Preview credential-registry epoch.
- Expose only verification-request, status, minimal evidence and canonical
  credential-issuance routes. Raw verifier and database routes remain private.

### Week 2: physical enrollment

- Replace fixture enrollment with the QR/mobile NFC handoff.
- Bind verified evidence to the fresh request and browser-held credential
  opening.
- Persist only issuer, nationality, adult class, assurance, validity, epoch and
  holder commitment.
- Delete MRZ, NFC payload, birth date, document/face images, public signals and
  provider proofs after deriving minimal claims.
- Cover retry, expiry, replay, duplicate issuance, offline return and the
  post-confirmation/pre-journal recovery window.

### Week 3: evidence and refinement

- Record successful supervised issuance with one Argentine and one
  non-Argentine NFC passport across three physical devices.
- Prove the Passport profile is absent from the credential leaf.
- Verify nationality is never presented as residency.
- Inspect service/database retention and rerun replay/idempotency suites.
- Submit real Passport profile plus real credential; voting may remain
  simulated.

## Wave 3 — polished pilot and conditional real vote

### Week 1: organizer and policy experience

- Add operator workflows for opening enrollment, freezing an epoch, and
  publishing global or nationality-restricted policies.
- Keep organizer authority independent from Passport profile and participant
  credentials.
- Explain why late enrollment belongs to the next epoch.
- Complete WCAG 2.2 AA review of critical citizen and organizer paths.

### Week 2: conditional wallet-less Preview action

Only start this release path while the ADR-003 gates remain green:

```text
validate -> balance -> finalize -> submit -> indexer confirm
         -> DUST reconciliation -> respond
```

The job requires authentication, idempotency, persisted status, rate limits,
and exact network/contract/circuit allowlists. Proving stays loopback or uses
an explicitly approved provider with visible disclosure. A receipt is created
only after independent indexer confirmation.

If the atomic job, proving boundary or canonical confirmation is not ready,
keep the real credential and simulated vote. Never re-enable `/balance` plus
`/submit`, weaken an allowlist or fabricate a receipt to meet a deadline.

### Week 3: final release

- Run regression, mobile, accessibility, privacy-log, CSP and deployed-browser
  suites.
- Rehearse issuer/verifier outage, Passport denial, indexer lag, relayer
  restart and rollback.
- Publish the URL, privacy model, usability findings and progress across all
  three waves. Include a transaction transcript only if independently
  resolvable.

## Product metrics

Collect no advertising identifiers, third-party analytics or session replay.
Use supervised research records and privacy-minimised operational metrics:

- Passport consent completion and median duration;
- enrollment completion and coarse provider error class;
- eligible-to-proof, proof-to-relay and relay-to-confirmation completion;
- median and p95 proof/confirmation latency;
- pending actions above the service objective;
- receipt/indexer reconciliation, target 100%;
- live-versus-synthetic comprehension during research, target at least 80%.

## Stop-ship conditions

- Showcase mode contacts CICO, Rarimo, a relayer, proof server, indexer or real
  contract.
- Passport responses are accepted from an unpinned origin/source or without a
  matching request ID and nonce.
- A Passport profile field is included in a credential leaf, nullifier,
  witness, receipt or ballot.
- Nationality is presented as residency.
- Raw document/proof data is logged, retained or returned to the browser.
- A failed or unconfirmed transaction produces a confirmed receipt.
- Geography percentages are presented as voter geography before ADR-004's
  delayed aggregation path is implemented and audited.

## Feedback loop and ownership

At each wave close, preserve the submitted SHA and evidence, classify mentor
and user feedback by severity, select the three highest-impact changes, and
freeze the next wave's acceptance criteria before coding. Security boundaries
are reviewed by a different owner than the implementing worker. A local green
test is supporting evidence; the integrated pipeline and deployed browser
journey are the release decision.
