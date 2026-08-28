# Wave 1 submission checklist

This is the evidence handoff for the Passport-first CICO prototype. It is
deliberately honest about what is verified locally, what still requires an
external provider or deployment, and what must be collected from users.

Status date: 2026-08-27  
Current review checkout: `de0d247` plus uncommitted Wave 1 changes  
Release SHA: **not assigned until the reviewed worktree is committed**

## Evidence already available

- [x] Mobile-first Passport showcase rendered and inspected at 320px and
      390px.
- [x] Four-stage learning flow: Understand → Passport → Eligibility → Vote.
- [x] Persistent `LIVE PASSPORT`, `SYNTHETIC CREDENTIAL`, and `SIMULATED
      VOTE` labels.
- [x] Passport profile/session adapter is isolated behind
      `PassportSessionPort` and requests only `session` + `profile`.
- [x] Popup handshake validates origin, source window, request ID, and nonce.
- [x] Anonymous exploration never creates a live Passport session badge.
- [x] Showcase stage transitions move focus to the new lesson heading instead
      of leaving focus on the control that just disappeared.
- [x] Midnight DApp Connector v4 discovery, network validation, and
      `hintUsage()` permission intent are provider-neutral and passkey-ready;
      multiple injected wallets get an explicit chooser with metadata safety
      checks.
- [x] Showcase mode cannot contact the wallet, relayer, proof server, indexer,
      CICO, Rarimo, or contract routes, and does not display a wallet control.
- [x] Windows UI suite: 19 files / 103 tests passed, including the passive
      platform-passkey readiness building block.
- [x] Repository Biome quality check exits successfully after applying the
      repository's LF text policy; remaining diagnostics are non-blocking
      warnings in legacy provider/SDK boundary code.
- [x] Showcase production build passed.
- [x] Local prebuilt showcase artifact passed the privacy-boundary, popup
      `WindowProxy`, and 320px/390px viewport E2E checks: 3 Chromium tests.
- [x] Public showcase bundle privacy gate passed: five text assets scanned for
      operator secrets and private loopback service endpoints.
- [x] Chromium showcase E2E: public journey and real `WindowProxy` popup
      handshake passed.
- [x] Undeployed Chromium E2E: multiple injected v4 wallets rendered safely,
      duplicate-RDNS warning appeared, and the user-selected connector was the
      only connector contacted.
- [x] Node health and Proof Server `8.1.0`/`V2` endpoints responded locally.
- [x] Local Undeployed Vite development server at `http://localhost:4173` and
      built preview at `http://localhost:5177` served the reviewed checkout;
      Chromium completed the Passport-first journey, synthetic-credential
      check, runtime-boundary check, 320px/390px mobile overflow regression,
      and primary CTA/fixed-navigation regression: 6 tests passed.
- [x] Real local Undeployed transaction lane completed: eligibility issuance
      transaction `cafcbf7f0f4de47e261cbe9dab7dd04ff28868aa0ce13e9be9f79b351bbc7d76`
      and private ballot transaction
      `6fca57dc110332a7ad8897a7fd7caa4f81579a5ec717d2d9d92553db9f46b512`
      reached block `2942` with `SucceedEntirely`. The voter secret, salt, and
      choice were ephemeral and are not recorded.
- [x] Full Linux-native verification exits cleanly from the isolated ext4 WSL
      checkout: Compact compilation, contract simulators, API (32 tests), CICO
      (30), and the then-current UI suite (18 files / 95 tests) passed with
      Linux Node 22.22.0 and Compact compiler 0.31.1. The later browser-only
      passkey-readiness test is covered by the current Windows UI total above.
- [x] Opt-in browser-side sponsored-relayer lane completed on the local
      Undeployed stack at 390px: browser providers initialized, the fixture
      eligibility was found, the proof was balanced/submitted by the relayer,
      and the UI rendered a confirmed `Undeployed local` receipt. The fixture
      secret, vote salt, and choice were not recorded.

## Evidence still required before calling the submission release complete

- [ ] Commit the reviewed worktree and record the exact release SHA.
- [x] Run the full Linux-native verification path and retain its output.
- [ ] Verify the real Passport profile flow from the final HTTPS origin.
- [ ] Confirm CICO registration/approval in the relevant Passport directory.
- [ ] Test a real Midnight DApp Connector wallet on the selected network.
- [ ] Confirm the selected wallet's public RDNS/API compatibility; do not infer
      Gero integration from PassKey authentication alone.
- [ ] Publish the showcase at HTTPS without exposing private service routes.
- [ ] Complete eight supervised sessions: four English and four Spanish,
      across Android and iOS.
- [ ] Record the two-minute walkthrough and architecture/privacy explanation.

## Local reproduction

Run from the Linux-native WSL checkout:

```bash
npm ci
npm run devnet:up
npm run verify:linux -- demo
```

For the browser showcase, build and serve the prebuilt artifact:

```bash
npm run build --workspace midnight-referendum-ui -- --mode showcase
npm run preview --workspace midnight-referendum-ui -- --host localhost --port 4173 --strictPort
```

Open `http://localhost:4173`, not `127.0.0.1`. The browser journey is
wallet-less and synthetic in showcase mode; the local undeployed transaction
path is a separate development lane.

## Two-minute walkthrough

1. **0:00–0:20 — promise:** open the Passport-first journey and point out the
   three truth labels. Explain that profile, credential, and vote are separate
   capabilities.
2. **0:20–0:45 — consent:** show that the request is only the approved display
   name. If using the controlled local fixture, label it as a fixture; do not
   call it Passport approval.
3. **0:45–1:10 — wallet lesson:** explain that Passport identity and wallet
   transaction approval have different jobs. Mention passkey-first approval
   as the target direction, not as a shipped Gero integration.
4. **1:10–1:40 — eligibility and poll:** create the synthetic credential,
   choose global or country-shaped participation, and state that nationality
   verification is not active in this public showcase.
5. **1:40–2:00 — receipt:** complete the simulated vote and show that the local
   receipt exposes only the public completion facts, not the choice or profile.

## Privacy-safe user-study record

Record one row per session. Never record names, Passport data, document images,
wallet addresses, voter secrets, credential openings, political choices, or
raw screenshots containing them.

| Field | Value |
| --- | --- |
| Session code | `S-___` |
| Language | English / Spanish |
| Device class | Android / iOS; coarse model only |
| Browser | Chrome / Safari / other |
| Passport profile time | seconds or `not completed` |
| Identified live Passport correctly | yes / no |
| Identified synthetic credential correctly | yes / no |
| Identified simulated vote correctly | yes / no |
| Recovery failure | denied / closed / blocked / timeout / none |
| One comprehension issue | short paraphrase, no personal data |

Wave 1 targets: median approved-profile time under two minutes, at least 80%
correct live-versus-synthetic identification, and three ranked changes for
Wave 2.

## Release boundary

The official [Midnight Passport SDK](https://github.com/midnightntwrk/midnight-passport-sdk)
currently describes a planning/spec repository with a reduced beta. This
prototype therefore keeps the interim profile bridge behind a replaceable port
and does not claim official C23 integration. The [compatibility matrix](COMPATIBILITY-MATRIX.md)
and [Wave 1 execution plan](WAVE-1-EXECUTION-PLAN.md) remain the technical
source of truth for the local stack and deferred gates.
