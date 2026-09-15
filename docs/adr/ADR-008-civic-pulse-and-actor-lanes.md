# ADR-008: Civic pulse and actor lanes

- Status: accepted for local v1 implementation
- Date: 13 September 2026
- Scope: local civic-priorities demo and future participation boundaries

## Context

The product needs a low-friction way for a person to reflect on civic priorities before identity or voting machinery is introduced. The existing Referendum V2 contract is not suitable for collecting these answers: its reveal phase publishes each ballot choice while updating the tally. A stronger statement that individual pulse answers are never exposed therefore requires a separate, independently reviewed aggregation protocol.

The roadmap also includes a future deliberation assistant and participation by synthetic Midnight City agents. These capabilities must not inherit human eligibility or be represented as human public opinion.

## Decision

The first civic pulse is a local demonstration. It uses a fixed, versioned questionnaire and keeps its draft only in React component memory. Completion returns a local marker with `submitted: false`; it does not call a backend, use browser storage, emit telemetry, create a commitment, or call `castVote`. Reloading, resetting, or returning home erases the draft.

Participation and results carry two distinct dimensions:

- `actorLane`: `human` or `synthetic-agent`;
- `evidenceMode`: `simulated` or `verified`.

A simulated human demo is not a synthetic-agent response. A future real adapter must derive the actor lane from authenticated server context, bind authorization to that lane and consultation, and fail closed on unknown provider or protocol versions. Human and synthetic results use separate namespaces, authorization audiences, cache keys, releases, and public labels.

`PriorityPulsePort` is separate from `CivicActionPort` and the referendum ballot interface. `ConsultationResultPort` returns only published, suppressed, or not-published snapshots with mandatory lane, mode, version, and provenance. It never returns raw answers. Fixed demo aggregates are synthetic fixtures and cannot be queried through the synthetic-agent lane.

The future deliberation assistant is advisory only. Its boundary may accept a public consultation/topic and explicit question, but it must have no action methods, credential-vault access, response-submission access, or implicit access to a person's priorities, profile, geography, or conversation history.

## Consequences

- The pulse can ship locally without choosing a secure-aggregation protocol or collecting political data.
- The landing and pulse entry stay independent of wallet, ledger, proving, indexer, Passport, and contract runtimes; those load only when the existing referendum workspace is explicitly opened.
- No real pulse collection is permitted until a separate ADR approves the aggregation protocol, operator trust model, consent and retention policy, publication thresholds, suppression behavior, and repeated-release/differencing defenses.
- No autonomous or delegated human voting, identity-answer joins, per-user political history, free-text export, or mixed human/synthetic result is introduced by this decision.

## Evidence and related decisions

- Referendum reveal behavior: `contracts/referendum-v2/referendum-v2.compact`, reveal circuit.
- Passport and civic-action separation: [ADR-001](ADR-001-passport-first-boundaries.md).
- Geography privacy constraints: [ADR-004](ADR-004-geography-privacy-fork.md).
- Open enrollment and evidence roles: [ADR-007](ADR-007-open-enrollment-and-evidence-roles.md).
- Deployment facts: [release record dated 13 September 2026](../releases/2026-09-13-current-state.md).
