# Wave 1 execution plan — local-first Passport referendum showcase

Status: active execution plan for the August 27–September 16, 2026 buildathon
wave. The local Undeployed v2 stack is the next release gate, and its runtime
evidence is not verified in the current review checkout. Vercel and custom
domain work remain parked until local evidence is independently reviewed. The
cryptographic release gates remain in [`ROADMAP.md`](ROADMAP.md), and the
deployment procedure remains in [`FIRST-PUBLIC-DEPLOYMENT.md`](FIRST-PUBLIC-DEPLOYMENT.md).

## Outcome

Publish a small, honest, mobile-first CICO showcase that lets a person:

1. Understand what is private and what is not.
2. Connect Midnight Passport and approve only the visible display name.
3. See a synthetic eligibility credential clearly labelled as synthetic.
4. Explore a global or country-shaped consultation.
5. Complete a simulated vote and receive a choice-free local receipt.

The public wave does not issue a real credential, read a real passport, submit
a transaction, run a relayer, or claim to be an official election system.

## Baseline entering Wave 1

- The current checkout contains the Passport-first showcase, deployment
  hardening, and the Vercel install-lifecycle fix. These changes still need a
  deliberate review/commit before they can be described as `main`.
- The showcase is bilingual (English/Spanish), camera-free, and isolated from
  CICO, Rarimo, the proof server, the relayer, the indexer, and real contracts.
- The Passport bridge validates origin, source window, request ID, and nonce;
  it supports standalone popup and embedded Passport contexts.
- The Vercel workflow builds one pinned prebuilt artifact and smoke-tests it.
- A Vercel project, GitHub deployment secrets, a verified public URL, and
  physical user sessions are still external gates.

## Kickoff-deck rules adopted for this wave

The supplied `Buildathon/Hackathon_Buildathon Kickoff.pptx` deck is treated as
buildathon guidance, not as a command to ship every example in the deck. Its
curated links are copied into [`BUILDATHON-RESOURCES.md`](BUILDATHON-RESOURCES.md).

- Build and demonstrate on `undeployed` first. Keep the node, indexer, and
  proof server local and aligned; no faucet or public Preview dependency is
  needed for the core buildathon path.
- Explain privacy with the one-way data model: private values enter through
  witnesses, failed assertions stay local, and only explicit `disclose()`
  values become public ledger state.
- Keep wallet integration flexible. Lace is the reference path, while 1AM,
  Gero, and Wallet SDK are ecosystem options rather than Wave 1 requirements.
- Use the deck's official resources for installation, local-dev setup, the
  compatibility matrix, Midnight Expert/Midskills, and Compact documentation.

## Passport SDK fit

