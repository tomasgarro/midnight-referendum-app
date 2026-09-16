# Submission plan and next sprint

16 September 2026 · Decision: submit the explicit demo and technical evidence; freeze feature scope.

## Before today's submission

| Order | Work | Done means |
| --- | --- | --- |
| 1 | Correct Civic Pulse navigation and receipt-test synchronization | Full UI and browser suites pass; Pulse reaches review through all optional steps; receipt assertions require actual receipt and simulated disclosure |
| 2 | Reconcile submission claims | Brief/spec/review separate demo, contract source, historical network evidence and future NFC |
| 3 | Select the release candidate | PR #31 is merged; publish documentation and review the separate test corrections; record final candidate SHA |
| 4 | Verify the artifact | Build demo, run browser journey, preserve test record and artifact digest |
| 5 | Prepare portal material | Use the brief below; attach demo URL, repository revision, screenshots and short walkthrough as required by the event |
| 6 | Check the submitted link | Confirm it serves the intended artifact; disclose any historical demo instead |

Release acceptance also includes the complete reflection and simulated receipt journeys
in Android Chrome and iPhone Safari emulation. Run `npm run test:e2e` for all
projects, or `npx playwright test --project=mobile-chrome --project=mobile-safari`
for the mobile subset. Browser emulation does not replace a physical-phone check:
open the released HTTPS URL in Safari/Chrome, complete the demo, check navigation
and scrolling, reload, and verify the simulation disclosures remain visible.

The portal is Akindo Wave 1. [Prepared form copy and event requirements](AKINDO-WAVE-1.md) include the deadline observation and required deck/video. Public GitHub access and Apache-2.0 LICENSE were checked; the required `midnightntwrk` topic was added. The domain midnight.vote showed a parked page at the recorded 16 September check. PR #31 merged on 16 September. This documentation change does not deploy the product or submit the portal form.

## Paste-ready short description

midnight.vote is a multilingual prototype for informed, non-binding civic participation on Midnight. It combines consultation discovery, source-linked authored guidance, private local reflection, and an explicit simulated voting journey. Its technical foundation includes Compact contracts for claim-bound credentials and referendum participation, plus provider-neutral issuance and relay services. The submission demonstrates the product experience and includes compiled contract and test evidence. Ask Midnight currently uses authored catalogue responses. Physical NFC integration and a complete current-source network voting lifecycle remain future milestones. The contract uses commit–reveal: choices are hidden during commit and disclosed during reveal.

## Feature decision

Do not start an AI or NFC sprint before this submission. A new provider introduces evaluation, privacy, failure-handling and deployment work that does not improve the reliability of today's evidence. The strongest immediate improvement is a walkthrough that makes the existing source-linked guidance, simulation labels and technical contribution easy to understand.

Only submission-blocking defects enter today's scope. If a new defect cannot be fixed and verified within the remaining window, document it and constrain the demonstration. Do not silently upgrade mocks into live capabilities.

## Next sprint: prove one complete live lifecycle

Deliver one source-pinned Preview journey: verified issuer admission, accepted root, authorized vote, indexer confirmation, reveal, finalization and choice-free receipt. Resolve the Compact review findings first, including reveal cutoff semantics and initial-root trust documentation. Acceptance must include invalid/replayed/expired credentials, provider timeout, restart/idempotency and indexer lag. Record addresses and transaction references without private inputs.

## Following sprint: physical NFC

Use a physical supported device and document with a pinned verifier. Validate authentic callback/proof, minimum necessary claims, replay rejection, holder binding, expiry and retention/deletion. Demonstrate that camera/manual MRZ entry alone cannot issue verified eligibility. Keep the evidence adapter replaceable; Passport profile/session remains separate.

## AI experiment, after the release

Target: help a participant understand a proposal and its sources, without recommending how to vote or profiling political beliefs.

Acceptance: a versioned proposal corpus; claim-level citations; clear separation of sources and generated explanation; balanced treatment of authored positions; abstention on unsupported questions; resistance to instructions in retrieved documents; no document, credential, ballot or Pulse data in model requests; cancellation/timeouts; server-side secrets and cost limits. Evaluate a fixed question set including conflicting sources and unsupported claims before enabling it. Success is grounded comprehension, not persuasion or engagement alone.

## Documentation publishing decision

Keep Markdown in GitHub as the canonical source today. It is reviewed with the code, needs no migration, and gives jurors durable source links. Add a public GitBook presentation after the candidate is stable; GitBook supports GitHub/GitLab synchronization, so a GitLab repository migration is unnecessary for this purpose. See [GitBook's Git Sync documentation](https://gitbook.com/docs/docs-as-code/git-sync).

Use the information structure of [Freedom Tool's overview](https://docs.rarimo.com/freedom-tool/) and [contract reference](https://docs.rarimo.com/freedom-tool/smart-contracts-reference/) as a reference: explain the user problem, show the system, then expose technical interfaces and evidence. Its guarantees and audits do not apply to midnight.vote.

Proposed public navigation: Overview → Try the demo → What is implemented → Product specification → Architecture and privacy → Compact reference/review → Evidence and releases → Roadmap. Use the two diagrams in the submission brief, screenshots from the selected release, readable captions and visible “Demo / Source-tested / Historical / Planned” labels. Do not embed local-only artifact links in the public site.

## Proposed first market: Switzerland

Begin with an invited, non-binding consultation for a Swiss civic association or issue community. This is an adoption hypothesis, not a secured partnership. Switzerland's federal guide describes political votes **up to four times a year**, creating recurring questions that people need to understand. The product would complement official information and procedures, not replace official ballots or signature collection. [Source: Swiss federal guide](https://www.ch-info.swiss/en/direkte-demokratie/abstimmungen).

The proposed AI research companion would explain proposals using official parliamentary material and published voting explanations, with links to supporting passages and visible update dates. [Curia Vista](https://www.parlament.ch/en/ratsbetrieb/curia-vista) contains parliamentary business since winter session 1995. Corpus ingestion and generative responses are planned. German/French/Italian localization and review are pilot gates; the current interface supports English/Spanish/French.

Pilot acceptance should measure whether people understand the question, complete eligibility without assistance and can explain what they disclosed. Define numerical targets with the pilot partner before enrollment. Do not optimize for a particular political answer.
