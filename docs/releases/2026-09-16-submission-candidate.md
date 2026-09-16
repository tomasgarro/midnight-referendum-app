# Submission candidate — 16 September 2026

## Provenance

The investigation reviewed PR [#31](https://github.com/tomasgarro/midnight-referendum-app/pull/31) at `ac1578553629c2f0005737461474c635d3aa6a6a`. GitHub subsequently confirms it merged on **16 September 2026 at 08:34:56 UTC**. This documentation PR starts from merge commit `1884a3a`.

**Scope of this PR: documentation only.** The local test corrections described below remain outside this branch. Passing results from the corrected working tree must not be attributed to the unmodified tests on this PR or to its CI. No deployment, contract change, presentation or portal submission is included.

## CI incident

[Run 35068664679, job 104704743304](https://github.com/tomasgarro/midnight-referendum-app/actions/runs/35068664679/job/104704743304) failed at `ui/src/__tests__/App.test.tsx:281`: “creates a clearly labelled simulated receipt without a wallet.”

The click starts asynchronous `confirmVote`. Its demo branch awaits `deriveReceiptProfileKey` and `savePassportReceipt` before setting the receipt stage. The test immediately used `getByRole`, so it could inspect the review sheet before completion. The same immediate assertion exists in base commit `f8795e5`; it predates PR #31. This is consistent with a synchronization race, not evidence that the heading was renamed or Compact failed.

Correction: await `findByRole` for the receipt heading and the corresponding Activity-navigation control in the two adjacent receipt tests. No arbitrary sleep, skipped test, relaxed label, or product change.

## Observed CI results before the failure

| Check | Result in supplied CI run |
| --- | --- |
| Compact 0.31.1 compilation | Legacy referendum, Registry V1 and Referendum V2 compiled |
| Legacy contract simulator | 3 passed |
| V2 contract simulator | 28 passed |
| Fixture capability issuer | 6 passed |
| API | 79 passed |
| CICO service | 63 passed |
| Relayer | 37 passed |
| UI | 251 passed / 1 failed across 37 files |
| Dependent browser job | Skipped |
| Later build/audit steps | Not completed by this failed job |

Simulator tests were repeated by the CI scripts; counts above are unique suite counts, not summed across repetitions. This CI run establishes compilation and tests for its checked-out PR revision, not deployment.

## Local verification of separate test corrections

| Command / check | Fresh result |
| --- | --- |
| `npm.cmd run test --workspace midnight-referendum-ui` | **252 passed, 37 files**, 57.10 s |
| `npm.cmd run build --workspace midnight-referendum-ui -- --mode demo` | TypeScript and production demo build passed; existing large-chunk warning |
| Scoped local Compact simulator run | **31 passed, 2 files**, existing generated artifacts; see technical review |
| Targeted Chromium: Passport journey and catalogue revision | **8 passed, 3 mode-specific skips**, 29.4 s, against the production demo server |
| Biome on the two changed test files | Passed after formatting |

The first browser run discovered a second stale test: Civic Pulse gained optional
steps in PR #31, but the old journey skipped only two questions and waited for
Finish while still on funding. The correction explicitly checks the funding
step, skips the remaining optional questions, and checks review before finishing.
The original assertions for no external requests and unchanged browser-storage
keys remain. This changes the test, not the product behavior.

The Windows managed-web-server run completed all corrected scenarios but stalled
during runner teardown. The final run used `BASE_URL=http://localhost:4173`,
`CI=true`, and `--reporter=list` against that production server and exited 0.
This is targeted local browser evidence, not a claim that the full Linux CI or
all browser files passed. Existing jsdom media and generated sourcemap warnings
also appeared during UI tests without failing assertions.

Public GitHub visibility and Apache-2.0 LICENSE were checked. The
`midnightntwrk` repository topic was added and re-read successfully.
The public midnight.vote domain displayed a Hostinger parked page, so it is
not yet the candidate demo URL. Akindo's event page requires a deck and
demo/video pitch in addition to the repository. Presentation and video production are separate deliverables and are excluded from this documentation PR. A public walkthrough still requires its own verified URL.

## Submission gates

- [ ] Record final candidate commit SHA and clean change scope.
- [ ] Obtain passing CI on that candidate, including dependent browser checks.
- [ ] Build and identify the submitted artifact (digest, mode, source revision).
- [ ] Confirm hosted URL serves that artifact; otherwise label the older hosted demo explicitly.
- [ ] Capture a short demo walkthrough and EN/ES screenshots with simulation disclosures.
- [ ] Confirm portal fields, deadline and owner; submit and retain confirmation.

## Technical interpretation

The demo is a valid demonstration scope. It is not a production identity/voting service. Commit–reveal publishes ballot choices during reveal. The [Compact review](../COMPACT-REVIEW-2026-09-16.md) records live-release gates; source or historical network evidence does not remove them.

This documentation is a new specification baseline and submission narrative. Historical records remain dated; they must not be read as proof that current source is hosted.
