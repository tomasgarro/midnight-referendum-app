# Passport v2 ZKIR disclosure audit

Date: 2026-08-24  
Compiler language: Compact 0.23.0, repository compiler 0.31.1  
ZKIR: v2.0 with communications commitments enabled

## Claim

`CredentialRegistryV1.addCredential` and `ReferendumV2.castVote` constrain
passport-backed credential policy without publishing holder binding, country,
age class, assurance, credential epoch/validity opening, voter secret,
credential blind/path, ballot choice, or vote salt. `castVote` intentionally
writes only ledger transitions including a referendum-scoped vote nullifier and
a referendum-bound ballot commitment.

## Compiled structure

The audit used the full compiler output already produced by
`npm run compile:v2`; it did not recompile with a different source or compiler.

| Circuit | Explicit inputs | Instructions | Private inputs | Public inputs | Persistent hashes | Assertions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `addCredential` | 0 | 216 | 11 | 7 | 3 | 3 |
| `freeze` | 1 | 112 | 2 | 4 | 1 | 3 |
| `castVote` | 0 | 554 | 61 | 17 | 6 | 11 |
| `revealVote` | 3 | 259 | 22 | 6 | 2 | 5 |

`castVote` has no exported circuit arguments. Its secret, holder blind/binding,
credential claims/opening/path, choice, and salt enter through Compact
`witness` declarations and compile to `private_input` instructions. The
registry leaf and ballot commitment compile through `persistent_hash`
instructions. The public-input instructions encode contract ledger reads and
writes plus proof transcript commitments; ZKIR v2 does not retain source-level
names for each field.

`revealVote` intentionally differs: the choice and opening are explicit circuit
arguments during the reveal phase. This is the existing commit/reveal tally
model, not a claim that the choice remains private after reveal.

## Source-to-ZKIR review

- The credential leaf has the `cico:credential:v1` tag and binds holder
  binding, issuer, country, age class, assurance, epoch, validity, and a fresh
  credential blind.
- `castVote` recomputes the holder binding from the voter secret and holder
  blind before it accepts the credential path.
- The supplied Merkle path root must equal the exact frozen root sealed into
  the referendum.
- Country, age, assurance, epoch, and validity checks disclose only their
  successful boolean predicate; failure uses one generic public error.
- The vote nullifier is domain-separated and includes the random referendum
  event ID.
- The ballot commitment includes that same event ID and a fresh vote salt.
- No geography counter is present in this vertical slice.

## Behavioral evidence

`contracts/passport-v2-contracts.test.ts` verifies Compact/TypeScript leaf
parity, sensitivity to every claim and blind, irreversible registry freeze,
holder-secret binding, exact-root policy, generic rejection for country,
assurance, age and expiry, replay rejection, and different nullifiers for two
referendum IDs.

## Interpretation

Confirmed for compiled structure and current source: the credential and vote
opening values are private witness inputs in `addCredential`/`castVote`, while
the intended nullifier and commitment effects are public ledger transitions.

This inspection does not prove all circuit constraints correct and is not an
independent cryptographic audit. The simulator covers the named behavior; the
Midnight ZKIR/WASM checker and an external review remain required before an
invited pilot or any production claim.
