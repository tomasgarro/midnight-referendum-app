# ADR-002: Claim-bound credential registry v1

- Status: Accepted for credential schema; lifecycle model superseded by [ADR-007](ADR-007-open-enrollment-and-evidence-roles.md)
- Date: 2026-08-24

> The claim-bound leaf and append-only registry remain current. References in
> this record to a referendum pinning one frozen root describe the historical
> lifecycle, not the current open-enrollment model. Current referenda retain an
> initial root and may accept separately attested later roots; see ADR-007.

## Context

The earlier contract issued `H(voterSecret)` into a per-referendum tree. That
leaf could not bind verified nationality, age, issuer, assurance, validity, or
epoch. Duplicating a reusable credential across referendum trees also creates
lifecycle and correlation problems. The claim-bound registry and leaf schema
below replace that design; ADR-007 defines how current referenda use its roots.

## Decision

Create a provider-neutral, append-only `CredentialRegistryV1` with a fixed
Merkle height of 16 for Preview. The issuer can add claim-bound leaves while
the registry is open. The registry retains an irreversible freeze circuit for
the historical compatibility model; current referenda use open enrollment and
pin an initial root while accepting only separately attested later roots, with
the registry ID, issuer ID, and epoch fixed. See ADR-007.

The browser creates `voterSecret`, `holderBlind`, and a blinded holder binding. The issuer receives the holder binding and authoritative provider claims, creates `credentialBlind`, and computes the final leaf. The issuer never receives the voter secret or holder blind.

Use domain-separated derivations with shared TypeScript/Compact golden vectors:

```text
holderBinding = persistentCommit(
  ["cico:holder-bind:v1", voterSecret], holderBlind
)

credentialLeaf = persistentCommit(
  {
    tag: "cico:credential:v1",
    holderBinding,
    issuerId,
    nationality,
    ageClass,
    assurance,
    credentialEpoch,
    validUntil
  },
  credentialBlind
)
```

Individual revocation is not part of Preview v1. Key compromise or policy revocation creates a new epoch and requires re-enrollment.

## Consequences

- Referenda consume credentials but cannot issue them.
- Schema changes require new contracts and re-enrollment; v1 `H(voterSecret)` leaves are not migrated.
- Each accepted root gives a stable historic membership path; the current
  open-enrollment referendum records all accepted roots and their attestations.
- The issuer can attest exact claims without learning vote nullifiers.
- Issuer key material must be independent from organizer and relayer secrets.

## Required verification

1. TypeScript and Compact produce identical golden vectors.
2. Changing any claim, secret, blind, or domain changes the leaf.
3. Issuance after the registry is frozen fails; open enrollment closes only at
   its published deadline.
4. A referendum rejects any path outside its initial or separately attested
   accepted roots.
