# Next sprint: one verified Preview lifecycle

The public submission remains an explicit demo. The existing VPS and domain
are deployment infrastructure, not evidence that a current-source voting
lifecycle is complete. Do this work on a separate Preview release after the
submission candidate is stable.

## Sequence and acceptance

| Order | Deliverable | Required evidence |
| --- | --- | --- |
| 1 | Resolve the [Compact review](COMPACT-REVIEW-2026-09-16.md) gates | Decide and test reveal cutoff semantics; document initial-root provenance, publisher trust, expiry reference and revocation authority. Record compiler version and source SHA. |
| 2 | Establish service readiness | Pin service images, configuration and network; verify issuer/relay health, indexer freshness, proof service reachability and operator readiness. Record no secrets or private inputs. |
| 3 | Admit a credential through the intended issuer | Verify admission evidence and holder binding; persist issuance; attest and publish the accepted root. No operator-only shortcut around credential ownership. |
| 4 | Complete the citizen action | Authorize and commit from the browser; obtain canonical indexer confirmation; reveal within the chosen policy; finalize; resolve a choice-free receipt. Record contract addresses and transaction references. |
| 5 | Exercise failure and recovery | Reject invalid, replayed and expired credentials; demonstrate bounded provider timeout, service restart/idempotency, duplicate submission and indexer lag without false success. |
| 6 | Repeat from the pinned release | A second operator follows the runbook and produces the same class of evidence. Reconcile public claims with observed results. |

## Boundaries that remain explicit

- Commit–reveal exposes the choice during reveal. A choice-free receipt does
  not make the underlying reveal transaction secret.
- Passport profile/session consent is separate from credential eligibility
  and action authorization.
- Civic Pulse remains local reflection. Do not send its answers to the voting
  contract, the issuer, telemetry or an AI provider.
- Physical NFC evidence needs its own supported-device transcript and pinned
  verifier. Camera/manual MRZ input alone is not verified eligibility.
- Evaluate a source-grounded AI companion separately, after this lifecycle;
  use the privacy and evaluation gates in [the submission plan](SUBMISSION-PLAN.md).

## Release evidence template

Record source SHA, compiler version, image digests, network, public contract
addresses, public transaction references, timestamps and test outcomes.
Include the expected and observed outcome for each negative case. Exclude
passport data, holder secrets, credentials, session identifiers and raw proof
callbacks. Distinguish fresh evidence from historical transcripts.
