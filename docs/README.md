# Documentation

**midnight.vote: informed civic participation with explicit privacy boundaries.**

This is the canonical documentation in GitHub. Start with the product story, then follow the implementation and evidence as deeply as you need. The current submission is a simulated experience plus reviewable Compact and service source.

## Choose a reading path

| If you want to… | Start here | Continue with |
| --- | --- | --- |
| Review the Wave 1 submission | [Submission brief](SUBMISSION.md) | [Evidence and release gates](releases/2026-09-16-submission-candidate.md) |
| Try the product | [Quick start](QUICKSTART.md) | [Participant and identity journey](HOW-IT-WORKS.md) |
| Understand the privacy model | [How it works](HOW-IT-WORKS.md) | [Compact review](COMPACT-REVIEW-2026-09-16.md) |
| Build or change a feature | [Product specification](specs/PRODUCT-SPEC.md) | [Contributing](../CONTRIBUTING.md) and [change template](specs/CHANGE-TEMPLATE.md) |
| Operate a network environment | [Environment acceptance](ENVIRONMENT-ACCEPTANCE.md) | [Deployment](DEPLOYMENT.md) and [compatibility](COMPATIBILITY-MATRIX.md) |
| Understand unfamiliar terms | [Glossary](GLOSSARY.md) | [Architecture](ARCHITECTURE.md) |

## Product and submission

- [Submission brief](SUBMISSION.md): contribution, walkthrough, diagrams and limits.
- [Akindo form copy](AKINDO-WAVE-1.md): prepared fields; this is not a submission confirmation.
- [Product specification](specs/PRODUCT-SPEC.md): requirements, states, privacy and acceptance scenarios.
- [Submission plan](SUBMISSION-PLAN.md): immediate gates and proposed Swiss/AI direction.
- [User action matrix](USER-ACTION-MATRIX.md): detailed action/dependency inventory; read its dated scope.
- [Passport and NFC brief](BRIEF-PASSPORT-AND-NFC.md): forward-looking integration design.
- [Release checklist](WAVE-1-SUBMISSION-CHECKLIST.md): operational worksheet, not evidence of completion.

## Engineering reference

- [Architecture](ARCHITECTURE.md): component ownership, interfaces and trust.
- [Compact review](COMPACT-REVIEW-2026-09-16.md): circuits, implementation evidence and live-release findings.
- [Current release readiness](CURRENT-RELEASE-READINESS.md): current summary with links to dated records.
- [Preview/backend readiness](PREVIEW-AND-BACKEND-READINESS.md): detailed operational record with its own date.
- [Root attestation procedure](ROOT-ATTESTATION-AUDIT.md): how admitted roots are checked.
- [Rarimo reference UX](RARIMO-REFERENCE-UX.md): integration research and implications.

## Architecture decisions

| Decision | Why it matters |
| --- | --- |
| [ADR-001: Passport boundaries](adr/ADR-001-passport-first-boundaries.md) | An account session is not voting authority. |
| [ADR-002: Credential Registry](adr/ADR-002-credential-registry-v1.md) | Claims belong to a committed credential; read with ADR-007. |
| [ADR-003: Relaying and receipts](adr/ADR-003-proof-relayer-and-receipts.md) | Acknowledgement and chain confirmation differ. |
| [ADR-004: Geography](adr/ADR-004-geography-privacy-fork.md) | Geographic disclosure requires its own decision. |
| [ADR-005: Evidence provider](adr/ADR-005-rarimo-evidence-boundary.md) | Rarimo stays behind a replaceable verification boundary. |
| [ADR-007: Open enrollment](adr/ADR-007-open-enrollment-and-evidence-roles.md) | Later roots need a separately attested publication path. |
| [ADR-008: Reflection and actor lanes](adr/ADR-008-civic-pulse-and-actor-lanes.md) | Human reflection and future agent results stay separate. |
| [ADR-006: Frozen enrollment](adr/ADR-006-credential-epoch-lifecycle.md) | Historical decision, superseded by ADR-007. |

## Evidence has a date and a source revision

| Record | What it establishes | What it does not establish |
| --- | --- | --- |
| [16 September candidate investigation](releases/2026-09-16-submission-candidate.md) | CI incident and scoped local verification | A green documentation-PR runtime or deployment |
| [13 September release record](releases/2026-09-13-current-state.md) | Earlier source and hosted-asset comparison | The latest branch is hosted |
| [31 August Passport session](evidence/passport-live/2026-08-31-first-real-session.md) | A real profile/session handshake | Eligibility, wallet or ballot authority |
| [2 September Preview](evidence/preview-2026-09-02/README.md) | Earlier deployment, issuance and root attestation | A complete citizen vote/reveal/finalize journey |
| [Historical local lifecycle](evidence/undeployed-v2/README.md) | A complete older local run at a pinned revision | Current open-enrollment or public-network acceptance |
| [Legacy V1 Preview](LEGACY-V1-PREVIEW-EVIDENCE.md) | The earlier V1 experiment | V2 release evidence |

Older session handoffs, UX reviews and deployment notes remain in this directory for traceability. Their claims retain their original date and scope. When they disagree with the current reading path, use the dated evidence rather than inferring a new release.

## Keeping these documents useful

Use **working demo**, **source-tested**, **historical** and **planned** consistently. Explain each technical term before relying on it. Link to source or evidence next to the claim. Update the specification, relevant ADR and release record together when behaviour changes. See [Contributing](../CONTRIBUTING.md).
