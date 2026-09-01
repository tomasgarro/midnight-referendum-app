# Documentation index

This index separates the current product story from operational targets and
historical evidence. The current product is an open-enrollment,
Passport-session, temporary-Rarimo, voting-first civic consultation with an
explicit synthetic fallback. Historical records remain available for
auditability, but they are not evidence for the current branch or a Midnight
Preview release.

## Jury submission — start here

| Document | Use it for | Status |
| --- | --- | --- |
| [`SUBMISSION.md`](SUBMISSION.md) | One-minute story, runnable demo path, evidence matrix, diagrams, claims, and final checklist | Current jury brief |
| [`../README.md`](../README.md) | Product boundary, current status, synthetic fallback, and quick start | Current |
| [`CURRENT-RELEASE-READINESS.md`](CURRENT-RELEASE-READINESS.md) | Release boundary, pending gates, and evidence policy | Current |
| [`PREVIEW-AND-BACKEND-READINESS.md`](PREVIEW-AND-BACKEND-READINESS.md) | Preview/backend facts and the blocked end-to-end path | Current |
| [`evidence/passport-live/2026-08-31-first-real-session.md`](evidence/passport-live/2026-08-31-first-real-session.md) | The observed real Passport profile/session handshake | Evidence, scoped |
| [`evidence/undeployed-v2/abdd0a2/`](evidence/undeployed-v2/abdd0a2/) | Exact historical local lifecycle, manifest, and transcript | Historical only |

## Product, UX, and evidence

- [`USER-ACTION-MATRIX.md`](USER-ACTION-MATRIX.md) — what every CTA actually
  does, its dependency, and whether its copy is honest.
- [`UX-FINDINGS-20260831.md`](UX-FINDINGS-20260831.md) — prioritized findings
  from the 31 August journey audit, fixed and open.
- [`SESSION-HANDOFF-2026-09-01-UI.md`](SESSION-HANDOFF-2026-09-01-UI.md) — current
  UI pass, verification state, and product-facing backlog.
- [`BRIEF-PASSPORT-AND-NFC.md`](BRIEF-PASSPORT-AND-NFC.md) — forward-looking
  Passport and NFC brief; read its hardware and network limitations.
- [`RARIMO-REFERENCE-UX.md`](RARIMO-REFERENCE-UX.md) — review of the supplied
  RariMe/Freedom Tool recordings and the release decisions derived from them.
- [`WAVE-1-SUBMISSION-CHECKLIST.md`](WAVE-1-SUBMISSION-CHECKLIST.md) — release
  worksheet; do not fill its evidence fields from historical records.

## Architecture decisions

| Document | Decision | Status |
| --- | --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Service ownership and privacy boundaries | Current |
| [`adr/ADR-001-passport-first-boundaries.md`](adr/ADR-001-passport-first-boundaries.md) | Passport session/profile is not voting authority | Current |
| [`adr/ADR-002-credential-registry-v1.md`](adr/ADR-002-credential-registry-v1.md) | Claim-bound credential registry | Current, read with ADR-007 |
| [`adr/ADR-003-proof-relayer-and-receipts.md`](adr/ADR-003-proof-relayer-and-receipts.md) | Proving, relay, and canonical receipts | Current |
| [`adr/ADR-004-geography-privacy-fork.md`](adr/ADR-004-geography-privacy-fork.md) | Geography is a separate privacy decision | Current decision gate |
| [`adr/ADR-005-rarimo-evidence-boundary.md`](adr/ADR-005-rarimo-evidence-boundary.md) | Rarimo stays behind an injected evidence boundary | Current, read with ADR-007 |
| [`adr/ADR-007-open-enrollment-and-evidence-roles.md`](adr/ADR-007-open-enrollment-and-evidence-roles.md) | Open enrollment and explicit Passport/Rarimo roles | Current; supersedes ADR-006 |
| [`adr/ADR-006-credential-epoch-lifecycle.md`](adr/ADR-006-credential-epoch-lifecycle.md) | Frozen-before-deploy epoch model | Historical/superseded; preserved |

## Delivery and operations

- [`ROADMAP.md`](ROADMAP.md) — product outcomes and cryptographic release
  gates.
