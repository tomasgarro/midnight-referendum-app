# ADR-002: Claim-bound credential registry v1

- Status: Accepted for implementation
- Date: 2026-08-24

## Context

The current contract issues `H(voterSecret)` into a per-referendum tree. That leaf cannot bind verified nationality, age, issuer, assurance, validity, or epoch. Duplicating a reusable credential across referendum trees also creates lifecycle and correlation problems.

## Decision

Create a provider-neutral, append-only `CredentialRegistryV1` with a fixed Merkle height of 16 for Preview. The issuer can add claim-bound leaves while the registry is open and irreversibly freeze the registry. Every referendum pins one exact frozen root, registry ID, issuer ID, and epoch.

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
- A fixed frozen root gives stable historic membership paths.
- The issuer can attest exact claims without learning vote nullifiers.
- Issuer key material must be independent from organizer and relayer secrets.

## Required verification

1. TypeScript and Compact produce identical golden vectors.
2. Changing any claim, secret, blind, or domain changes the leaf.
3. Issuance after freeze fails.
4. A referendum rejects any path outside its exact pinned root.
