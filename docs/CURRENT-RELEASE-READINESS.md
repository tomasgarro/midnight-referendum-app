# Current release readiness

Status: working readiness snapshot for the checkout reviewed on 31 August
2026, revised the same day after a full user-action audit and a journey
rebuild. This is not a release approval or a Midnight Preview transaction
record. A static demo URL exists (below); no Preview release SHA is assigned.

Two companion documents carry the detail this page summarises:

- [`USER-ACTION-MATRIX.md`](USER-ACTION-MATRIX.md) — every CTA, what it
  actually does, what it depends on, and whether its copy is honest.
- [`UX-FINDINGS-20260831.md`](UX-FINDINGS-20260831.md) — the findings from
  that audit, with what was fixed and what remains open.

## Release boundary

The current release is a voting-first, passport-aware civic consultation with
an honest synthetic fallback. It can explain the privacy model and exercise a
simulated enrollment and vote without a wallet, funds, Passport credential,
Rarimo device, hosted issuer, relayer, or Preview network. Every simulated
credential, vote, and receipt must be labelled as simulated.

The current source uses open enrollment: the registry remains append-only while
the published enrollment window is open, and a referendum may accept later
roots through the separately attested root-publisher path. The historical
artifact at [`evidence/undeployed-v2/abdd0a2/`](evidence/undeployed-v2/abdd0a2/)
uses the older frozen-before-deploy model and is not current release evidence.

## Capability boundaries

| Capability | Current release position | Evidence needed before a live claim |
| --- | --- | --- |
| Passport | Session, consent, and optional display profile only. A real profile/session handshake is evidenced; profile fields never authorize eligibility or a vote. | Fresh approved-origin/network transcript if the deployment changes, plus independent privacy review. |
| Rarimo | Temporary NFC evidence adapter behind `cico-service`; only minimal issuer-bound claims cross the boundary. | Pinned self-hosted verifier, authenticated callback, physical-device NFC transcript, deletion/retention inspection, and replay tests. |
| Eligibility | Synthetic fallback is available and labelled. A real credential requires a trusted provider result and issuer receipt. | Fresh Preview issuance transcript tied to the exact release SHA and registry. |
| Voting | Primary product action. The browser owns choice, voter secret, opening, and witness; confirmed receipts come from the indexer. | Fresh Preview cast/reveal/finalize transcript, relay authorization review, and independent indexer reconciliation. |
| Wallet/recovery/biometric/ETH | Not current release requirements. These are optional post-Preview Profile/Vault capabilities. | Separate product, threat-model, and recovery decisions; no current release may imply they exist. |
| Geography | Separate privacy decision; no private country aggregation is claimed. | Approved ADR-004 design and dedicated audit. |

## Readiness gates

| Gate | Current state | Release rule |
| --- | --- | --- |
| Static web artifact | **Current synthetic jury demo deployed 1 September 2026** at `https://lightskyblue-emu-103266.hostingersite.com/`. Archive SHA-256: `99FC4EAE91F4B6E8249D5EDEED6FBDC5936651B31CD7026B01D6DF231DE35529`; all 79 files match `ui/dist`; HTTPS render and first-action smoke checks passed without browser errors. | Publish only the reviewed artifact with an exact SHA, HTTPS, interaction smoke test, and privacy/network check. |
| Host topology | Target is Hostinger static web plus isolated Hostinger VPS stateful services. | Static hosting never receives service secrets; issuer, verifier, database, and relayer remain isolated on stateful infrastructure. |
| Synthetic fallback | Intended and required when live dependencies are absent. | Fallback is explicit and cannot emit live credential, vote, or canonical-receipt wording. |
| Passport session | A live profile/session handshake is evidenced at [`evidence/passport-live/2026-08-31-first-real-session.md`](evidence/passport-live/2026-08-31-first-real-session.md). The observed flow required the person's consent sheet, not origin allowlisting; it returned no Preview address or credential. | Request only the approved profile/session capabilities; reject wrong origin, network, nonce, or schema, and rerun for any changed release origin. |
| Rarimo/NFC | Adapter boundary exists; physical evidence and hosted verifier are unverified. | Never describe fixtures or source adapters as genuine NFC verification. |
| Preview contracts | No current Preview deployment or receipt is asserted. | Require a fresh manifest/transcript for the exact release SHA and network. |
| Stateful action relay | Source path exists; hosted operations and Preview evidence are unverified. | Require authenticated, idempotent, allowlisted actions and indexer confirmation before calling a receipt confirmed. |
| Privacy/security review | Design constraints are documented; independent audit is pending. | Scan logs, bundle, storage, and network behavior before any invited pilot. |
| Citizen-journey honesty | Audited 31 August 2026 against every CTA. One correctness defect (simulated receipts overwrote each other) and three misleading states were found and fixed; four gaps remain open. | No screen may report a failure for a capability the build does not use, or present fixture material as runtime material. |