- [`BUILDATHON-ROADMAP.md`](BUILDATHON-ROADMAP.md) — dated program cadence;
  dates remain targets until independently revalidated.
- [`FIRST-PUBLIC-DEPLOYMENT.md`](FIRST-PUBLIC-DEPLOYMENT.md) — Hostinger
  static-site runbook with a synthetic fallback; it is not deployment proof.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Hostinger static/VPS target topology and
  operational boundaries.
- [`COMPATIBILITY-MATRIX.md`](COMPATIBILITY-MATRIX.md) — pinned local toolchain
  and service versions.
- [`ENVIRONMENT-ACCEPTANCE.md`](ENVIRONMENT-ACCEPTANCE.md) — demo, local, and
  Preview acceptance criteria.
- [`ROOT-ATTESTATION-AUDIT.md`](ROOT-ATTESTATION-AUDIT.md) — audit procedure
  for roots admitted during open enrollment.
- [`../deploy/hostinger/VPS-READINESS-CHECKLIST.md`](../deploy/hostinger/VPS-READINESS-CHECKLIST.md) —
  values and decisions still missing before the VPS stack can start.
- [`MASCOT-AND-AVATARS.md`](MASCOT-AND-AVATARS.md) — mascot asset guide and
  separate future-avatar proposal; unrelated to credential or voting
  authority.
- [`BUILDATHON-RESOURCES.md`](BUILDATHON-RESOURCES.md) — external reference
  links supplied by the kickoff deck.
- [`AGENT_CONTEXT.md`](AGENT_CONTEXT.md) — working context and boundaries;
  not a release record.

## Historical records and evidence

- [`evidence/undeployed-v2/README.md`](evidence/undeployed-v2/README.md) —
  explains the historical evidence boundary.
- [`evidence/undeployed-v2/abdd0a2/`](evidence/undeployed-v2/abdd0a2/) —
  preserved, SHA-specific local v2 transcript and manifest. This is the older
  frozen-enrollment run, not current-branch or Preview evidence.
- [`LEGACY-V1-PREVIEW-EVIDENCE.md`](LEGACY-V1-PREVIEW-EVIDENCE.md) — original
  v1 Preview/DNI experiment, historical only.
- [`OVERNIGHT-ARCHITECTURE-HANDOFF.md`](OVERNIGHT-ARCHITECTURE-HANDOFF.md) —
  earlier architecture handoff, historical context only.
- [`SESSION-HANDOFF.md`](SESSION-HANDOFF.md) — dated session notes, historical
  context only; do not use its branch table as current status.
- [`SESSION-HANDOFF-2026-08-31.md`](SESSION-HANDOFF-2026-08-31.md) — dated
  handoff with the observed Passport session; current status is superseded by
  this index, `SUBMISSION.md`, and current readiness pages.
- [`UX-REBUILD-HANDOFF.md`](UX-REBUILD-HANDOFF.md) — dated UX work log,
  historical context only.
- [`ZKIR-AUDIT.md`](ZKIR-AUDIT.md) — dated source/ZKIR inspection, historical
  review evidence rather than a current independent audit.
- [`VERCEL-SETUP.md`](VERCEL-SETUP.md) — retained Vercel setup notes,
  historical/alternative-host reference; Hostinger is the current target.
- [`../artifacts/overnight-ui/`](../artifacts/overnight-ui/) — archived
  overnight screenshots, retained but not current release evidence.

## Evidence rules

1. A release claim needs a release record tied to an exact source SHA; a
   historical artifact cannot be silently upgraded by later documentation.
2. The current default is open enrollment. Any document describing a frozen
   root must identify whether it is a cryptographic invariant, a target gate,
   or historical evidence from the old model.
3. Passport profile/session data is not eligibility, wallet authority, or vote
   identity. Rarimo is temporary NFC evidence; its proof may be validated only
   transiently by the restricted CICO adapter and is never returned to the UI
   or persisted by CICO.
4. Voting is the primary product action. Real wallet, recovery, biometric, and
   ETH behavior belongs to optional post-Preview Profile/Vault work.
5. Synthetic fallback is an explicit mode. It is not a degraded live mode and
   must never produce a real-credential, real-vote, or canonical-receipt claim.
