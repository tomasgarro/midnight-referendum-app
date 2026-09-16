# Current release readiness

**Reviewed 16 September 2026 · source baseline `1884a3a` · documentation only.**

Wave 1 presents a working simulated civic experience, reviewable Compact contracts and a documented integration plan. It does not present a completed NFC-to-Midnight voting service. This page states the release decision; the [candidate record](releases/2026-09-16-submission-candidate.md) records the evidence and the [13 September snapshot](releases/2026-09-13-current-state.md) preserves earlier findings.

## What can be demonstrated

| Capability | Current evidence | Meaning for the submission |
| --- | --- | --- |
| Discover, review and simulated participation | Implemented frontend; PR #31 merged | Demonstrate with clear demo labels. |
| Ask Midnight | Authored catalogue explanations | Describe as a bounded guide, not a connected LLM. |
| Civic Pulse | Optional reflection held in memory | No answers submitted; no population insight claimed. |
| Compact contracts | Compilation and simulator tests in the supplied CI run | Reviewable contract logic, not a production security audit. |
| Passport | Earlier consent/session/profile handshake | Account access is separate from eligibility. |
| Preview deployment | Earlier revision deployed, with issuance and root attestation evidence | Historical evidence; no citizen cast/reveal/finalize lifecycle established. |
| Physical NFC | Adapter and staging source | Device-to-Midnight acceptance remains unverified. |
| Public demo | Older Hostinger artifact previously checked; midnight.vote was parked at the recorded check | Verify and publish an exact candidate artifact before advertising a current demo URL. |

## Gates before calling this candidate ready

| Gate | Evidence required | Current position |
| --- | --- | --- |
| Repository checks | Green checks against the exact submitted revision | Supplied PR #31 run failed one UI synchronization assertion and skipped the browser job. Local test corrections passed targeted checks but remain outside this documentation PR. |
| Demo artifact | Build, source SHA, digest, HTTPS URL and interaction check | Production demo build recorded locally; current candidate deployment still needs verification. |
| Honest copy | Demo labels; clear account, eligibility and receipt states | Maintained in the specification; verify on the exact published artifact. |
| Submission fields | Repository, accurate About text and verified deliverable URLs | [Akindo draft](AKINDO-WAVE-1.md) prepared; portal submission is separate. |

## Gates before a live pilot

1. Verify physical NFC on supported hardware, including authenticated callbacks, replay protection and deletion/retention behaviour.
2. Bind issuance, accepted roots and policy to the exact deployed contracts and source revision.
3. Record a complete participant commit, reveal, finalize and independently reconciled receipt; test outages and retries.
4. Resolve the [Compact review](COMPACT-REVIEW-2026-09-16.md) findings, including reveal timing and root-publisher trust. Explain that revealed choices are public.
5. Replace fixture consultation prose with the real question, rules and sources. Test unsupported devices and recovery from network errors.
6. Review privacy, operator access and deployment headers before inviting real participants.

The target remains an invited, non-binding consultation. A pilot, permanent ballot secrecy, representative results and binding-election readiness each require additional evidence.

## Evidence policy

Keep historical manifests and transcripts unchanged. A new run produces a new dated record with its source revision and environment. A local test result, a deployed contract and a completed participant journey establish different facts and must not be described interchangeably.

Continue with [environment acceptance](ENVIRONMENT-ACCEPTANCE.md), [deployment](DEPLOYMENT.md), the [user action matrix](USER-ACTION-MATRIX.md) and the [submission plan](SUBMISSION-PLAN.md).
