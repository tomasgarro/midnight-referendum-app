# Passport-first v2 architecture

This document is the ownership map for the active product and target runtime.
It deliberately separates account consent, civic eligibility, action authority,
and public receipt resolution. A value crossing one boundary is not authority
in another. The current review checkout has no verified Undeployed v2 runtime
transcript for its current source. The preserved `abdd0a2` transcript belongs to
an older frozen-enrollment implementation; this map is not deployment or
Preview evidence. See [ADR-007](adr/ADR-007-open-enrollment-and-evidence-roles.md)
for the current open-enrollment decision.

```text
Official Midnight Passport PWA
  passkey account + consented display/account fields
                 |
                 v
        PassportSessionPort
                 |
       optional verified grant
                 v
   PassportHolderBindingPort ---- unsupported is a valid result

Native NFC companion -> evidence provider -> CICO issuer
       (future P1/P2)      opaque auth       minimum claims only
                                                   |
                                                   v
browser encrypted vault <- private holder material <- Registry V1 leaf
          |                                             |
          | local witness + proof                       | initial + admitted roots
          v                                             v
     CivicActionPort ----------------------------> Referendum V2
          |
          v
 atomic walletless relay -> Midnight node -> indexer -> canonical receipt
```

## Package and service ownership

| Boundary | Owner | May receive | Must never receive |
| --- | --- | --- | --- |
| Web product | `ui/` | consented Passport display fields, public catalog/state, encrypted local holder state, local proof result | Passport recovery secret, raw MRZ/NFC/provider evidence |
| Domain and Midnight adapters | `api/` | provider-neutral port requests, public contract state, witness material inside the local boundary | UI presentation policy or relay fee keys |
| CICO issuer | `cico-service/` | opaque verified evidence authorization, minimum claims, private holder commitment | ballot choice, holder secret/blind, Passport profile, raw document payload |
| Walletless relay | `relayer/` | one-time action capability, proved transaction, allowlisted runtime identifiers | unproved witness, Passport profile, eligibility claims, ballot choice, MRZ/NFC data |
| Compact contracts | `contracts/` | issuer-bound leaf/root, public policy, proof-validated action | names, document data, Passport account/profile, clear ballot opening before reveal |
| Operator/deployment | `scripts/`, runtime manifest | public artifact digests, endpoints, addresses, transaction IDs, DUST observations | browser holder material or Passport recovery data |

## Stable interfaces

- `PassportSessionPort` handles only official account/session/profile consent.
- `PassportHolderBindingPort` returns a verified signed challenge or scoped
  grant when the official capability exists, and `unsupported` otherwise.
- `CivicCredentialPort` hides synthetic, Rarimo, or future Passport-native
  evidence and issuance transports.
- `CivicActionPort` hides the walletless relay and the secondary Lace path.
- `CanonicalReceiptResolver` treats indexer observation—not submission—as the
  source of receipt truth.
- `RuntimeManifest` pins network, artifact versions, contracts, policies, and
  service endpoints for one reproducible environment.

## Active and compatibility paths

The active path is Credential Registry V1 plus Referendum V2, selected from a
versioned runtime catalog. Enrollment is open during the published window: the
referendum pins its initial root and admits later roots only through the
attested root-publisher path. Legacy referendum v1 code, its single-contract
reader, `/balance` and `/submit`, and `VITE_MIDNIGHT_CONTRACT_ADDRESS` are
compatibility-only. No active v2 screen may fall back to them. Public v2
catalog and referendum state remain readable without Passport, a civic
credential, or a wallet; the user-facing fallback is synthetic and labelled.

## Security invariants

1. Passport profile data is display/session data, never a credential or vote
   input.
2. Evidence authorization is opaque and single-use; CICO persists only the
   minimum derived claims needed for issuance.
3. Holder material is generated and encrypted in the browser boundary.
4. Proof creation is intended to happen locally for the Undeployed and Preview
   product paths; this requirement is not a claim that either path is live.
5. The relay accepts only already-proved, allowlisted work and reserves DUST
   transactionally.
6. A relay acknowledgement is pending state. Only an indexer observation can
   create a canonical confirmed receipt.
7. The Passport-to-holder link is never inferred from a name, address, or
   profile field.
8. A citizen credential can authorize only `castVote`; issuer and organizer
   circuits require separate role-bound capability issuers even if a relay
   allowlist is misconfigured.

9. Passport currently supplies session/consent/profile data only. Rarimo is a
   temporary NFC evidence adapter behind the issuer boundary; neither is a
   wallet, recovery, biometric, ETH, or arbitrary-action authority.
