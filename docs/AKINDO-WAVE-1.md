# Akindo Wave 1 — submission fields

Prepared 16 September 2026 for [Build Privacy-First Apps on Midnight](https://app.akindo.io/wave-hacks/jaMZjqPOBsLXvjdG). This is prepared copy, not confirmation of submission.

## Form values

| Field | Recommended value |
| --- | --- |
| Product title | midnight.vote |
| Tagline | Understand the proposal. Prove eligibility. Participate on your terms. |
| Deliverable URL | https://github.com/tomasgarro/midnight-referendum-app — ensure the selected revision and this documentation are accessible before submitting |
| Build with | Midnight |
| Tags (10 maximum) | Compact, TypeScript, React, Vite, Node.js, Zero-Knowledge Proofs, Vitest, Playwright, Docker, Web Crypto |
| Live demo | https://midnight.vote — verified demo from merged application source `4353587`; [artifact and mobile evidence](releases/2026-09-16-mobile-release.md). Votes and credentials are simulated. |
| Video | Public YouTube URL of an actual walkthrough or video pitch; add after recording/upload |
| Product detail visibility | Public is recommended for an open-source submission; owner selects the final visibility |
| Connect | Owner supplies X, Discord, Telegram and email |

**Infrastructure attribution:** Midnight is implemented directly through Compact contracts and SDK integration. Rarimo is a temporary evidence adapter with source/staging work; physical NFC acceptance is pending. Do not list Ethereum merely because an upstream provider relates to it. No direct Ethereum integration was established in this review.

**Deadline observation:** the event page displayed 16 September, 17:00 during the investigation without an explicit timezone in the extracted timeline. Check the live portal for the actual cutoff; this document is not a live countdown.

## Additional event requirements

The public event page's Rules / Submission Requirements require a public GitHub repository, clear README, slide deck, demo/video pitch, Wave progress description, at least one compiling Compact contract, Apache-2.0 Midnight-related code, and the `midnightntwrk` GitHub label. These requirements are broader than the form's “Required” markers. The repository's LICENSE is Apache 2.0. Public repository access was confirmed; the `midnightntwrk` repository topic was added and verified on 16 September.

The page also states that entries must be submitted personally and automated entry tools are prohibited. The owner should paste the prepared material and submit through their account. No form was submitted here. [Official rules PDF linked by Akindo](https://drive.google.com/file/d/1YKXtsw5nghcEBEW0BFrLn-U34AfH_MF4/view) remains authoritative; this checklist summarizes the visible event page, not a legal eligibility determination.

## About — paste the following sections

## What it does

**midnight.vote makes civic participation easier to understand while keeping identity and participation as separate concerns.**

People can explore global and country-specific consultations, read proposal context and sources, reflect privately on their priorities, and complete a clearly labelled simulated voting journey in English, Spanish or French.

The Wave 1 experience includes optional Passport onboarding, eligibility explanations, consultation discovery, answer review, simulated receipts, and Activity. Ask Midnight provides authored catalogue guidance with sources and follow-up questions. Civic Pulse lets people explore priorities and budget tradeoffs without sending or persisting their answers.

## The problem it solves

Digital consultations often ask people to trust both the proposal and the organization collecting their data. Participants need understandable information and clear rules. Organizers need a way to check eligibility without placing identity beside a ballot.

Our initial use case is a non-binding consultation for an invited community. The product separates three things that are often confused: an account, a physical document, and permission to participate. It makes those boundaries visible before asking someone to act.

## Challenges I ran into

The hardest work was aligning the interface with the actual guarantees. A Passport connection is not an eligibility credential; a document camera flow is not NFC verification; and a relay acknowledgement is not a confirmed transaction.

We also had to separate generated contract execution, historical network evidence, and the current demo. A CI failure exposed an asynchronous receipt-test race: the assertion checked the completion screen before local receipt creation finished. A local synchronization correction was verified; it is not included in this documentation-only PR.

Our Compact review clarified a central privacy limitation: the current design hides the choice during commit, then publishes it during reveal. It does not provide permanent secret-ballot confidentiality. Accepted-root provenance also retains publisher trust.

## Technologies I used

Midnight and Compact, TypeScript, React, Vite, Node.js, Midnight SDK packages, Web Crypto and local browser storage, Vitest, Playwright, and Docker-based service tooling.

The repository also contains a provider-neutral Rarimo integration boundary. Physical NFC-to-Midnight verification remains future work. Ask Midnight is currently deterministic catalogue retrieval, not a generative AI integration.

## How we built it

We built the participant journey around understandable proposals, optional onboarding and explicit simulation. The application supports multilingual discovery, source-linked context, a local reflection flow, and a review-to-receipt demonstration.

The technical foundation includes a Compact credential registry with claim-bound commitments and a V2 referendum contract with membership/policy checks, referendum-specific nullifiers, committed ballots, reveal/tally and lifecycle controls. TypeScript services separate credential issuance, root publication, authorized relaying and canonical receipt reconciliation.

Wave 1 progress is visible in the repository history: Compact/service implementation and historical local/Preview experiments, followed by the revised landing, Passport onboarding, discovery, catalogue guidance and reflection experience. Merged PR #31 contains the frontend baseline reviewed here. We have now established a versioned product specification linking requirements to implementation and tests.

Earlier CI exposed receipt synchronization and stale Civic Pulse navigation tests. The corrections and Android/iPhone browser coverage are in PR #33. All 252 UI tests pass locally; the production demo build and bundle privacy gate pass. The demo is now hosted at midnight.vote, with its artifact verified and all four emulated Android/iPhone journeys passing against the public URL. Consult the release record and PR checks for exact revision-specific CI status. Physical-phone acceptance and a complete current-source Preview lifecycle remain separate milestones.

## What we learned

Privacy has to be specified across the whole lifecycle: what enters the browser, what a provider attests, what a contract discloses, and what a receipt proves. A polished flow must communicate these distinctions as clearly as the code enforces them.

Tests and evidence also need precise scope. A simulated success, a unit test and an indexer-confirmed network transaction establish different things. Writing explicit requirements and recording source revisions makes those differences reviewable.

## What's next for midnight.vote

First, resolve the contract review gates and demonstrate one complete current-source Preview lifecycle, from credential issuance through commit, reveal, finalization and indexer reconciliation.

Next, validate physical NFC with authenticated provider evidence, minimum necessary claims, replay controls and retention checks. Then evaluate a source-grounded AI assistant with citations, uncertainty and privacy controls.

The adoption hypothesis is a small invited pilot with a community or civic organization, followed by measured usability and operational reliability. Organizer tooling and support are potential business directions, not validated revenue or traction.

**Wave 1 scope:** a working simulated product experience, compiled Compact implementation, service/test evidence and a documented roadmap. No current-source end-to-end physical-passport vote, permanent ballot secrecy, production election readiness or unique-human guarantee is claimed.