## Historical evidence policy

The preserved Undeployed v2 record is useful evidence of an older local
implementation, not a current release result. It is tied to:

- source commit `abdd0a2203fbef909f70f6ddc06681ac1327f457`;
- source tree `9d1319aa3540a0943f760631ec3ac9c9e5b40b36`;
- manifest digest `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`;
- the old frozen registry lifecycle, including `registry.freeze`.

Keep its JSON and Markdown transcript unchanged. A new run must produce a new
manifest, transcript, and exact source binding; it must not overwrite or
reinterpret the historical artifact.

## Before publishing

1. Choose the release SHA and record it in a reviewed release record.
2. Build the static UI for Hostinger and verify that missing live configuration
   selects the labelled synthetic fallback.
3. Confirm that Passport is used only for consent/session/profile display.
4. If enabling real enrollment, complete the Rarimo verifier, issuer, NFC,
   deletion, and replay gates before exposing it to participants.
5. If enabling real voting, complete the Preview contract, action-relay,
   proving, DUST, restart, and canonical-indexer gates.
6. Publish only the URL, exact SHA, reviewed status, and evidence links that
   were actually verified.

## Known open gaps in the citizen journey

These are recorded here, not only in the findings document, because each one
would be visible to a participant in a pilot:

| Gap | Effect on a participant | Reference |
| --- | --- | --- |
| No abort signal on `CivicActionPort` | A submission cannot be cancelled once started. The UI states this rather than offering a cancel that does nothing. | F-11 |
| Runtime referenda render fixture dossier prose | A real Preview referendum would be presented with arguments and sources written for a fictional consultation. **Must be resolved before any real referendum is published.** | F-12 |
| No offline state | A dropped connection surfaces as a provider error string, not as "you are offline". | F-13 |
| No unsupported-device detection | A desktop-only or non-NFC user discovers the problem only after scanning the QR. | F-14 |
| No duplicate-vote reminder | Nothing warns that this credential already voted on a consultation; the chain rejects it, but only after proof generation. | F-15 |
| Physical NFC never tested | The entire NFC path is unobserved on hardware. This remains the single largest unverified claim. | Matrix §1 |

## Deployed synthetic jury artifact

The current synthetic fallback was built with `VITE_APP_MODE=demo` and packaged
with `index.html` at the ZIP root:

- local path: `deploy/hostinger/artifacts/ui_jury-demo.zip`;
- SHA-256: `99FC4EAE91F4B6E8249D5EDEED6FBDC5936651B31CD7026B01D6DF231DE35529`;
- privacy scan: `npm run verify:showcase` passed;
- archive comparison: all 79 files match the reviewed `ui/dist`;
- hosted verification: HTTPS 200, expected rendered jury copy, SPA fallback,
  and first interactions at 320/390/tablet/desktop passed without horizontal
  overflow, page errors, or console errors;
- response headers: the host supplies only
  `Content-Security-Policy: upgrade-insecure-requests`; HSTS, `nosniff`, frame,
  referrer, and permissions policies are not yet present;
- build caveats: the main JavaScript bundle remains about 5.1 MB and the
  ledger WASM about 10.1 MB; the Midnight indexer dependency also emits an
  `isomorphic-ws` browser-export warning during Vite build.

This is the artifact currently served at
`https://lightskyblue-emu-103266.hostingersite.com/`. The evidence proves the
synthetic UI artifact, route fallback, and responsive first interactions.
Response-header hardening remains a separate release gate.

For the deployment gate list, see
[`../deploy/hostinger/VPS-READINESS-CHECKLIST.md`](../deploy/hostinger/VPS-READINESS-CHECKLIST.md),
which enumerates every missing value without recording any of them.

See [`README.md`](../README.md) for the public-facing summary,
[`DEPLOYMENT.md`](DEPLOYMENT.md) for the Hostinger topology,
[`ENVIRONMENT-ACCEPTANCE.md`](ENVIRONMENT-ACCEPTANCE.md) for environment gates,
and [`adr/ADR-007-open-enrollment-and-evidence-roles.md`](adr/ADR-007-open-enrollment-and-evidence-roles.md)
for the current enrollment and evidence decisions.
