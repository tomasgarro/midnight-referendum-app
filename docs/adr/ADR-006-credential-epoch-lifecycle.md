# ADR-006: Credential epoch and referendum lifecycle

Status: Historical/superseded by [ADR-007](ADR-007-open-enrollment-and-evidence-roles.md)

> This record preserves the earlier frozen-before-deploy model. It remains
> useful for interpreting the SHA-specific Undeployed evidence at
> `docs/evidence/undeployed-v2/abdd0a2/`, but it is not the current enrollment
> policy. Open enrollment is current; see ADR-007.

## Context

`CredentialRegistryV1` is append-only while enrollment is open. A referendum
does not read a moving registry: it binds to an exact registry ID, issuer ID,
credential epoch and frozen Merkle root. This makes membership stable and
prevents the organizer from changing eligibility after voting begins.

The consequence is important for the product journey. Once a V1 registry is
frozen, `addCredential` is no longer available. A person who scans a passport
after that point cannot be added to the root already used by a live
referendum. An interface that promises "scan and vote immediately" against an
existing frozen referendum would therefore be misleading.

## Decision

The Preview MVP uses explicit credential epochs with separate enrollment and
consultation phases:

1. The operator opens one Preview credential registry for an announced
   enrollment window.
2. A person connects Midnight Passport, completes the temporary Rarimo NFC
   evidence flow, and receives a browser-held credential in that open epoch.
3. At the published deadline, the operator stops issuance, reconciles the
   registry through the canonical indexer, and freezes its root.
4. Global and country-restricted referenda may then bind to that exact frozen
   root and epoch. One credential can be reused across those referenda without
   revealing which leaf was used.
5. New participants enroll into the next registry epoch for future
   consultations. An old referendum never changes its eligibility root.

The UI must distinguish these states: `enrollment open`, `awaiting freeze`,
`eligible for this epoch`, and `next epoch`. A configured referendum is
selectable only when the browser has private credential material whose public
leaf is present in that referendum's frozen root. Country policy remains a
separate referendum predicate; it is not a geography-reporting feature.

For a local demonstration, the application may simulate the phase transition,
but it must label that transition as synthetic. For a live Preview transcript,
the freeze and referendum deployment must be independently visible in the
indexer before any vote is presented as available.

## Implementation status

The service now has an indexer-backed epoch coordinator that reads the current
canonical tree root, serializes issuance and freeze mutations, freezes that
exact root, and re-reads the indexer before producing a referendum-safe frozen
reference. A frozen historical root that differs from the current root is
rejected. Credential issuance checks the same boundary before consuming the
single-use evidence authorization.

The catalog also fails closed when the browser credential and a configured
referendum differ on epoch, validity reference, assurance, adult predicate, or
country predicate. A credential from a later epoch is routed toward a future
consultation instead of being offered a vote that the circuit would reject.

Still required for a live Preview transcript: an operator-only close/freeze and
referendum-launch command, a funded canonical deployment, and independent
indexer evidence captured from that deployment.

## Consequences

- The invited pilot needs a scheduled registration period before its first
  vote. This is acceptable for a bounded cohort and makes the trust model
  legible.
- The credential issuer and organizer use independent keys and processes. The
  issuer cannot silently extend an already-frozen electorate.
- A person enrolling after a freeze receives a valid future credential, not
  false eligibility for the current referendum.
- Supporting continuous enrollment later requires a reviewed new accumulator
  or registry version, plus new Compact disclosure and migration tests. It is
  not a UI-only change.
- A future Passport-native credential adapter may replace Rarimo, but it does
  not remove the frozen-root lifecycle unless the Compact policy changes.

## Rejected alternatives

- **Freeze after the first participant enrolls.** This creates a single-person
  electorate and cannot support a real pilot.
- **Keep the registry mutable while voting.** This makes the eligibility set
  change during a referendum and contradicts the V1 contract invariant.
- **Trust a backend membership list instead of the frozen root.** This removes
  the privacy-preserving on-chain policy that the product is built around.
- **Pretend a later credential belongs to an older root.** Merkle membership
  correctly rejects it; hiding the failure in UX would be unsafe.
