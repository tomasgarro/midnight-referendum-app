# Auditing credential-root admissions

This procedure lets anyone verify, from public chain data alone, that a
referendum's electorate was drawn from the real credential registry.

It applies to the current open-enrollment model described in [ADR-007](adr/ADR-007-open-enrollment-and-evidence-roles.md).
The preserved `abdd0a2` artifact predates that decision and is a historical
frozen-enrollment run; do not use its values as current deployment evidence.

It exists because of a limitation we cannot engineer away today, stated plainly
below. Read that first; the procedure only makes sense in light of it.

## The limitation

`ReferendumV2.publishCredentialRoot(root)` admits a credential-registry root so
that people who enrolled after deployment can vote. The contract **cannot check
that the root belongs to the credential registry**, because Midnight does not
support cross-contract calls: a contract cannot read another contract's ledger
or call its circuits. The referendum therefore trusts its caller for the root's
provenance.

The practical consequence: a holder of the root-publisher key could build a
Merkle tree off-chain containing credential leaves it invented, publish that
tree's root, and cast votes against it. Every eligibility value in `castVote`
is a private witness, so fabricated leaves satisfy the policy checks by
construction.

Two things bound this, and neither is a cryptographic guarantee:

1. The party that issues credentials could always decide the electorate. This
   does not hand new power to someone who already controls issuance.
2. It **does** let a compromised publisher key bypass the registry's audit
   trail entirely. Under this design's own threat model that is a real
   escalation, which is exactly why the audit below is not optional.

## The mitigation

For every admitted root, the operator also calls
`CredentialRegistryV1.attestCurrentRoot(root)`. That circuit asserts
`credentials.checkRoot(root)`, so a **successful** attestation transaction is
permanent, irrefutable on-chain proof that the root really was that registry's
current root at that block.

The two calls cannot share a transaction. They target different contracts, and
Midnight's transaction merging requires at least one side to contain no
contract calls. Atomicity is not what carries the proof, though — the
attestation existing at all is. A published root with no matching attestation
is visibly illegitimate, which is what this procedure detects.

## What you need

- The referendum contract address
- A Midnight indexer for the network (Preview:
  `https://indexer.preview.midnight.network/api/v4/graphql`)
- The deployment manifest published with the release, under
  `docs/evidence/`

## Procedure

**1. Read the referendum's registry binding.**

From the referendum's public state, read `registryContract`. This is the
registry address in the clear.

Do not rely on `registryContractBinding` for this step. It is a
domain-separated hash whose preimage format lives off-chain, so it cannot be
checked from chain data alone. It is retained only as a secondary consistency
check.

**2. List the accepted roots.**

Read `acceptedCredentialRoots` and `revokedCredentialRoots` from the
referendum's public state. Note `initialCredentialRoot` separately: it is the
root supplied at deployment.

**3. For each accepted root, find its attestation.**

In the manifest transcript, each root other than `initialCredentialRoot` must
have:

- a `referendum.publish-root` step whose receipt records the admitting
  transaction, and whose `attestationTransactionId` names another transaction
- a `registry.attest` step with that transaction id, whose `details.rootField`
  equals the root being admitted

Then verify against the chain, not just the manifest:

- the attestation transaction exists and **succeeded** — this is the whole
  proof, because the circuit asserts `checkRoot`, so a fabricated root makes
  the transaction fail
- it targeted the contract address from step 1
- it is a different transaction from the publish

**4. Check the deployment root.**

`initialCredentialRoot` is supplied as a constructor argument and, unlike later
roots, carries no attestation of its own. Verify it separately: confirm the
deploy transcript records a `registry.attest` for it, and that the registry
address matches.

This is the weakest link in the chain. Treat a deployment root with no
attestation as unverified.

**5. Confirm the schedule was honoured.**

Read `opensAtUnix`, `enrollmentClosesAtUnix`, `closesAtUnix` and
`revealClosesAtUnix`. These are enforced on-chain, so they need no trust — but
they are worth reading to confirm the published schedule matches the one the
organiser advertised.

## What a failure looks like

| Observation | Meaning |
| --- | --- |
| Accepted root with no `registry.attest` anywhere | **Fail.** Unverified provenance; possibly fabricated. |
| Attestation transaction failed or is absent from chain | **Fail.** The manifest claims an attestation that does not exist. |
| Attestation targeted a different contract than `registryContract` | **Fail.** A look-alike registry, populated by the attacker. |
| `attestationTransactionId` equals the publish transaction id | **Fail.** They cannot share a transaction; the record is fabricated. |
| Deployment root never attested | **Unverified.** Not proof of wrongdoing, but the electorate's origin is unestablished. |
| Root in `revokedCredentialRoots` | Expected. Revocation is permanent; a revoked root can never be re-published. |

## What this does not prove

- It does not prove the registry's *credentials* correspond to real,
  unique people. That rests on the issuance process — document verification and
  the uniqueness check — not on this procedure.
- It does not prove the publisher admitted every legitimate root. Withholding a
  root disenfranchises those voters silently. The schedule limits the window
  in which that matters, but it is not detectable here.
- It does not run automatically. Nothing on-chain rejects an unattested root;
  this is a human or indexer check, and it is only as good as someone actually
  performing it.