The [official Midnight Passport SDK repository](https://github.com/midnightntwrk/midnight-passport-sdk)
currently describes a planning/spec repository with a reduced beta scope and
planned packages such as `mn-passport-core`, `mn-passport-protocol`,
`mn-passport-contract`, and `mn-passport-connect`.

Its beta roadmap separates two concerns that matter to this app:

1. Passport identity: sign in and read a profile such as `{ name, account }`.
2. Passport custody/onboarding: ACC deployment, name claim, sponsored fees,
   and external Dynamic/BCW dependencies.

Wave 1 only needs the first boundary. Our existing `PassportSessionPort` and
`MidnightPassportSessionAdapter` remain the seam for the live profile/session
flow; the synthetic credential, referendum eligibility, and local chain wallet
stay separate. Do not add an unreleased Passport package or claim that a
profile/session is a civic credential. When the official protocol/connect
packages are published and their wire contract is stable, add an adapter behind
this seam and retain the same truth labels and consent rules.

## Work lanes

### Lane A — prove the local undeployed vertical slice

1. Start the pinned local Node, Indexer, and Proof Server stack and capture
   health output.
2. Regenerate the checked-in Compact assets in Linux/WSL2 and run the repository
   verification commands; retain observed output for review.
3. Run `npm run evidence:undeployed:v2`, then review the generated manifest and
   transcript before treating any transaction/indexer observation as evidence.
4. Keep the local browser journey on `http://localhost:4173` and verify that
   the UI can explain the three services and the privacy boundary.

### Lane B — Passport identity boundary

1. Verify the live Passport profile/session flow only from a valid `localhost`
   or HTTPS origin; keep the local Undeployed chain wallet as a separate
   capability.
2. Confirm the request asks only for `session` and `profile`, handles denial,
   popup closure, timeout, and retry, and never turns profile data into a
   credential or voting identifier.
3. Keep the browser E2E handshake test routed to a controlled Passport origin
   so it validates a real popup `WindowProxy` without claiming external
   Passport approval.
4. Predeclare the narrow wallet intent with DApp Connector `hintUsage()` so a
   compatible wallet can present proving, balancing, DUST, and submission
   approval as an explicit permission surface.
5. Track the official Passport SDK's protocol/package release as an external
   dependency. Replace the bridge through the existing port only after the
   official wire contract is available.

### Seedless wallet target and protocol guardrails

- Treat Gero's PassKey/passkey experience as the preferred seedless direction
  for the real voting wallet, while keeping the Wave 1 code provider-neutral
  through the Midnight DApp Connector boundary. Do not make a showcase build
  depend on a vendor wallet or claim that a passkey wallet is already wired.
- Keep Passport identity and transaction approval as separate user decisions:
  Passport may share an approved profile field, while the Midnight wallet must
  separately approve any referendum transaction and its DUST fees.
- Do not design a Passport-to-referendum or credential-to-referendum
  contract-to-contract call on the pinned Compact 0.31.1 / ledger-v8 target.
  Passport/profile, evidence, and credential orchestration stay off-chain; the
  referendum contract receives only the narrow public inputs its current
  circuit supports, with the private vote and witness data handled locally.
  Newer Compact releases document cross-contract calls, but migrating this
  compatibility line is outside Wave 1 and requires a fresh review.

### Lane C — mobile-first journey

The showcase uses four visible phases: Understand → Passport → Eligibility →
Vote. Each screen follows these rules:

- one primary action, with a quiet secondary escape;
- 48px or larger touch targets and no hover-only meaning;
- readable at 320px and 390px widths without horizontal scrolling;
- short paragraphs, stacked choices, and controls reachable with one thumb;
- persistent truth labels: `LIVE PASSPORT`, `SYNTHETIC CREDENTIAL`, and
  `SIMULATED VOTE`;
- a short lesson between Passport identity and eligibility that explains the
  wallet boundary and names the passkey-friendly direction without implying a
  live Gero integration;
- explicit states for popup blocked, denial, closure, timeout, malformed
  response, retry, and anonymous exploration;
- English and Spanish content parity, including labels and error copy;
- reduced-motion support before adding decorative transitions.

### Lane D — research and submission evidence

Run eight supervised sessions during Wave 1: four English and four Spanish,
including Android and iOS. Record only privacy-minimised research notes:

- median time to approved Passport profile: target under two minutes;
- at least 80% correctly identify live versus synthetic stages;
- top three comprehension or recovery failures;
- device, browser, language, and coarse error class;
- no names, passport data, wallet addresses, document images, or political
  choices in research notes.

Wave 1 submission package:

- [submission checklist and evidence handoff](WAVE-1-SUBMISSION-CHECKLIST.md);
- public HTTPS URL and exact release SHA;
- two-minute walkthrough video;
- architecture/trust-boundary diagram;
- privacy explanation;
- test and deployment evidence;
- user-testing findings and the three changes selected for Wave 2.

### Lane E — deployment, parked

After Lane A is reproducible and the local journey is reviewed, resume the
public deployment track: fix the Vercel project/environment configuration,
run the protected manual workflow, verify CSP/deep links/live Passport from
the deployed origin, and only then attach a custom Hostinger-managed DNS
subdomain. Do not spend on Vercel or make DNS changes during the local proof
phase.

## Appllama-informed design loop

The project can use the principles described by
[Appllama MCP](https://appllama.io/mcp) and
[Appllama Skills](https://github.com/Appllama/appllama-skills) without making
Appllama a runtime dependency:

1. Study comparable onboarding, progress, consent, error, and receipt patterns
   when the MCP is available.
2. Extract principles rather than copying brand assets or screens.
3. Build the smallest native-feeling web equivalent: clear hierarchy, one
   thumb-sized next action, deliberate navigation, and useful recovery.
4. Verify the full journey at 320px, 390px, tablet, and desktop widths, with
   keyboard navigation and reduced motion enabled.

For this product, the design bar is comprehension and trust, not conversion:
the user must understand which parts are live before interacting with the
synthetic credential or simulated vote.

## Wave 1 acceptance checklist

The boxes below are acceptance criteria, not completed evidence. They are
intentionally unchecked in this review checkout; check them only after the
corresponding run is observed and independently reviewed. Do not copy prior
local test totals, transaction identifiers, release SHAs, CI results, hosted
URLs, or video references into this plan.

- [ ] Pinned local Node, Indexer, and Proof Server containers are healthy.
- [ ] Local referendum deployment and a private fixture vote have been
      exercised against the undeployed stack.
- [ ] Compact assets, contract/API/CICO checks, and the production build pass on
      the Linux/WSL2 path.
- [ ] Biome repository quality check exits successfully; remaining diagnostics
      are non-blocking warnings in legacy provider/SDK boundary code.
- [ ] Full Linux-native verification exits cleanly from an ext4 WSL checkout;
      observed output is attached to the reviewed evidence record.
- [ ] Four-phase mobile progress indicator.
- [ ] Live/synthetic/simulated labels remain visible throughout the showcase.
- [ ] Passport connection requests only the approved profile capability.
- [ ] Passport identity and Midnight wallet approval are explained as separate
      decisions in the mobile journey.
- [ ] DApp Connector v4 permission intent is predeclared with `hintUsage()` and
      remains provider-neutral for a future passkey wallet.
- [ ] Multiple compatible injected wallets are user-selectable; connector
      names/icons are treated as untrusted metadata and duplicate RDNS claims
      produce a visible warning.
- [ ] Showcase mode removes the wallet affordance entirely so Passport remains
      the only identity entry point in the public learning flow.
- [ ] Local Chromium E2E covers the Passport popup handshake with a controlled
      `WindowProxy` and controlled origin.
- [ ] Local Undeployed Vite smoke covers the functional journey, synthetic
      credential label, runtime-boundary check, and 320px/390px mobile overflow
      regression plus the browser wallet chooser, duplicate-RDNS warning, and
      explicit second-wallet selection plus the fixed-nav CTA regression.
- [ ] Local prebuilt showcase artifact covers the isolated bilingual journey,
      real popup `WindowProxy` handshake, and 320px/390px viewport regression
      when the controlled run is reviewed.
- [ ] Generated showcase bundle passes the privacy gate for operator secret
      identifiers and private loopback service endpoints.
- [ ] Opt-in browser-side sponsored-relayer transaction lane reaches a
      confirmed local receipt at 390px without a browser wallet; the wallet
      approval path remains separately provider-backed.
- [ ] Anonymous exploration never creates a live Passport session badge.
- [ ] Stage transitions move focus to the new lesson heading for keyboard and
      switch-access users, with a visible focus treatment.
- [ ] Camera, CICO, Rarimo, relayer, proof, indexer, and contract ports remain
      disabled in showcase mode.
- [ ] English/Spanish language switch persists locally.
- [ ] Vercel manual workflow completes successfully (parked).
- [ ] Deployed CSP and deep-link smoke tests pass (parked).
- [ ] Live Passport popup/embedded flows are verified from the deployed origin
      (parked).
- [ ] CICO is registered/approved in the relevant Passport app directory.
- [ ] Eight supervised sessions are complete and summarized.
- [ ] Final Wave 1 video and submission package are complete.

## Deferred mascot direction

The capybara is a future product character, not a Wave 1 dependency. Keep the
visual direction in mind as a warm, calm guide for onboarding, explanations,
waiting, success, and recovery. Before production use, create an original
character sheet and animation rules rather than copying the attached sticker.

Future mascot backlog:

- static pose set for welcome, explain, waiting, success, and retry;
- accessible text alternatives and a setting to reduce or disable animation;
- small lightweight assets that do not compromise first-load performance;
- motion tested across mobile browsers before inclusion in the core journey.

## Wave 1 definition of done

Wave 1 is complete when a first-time mobile user can finish the public journey,
explain what Passport did and did not share, identify the credential and vote as
simulated, and recover from a denied or closed Passport window. The deployment
must be reproducible from protected `main`, and the public URL must not expose
private service routes or imply a real vote.
