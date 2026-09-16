# midnight.vote

**Understand a public question. Prove the facts needed to participate. Keep control of your choice.**

midnight.vote is a mobile-first civic consultation prototype built around Midnight Passport and Midnight's Compact contracts. It brings proposal discovery, source-linked explanations, private reflection and an explicit review step into one experience.

**Wave 1 delivers a working simulated experience and a reviewable contract implementation.** A complete physical-document-to-network-vote journey is the next integration milestone. Consultations are non-binding.

[Submission brief](docs/SUBMISSION.md) · [Try the demo](https://midnight.vote) · [Run locally](docs/QUICKSTART.md) · [How it works](docs/HOW-IT-WORKS.md) · [Specification](docs/specs/PRODUCT-SPEC.md) · [Documentation](docs/README.md)

## The participant experience

Explore a question that affects your community. Read the proposal and its sources. Ask for context, reflect on the tradeoffs, and review your response before confirming it.

```mermaid
flowchart LR
  discover[Find a consultation] --> understand[Understand the proposal]
  understand --> choose[Choose a response]
  choose --> review[Review before confirming]
  review --> receipt[Keep a simulated receipt]
  understand -. Optional .-> pulse[Reflect privately with Civic Pulse]
```

The demo works in English, Spanish and French. **Ask Midnight currently provides authored catalogue answers**, not generated AI responses. **Civic Pulse keeps answers in memory** and does not submit them. Demo credentials and receipts are explicitly labelled as simulated.

## What works today

Status baseline: **16 September 2026**. The demo from merged source `4353587` is deployed at [midnight.vote](https://midnight.vote). See the [artifact and mobile verification record](docs/releases/2026-09-16-mobile-release.md).

| Capability | What you can inspect | Evidence level |
| --- | --- | --- |
| Discover, onboarding, guidance and reflection | A complete mobile demo with multilingual copy | Working demo |
| Review and receipt | A deliberate confirmation followed by a local simulated receipt | Working demo; no chain transaction |
| Credential Registry V1 | Issuer-authorized admission of commitments to eligibility claims | Compiled and simulator-tested source |
| Referendum V2 | Eligibility checks, repeat-use prevention, ballot commitment, reveal and tally | Compiled and simulator-tested source |
| Passport session | Account consent and display-profile integration | Source plus a dated [real-session record](docs/evidence/passport-live/2026-08-31-first-real-session.md) |
| NFC verification and live participation | Provider, issuer, relay and receipt interfaces | Integration source; physical end-to-end acceptance pending |
| Generative AI and Swiss parliamentary explanations | Proposed source-grounded research companion | Planned |

The receipt synchronization and Civic Pulse browser corrections are included in [PR #33](https://github.com/tomasgarro/midnight-referendum-app/pull/33). All 252 UI tests pass locally, and all four Android/iPhone emulated journeys pass against the public demo. The [release record](docs/releases/2026-09-16-mobile-release.md) distinguishes local checks, CI and hosted evidence.

## Three things that should stay separate

| Concept | In everyday language | What it does not establish by itself |
| --- | --- | --- |
| Midnight Passport session | How you enter the application and consent to profile sharing | Permission to vote |
| Identity-document evidence | A verification process for facts from a supported document | A unique, live human or freedom from coercion |
| Eligibility credential | Evidence that the holder meets a consultation's published rule | Eligibility for every other consultation |

For example, a Swiss citizens' consultation may require citizenship and an age threshold. A local residents' consultation needs separate evidence of residence. A zero-knowledge proof can establish a defined rule without publishing all its private inputs; the rule itself can still reveal a fact about the participant.

Read the [illustrated explanation](docs/HOW-IT-WORKS.md) for the intended NFC-to-Midnight path and the [architecture](docs/ARCHITECTURE.md) for implementation responsibilities.

## The privacy boundary

The current contract uses **commit–reveal**: the choice is hidden during commit and **becomes public during reveal**, when the tally updates. This is not permanent secret-ballot confidentiality. A receipt that omits the choice does not make the underlying reveal private.

The issuer and accepted-root publisher remain trusted roles. Repeat-use prevention applies to the same bound secret in the same consultation; it does not prove one person across all documents. The [Compact review](docs/COMPACT-REVIEW-2026-09-16.md) explains the implementation, remaining risks and live-release gates.

## Run and review

Start with the [quick start](docs/QUICKSTART.md). A clean source build needs Linux or WSL, Node from [`.nvmrc`](.nvmrc), npm 10 and Compact toolchain 0.31.1 because generated contract assets are not tracked. The resulting **demo** needs no wallet, funds or physical document.

For a submission review, follow this route:

1. [Submission brief](docs/SUBMISSION.md): contribution, walkthrough and evidence.
2. [Product specification](docs/specs/PRODUCT-SPEC.md): requirements and acceptance scenarios.
3. [How it works](docs/HOW-IT-WORKS.md): participant journey and privacy boundaries.
4. [Verification record](docs/releases/2026-09-16-submission-candidate.md): exactly what was checked.
5. [Roadmap and release plan](docs/SUBMISSION-PLAN.md): measurable next steps.

## Repository map

| Directory | Responsibility |
| --- | --- |
| [`ui/`](ui/) | Participant experience, local state and simulated journey |
| [`contracts/`](contracts/) | Compact credential registry and referendum rules |
| [`api/`](api/) | Domain interfaces, witnesses and network adapters |
| [`cico-service/`](cico-service/) | Verification boundary and credential issuance |
| [`relayer/`](relayer/) | Authorized transaction submission and confirmation |
| [`scripts/`](scripts/) | Build, deployment and evidence procedures |
| [`docs/`](docs/) | Specifications, decisions, reviews and dated evidence |

Changes start with a [small specification](docs/specs/CHANGE-TEMPLATE.md) and follow the [contribution guide](CONTRIBUTING.md). Historical evidence remains available with its original source revision and environment.

## License

[Apache 2.0](LICENSE).
