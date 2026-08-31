# Current release readiness

Status: working readiness snapshot for the checkout reviewed on 31 August
2026. This is not a release approval, a hosted URL, or a Midnight Preview
transaction record. No release SHA has been assigned.

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
| Passport | Session, consent, and optional display profile only. Profile fields never authorize eligibility or a vote. | Approved HTTPS origin, real session transcript, and independent privacy review. |
| Rarimo | Temporary NFC evidence adapter behind `cico-service`; only minimal issuer-bound claims cross the boundary. | Pinned self-hosted verifier, authenticated callback, physical-device NFC transcript, deletion/retention inspection, and replay tests. |
| Eligibility | Synthetic fallback is available and labelled. A real credential requires a trusted provider result and issuer receipt. | Fresh Preview issuance transcript tied to the exact release SHA and registry. |
| Voting | Primary product action. The browser owns choice, voter secret, opening, and witness; confirmed receipts come from the indexer. | Fresh Preview cast/reveal/finalize transcript, relay authorization review, and independent indexer reconciliation. |
| Wallet/recovery/biometric/ETH | Not current release requirements. These are optional post-Preview Profile/Vault capabilities. | Separate product, threat-model, and recovery decisions; no current release may imply they exist. |
| Geography | Separate privacy decision; no private country aggregation is claimed. | Approved ADR-004 design and dedicated audit. |

## Readiness gates

| Gate | Current state | Release rule |
| --- | --- | --- |
| Static web artifact | A locally reviewed synthetic ZIP exists; no hosted URL is yet evidenced. | Publish only the reviewed artifact with an exact SHA, HTTPS, deep-link smoke test, and privacy/network check. |
| Host topology | Target is Hostinger static web plus isolated Hostinger VPS stateful services. | Static hosting never receives service secrets; issuer, verifier, database, and relayer remain isolated on stateful infrastructure. |
| Synthetic fallback | Intended and required when live dependencies are absent. | Fallback is explicit and cannot emit live credential, vote, or canonical-receipt wording. |
| Passport session | Source boundary exists; origin approval and live session are unverified. | Request only approved profile/session capabilities; reject wrong origin, network, nonce, or schema. |
| Rarimo/NFC | Adapter boundary exists; physical evidence and hosted verifier are unverified. | Never describe fixtures or source adapters as genuine NFC verification. |
| Preview contracts | No current Preview deployment or receipt is asserted. | Require a fresh manifest/transcript for the exact release SHA and network. |
| Stateful action relay | Source path exists; hosted operations and Preview evidence are unverified. | Require authenticated, idempotent, allowlisted actions and indexer confirmation before calling a receipt confirmed. |
| Privacy/security review | Design constraints are documented; independent audit is pending. | Scan logs, bundle, storage, and network behavior before any invited pilot. |

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

## Local release-candidate artifact

The current synthetic fallback was built with `VITE_APP_MODE=demo` and packaged
with `index.html` at the ZIP root:

- local path: `deploy/hostinger/artifacts/passport-preview-demo-20260831.zip`;
- SHA-256: `6ab8066ef7e71e6b0609c01aa5776d78163a42f11a72ca851a7b07879d3b7677`;
- privacy scan: `npm run verify:showcase` passed;
- UI tests: 25 files and 169 tests passed;
- build caveats: the main JavaScript bundle remains about 5.1 MB and the
  ledger WASM about 10.1 MB; the Midnight indexer dependency also emits an
  `isomorphic-ws` browser-export warning during Vite build.

This hash binds the local ZIP only. It becomes public deployment evidence only
after upload, HTTPS verification, route fallback checks, external smoke tests,
and source-SHA recording.

See [`README.md`](../README.md) for the public-facing summary,
[`DEPLOYMENT.md`](DEPLOYMENT.md) for the Hostinger topology,
[`ENVIRONMENT-ACCEPTANCE.md`](ENVIRONMENT-ACCEPTANCE.md) for environment gates,
and [`adr/ADR-007-open-enrollment-and-evidence-roles.md`](adr/ADR-007-open-enrollment-and-evidence-roles.md)
for the current enrollment and evidence decisions.
