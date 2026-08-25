# ADR-004: Geography is a separate privacy decision

- Status: Accepted; pilot implementation choice pending
- Date: 2026-08-24

## Context

CICO wants country participation percentages without linking nationality to ballot choice. Updating an on-chain `Map<country, count>` publicly reveals the country key and every low-count update. Suppressing buckets in the UI cannot remove ledger disclosure.

## Decision

Country eligibility remains a private predicate inside `castVote`, but geography reporting is not included in the first passport-backed voting vertical slice.

Two explicit modes are permitted:

1. Development/demo mode: an opt-in, explicitly public `recordCohort()` action after finalization. It spends a separate cohort nullifier, discloses country, and privately proves prior participation. UI thresholding is presentation policy only.
2. Recommended pilot mode: delayed aggregation or a ZK batch publishes only threshold-qualified buckets and proves uniqueness plus membership in the actual voter set. The aggregation trust boundary and audit method must be documented.

No geography percentage may be called voter geography unless every included cohort record proves membership in the actual voter set. No geography action may consume the vote nullifier or ballot opening.

## Consequences

- Geography does not block the first global or country-restricted vote.
- Public cohort mode requires explicit user disclosure and consent.
- Privacy-aligned aggregation is a separate research and implementation package.
- Thresholding alone is never described as cryptographic privacy.

## Human decision gate

Before the invited pilot, approve one of:

- public opt-in cohort reporting with clear ledger disclosure; or
- privacy-aligned delayed aggregation with an accepted operator/trust model.
