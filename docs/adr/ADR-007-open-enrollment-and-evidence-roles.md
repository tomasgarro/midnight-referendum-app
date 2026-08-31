# ADR-007: Open enrollment and explicit evidence roles

- Status: Accepted for the current Preview-targeted product
- Date: 2026-08-30
- Supersedes: [ADR-006](ADR-006-credential-epoch-lifecycle.md) for the
  enrollment model

## Context

The first v2 implementation used a frozen-before-deploy registry: the issuer
stopped, the registry froze, and a referendum pinned that one root. The
sanitized Undeployed record at `abdd0a2` preserves that model and remains
valuable historical evidence, but it is tied to source commit
`abdd0a2203fbef909f70f6ddc06681ac1327f457` and must not define the current
product.

The current source supports a consultation that opens for enrollment and
continues admitting eligible participants during its published enrollment
window. A referendum seals its initial registry root for provenance and can
admit later roots through a narrow root-publisher circuit. Midnight does not
provide the cross-contract call needed for that circuit to verify registry
provenance itself, so a separate registry attestation and an auditable
operator pairing are required.

The product also needs clear identity and evidence roles. Passport currently
provides session, consent, and optional display-profile information. It does
not provide a civic credential, arbitrary Compact action authority, or
biometric uniqueness guarantee. Rarimo is a temporary NFC evidence adapter
behind the CICO issuer boundary; it is not the product identity layer.

## Decision

### Enrollment

1. **Open enrollment is the current model.** `CredentialRegistryV1` remains
   append-only while the published enrollment window is open.
2. A referendum stores its initial registry root and accepts later roots only
   through `publishCredentialRoot` using the independent root-publisher role.
3. Every later root must be paired with a successful, separate
   `CredentialRegistryV1.attestCurrentRoot` transaction for the selected
   registry. The manifest records both transaction identifiers. This is an
   audit mitigation, not an on-chain cross-contract guarantee.
4. The organizer may close enrollment at its published deadline. Voting and
   reveal/finalize deadlines remain distinct. A root cannot be revoked after
   enrollment closes; a bad late deployment requires an operator response,
   not a silent electorate change.
5. A credential enrolled after a referendum's enrollment deadline belongs to
   a later consultation/epoch. The UI must show `enrollment open`,
   `enrollment closed`, and `next consultation` states honestly.

The frozen-before-deploy model remains available only as a historical
compatibility path and for interpreting the preserved `abdd0a2` transcript. It
is not the default current release model.

### Evidence and identity roles

| Role | Current responsibility | Explicit non-responsibility |
| --- | --- | --- |
| Midnight Passport | Consent, session, and optional display profile | Eligibility, ballot identity, arbitrary Compact execution, biometric uniqueness |
| Rarimo | Temporary NFC/document evidence adapter returning request-bound minimal claims to the restricted CICO service | Product identity, direct browser network I/O, credential issuance authority, voting authority |
| CICO issuer | Transiently validate the provider proof in the restricted adapter, derive minimal issuer-bound claims, and issue the credential through the registry | Receiving ballot choice or voter secret; persisting or returning raw document/MRZ/NFC/proof material |
| Browser private state | Hold voter secret, credential opening, ballot choice, salt, witness, and local receipt context | Public identity or a server-side vote endpoint |
| Referendum / relay | Enforce credential policy, nullifier, action allowlist, and canonical indexer receipt flow | Passport profile interpretation or unverified evidence acceptance |

Passport profile/session data must never enter the credential leaf, voter
secret, ballot commitment, or nullifier. The restricted CICO adapter may fetch
the Rarimo proof from the private verifier, validate its envelope and public
signals in memory, and immediately project minimal claims. It must never log,
persist, or return that proof, and it must invoke upstream cleanup after the
opaque issuance authorization is consumed. Raw document, MRZ, and NFC payloads
must never enter CICO. A fixture or synthetic adapter is never physical NFC
evidence.

Voting is the primary product action. Real wallet custody, recovery,
biometric features, and ETH behavior are optional post-Preview Profile/Vault
work, each requiring its own product and security decision. They are not
implied by connecting Passport.

### Fallback and deployment

The user-facing product must keep a synthetic fallback when Passport, Rarimo,
the issuer, the relay, or Preview is unavailable. The fallback is explicit and
labelled; it cannot emit a real-credential, real-vote, or canonical-receipt
claim.

The target hosted topology is a Hostinger static web surface plus isolated
Hostinger VPS stateful services for the issuer, verifier, database, and relay.
Static hosting receives only public browser configuration. Secrets and durable
state remain on the appropriate VPS service boundary.

## Consequences

- Participants can enroll during a bounded consultation window without
  pretending that the registry is immutable before the consultation exists.
- A referendum must maintain an auditable list of accepted roots and their
  registry attestations; root provenance remains partly operational until
  cross-contract calls are available.
- The current UI and release documents can keep Passport central without
  turning profile fields into civic authority.
- Replacing Rarimo with a reviewed Passport-native evidence provider remains an
  adapter migration. It does not grant Passport profile fields eligibility
  authority.
- Historical frozen evidence remains reproducible and reviewable without being
  confused with current open-enrollment or Preview evidence.

## Rejected alternatives

- **Freeze before deploying every current referendum.** Rejected as the
  current default because it prevents bounded open enrollment during a live
  consultation; retained only for historical compatibility.
- **Let the referendum trust any root from the publisher.** Rejected because
  the contract cannot verify cross-contract provenance; separate registry
  attestation and manifest audit are mandatory.
- **Use Passport profile or session fields as eligibility.** Rejected because
  consented display data is not a verified civic claim.
- **Call Rarimo directly from the browser.** Rejected because raw provider
  transport and proof data would cross the wrong trust boundary.
- **Make wallet, recovery, biometric, or ETH features prerequisites.**
  Rejected for the current voting-first Preview scope; evaluate them later in
  Profile/Vault decisions.

## Evidence basis

- Current open-enrollment implementation: `contracts/referendum-v2/referendum-v2.compact`
  and `scripts/deploy-passport-v2.mjs`.
- Root provenance limitation and audit procedure:
  [`ROOT-ATTESTATION-AUDIT.md`](../ROOT-ATTESTATION-AUDIT.md).
- Passport and Rarimo boundaries: [ADR-001](ADR-001-passport-first-boundaries.md)
  and [ADR-005](ADR-005-rarimo-evidence-boundary.md).
- Historical frozen run: [`../evidence/undeployed-v2/abdd0a2/`](../evidence/undeployed-v2/abdd0a2/).
