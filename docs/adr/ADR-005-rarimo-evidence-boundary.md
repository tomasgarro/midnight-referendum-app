# ADR-005: Rarimo evidence stays behind an injected Passport-first boundary

- Status: Accepted for Preview/local implementation
- Date: 2026-08-24
- Owners: CICO platform team

> Rarimo is a temporary NFC eligibility-evidence adapter, not Passport
> identity, wallet, recovery, biometric, ETH, or voting authority. Passport
> remains the profile/session boundary. Open enrollment and the current release
> fallback are defined in [ADR-007](ADR-007-open-enrollment-and-evidence-roles.md).

## Context

CICO needs a Preview-only bridge from a passport NFC proof to its existing
`CivicCredentialPort`. Midnight Passport is the product's session and
authorization boundary; Rarimo is an evidence provider that may be replaced by
a Passport-native credential issuer later. The Rarimo transport must therefore
not leak into the provider-neutral API, Compact contracts, or UI.

Rarimo's documented off-chain flow is asynchronous: a backend creates a private
verification link, publishes proof parameters, the Rarime app scans the
passport and the request QR, then the app posts a callback and the backend
polls verification status and fetches a proof. The current service exposes
transport-specific statuses and a 23-signal global proof. Its proof carries
nullifier, citizenship, query selector, event ID/data, and range-bound signals,
but it does not carry CICO's issuer ID, credential epoch, or assurance label.

Primary references:

- [Rarimo ZK Passport overview](https://docs.rarimo.com/zk-passport/)
- [Off-chain verification guide](https://docs.rarimo.com/zk-passport/guide-off-chain-verification/)
- [Verifier service setup](https://docs.rarimo.com/zk-passport/guide-setting-up-verificator-svc/)
- [Verifier service routes and implementation](https://github.com/rarimo/verificator-svc)
- [ZK Passport SDK proof model](https://github.com/rarimo/zk-passport)
- [Global query public-signal order](https://github.com/rarimo/passport-zk-circuits#query-circuit-public-signals)

## Decision

Implement a local `RarimoCivicCredentialAdapter` that implements the existing
`CivicCredentialPort` and accepts an injected `RarimoVerificationGateway`.
It also requires an injected `CivicCredentialIssuerPort`; verified Rarimo
evidence alone is never represented as an issued Midnight credential.
Raw Rarimo proof DTOs remain backend-only. The implemented `cico-service/`
HTTP façade belongs to the infrastructure boundary and returns only minimal verified evidence plus a
single-use issuance authorization. The browser adapter does not perform direct
Rarimo network I/O and does not depend on Rarimo packages.

The adapter uses the following flow:

1. Require an active connected Midnight Passport session.
2. Create a fresh opaque enrollment/request ID, holder secret/blind, event ID,
   and event data for every attempt. Bind the event data as both hex and the
   exact decimal public signal expected by Rarimo.
3. Ask the gateway for a verification link and reject a response whose request
   ID or opaque user hash is not bound to the created request.
4. Poll status. Only the exact `verified` status can advance; pending and all
   failure statuses remain non-issued.
5. The trusted gateway verifies the Groth16 proof, exact 23-signal shape,
   positive nullifier, and all request-bound signals on the backend. It returns
   only minimal evidence; the browser rechecks request/user/event/selector/range
   bindings and never receives the raw proof.
6. Derive only the minimal CICO claims: ISO numeric country, optional `18-plus`
   age class, and `document-nfc` assurance. Country is decoded from the proof's
   alpha-3 citizenship signal and checked against the requested country policy.
   Issuer ID, epoch, and validity timestamps are supplied by the adapter
   deployment, not the passport profile or proof body.
7. Send the issuer only the blinded holder binding, minimal claims, and an
   opaque single-use backend authorization. Mark the enrollment `issued` only when the
   issuer returns a successful canonical `CredentialRegistryV1.addCredential`
   receipt and a credential leaf that matches the shared Compact derivation.
8. Expose issued opening material only through the browser-private
   `CivicCredentialPrivateStatePort`, using defensive copies. The v2 action
   adapter resolves the canonical registry path and moves the witness into the
   encrypted, contract-address-scoped private-state provider. No HTTP vote
   endpoint receives the choice or opening.
9. Retain only the provider-neutral summary and an in-memory one-way proof
   fingerprint. Never log, persist, or expose the raw proof, MRZ, NFC payload,
   or stable Rarimo user hash.
10. Treat issued/failed/expired states as terminal and make cleanup idempotent.
   Clear and expiry invoke the gateway delete hook, then zeroize local holder
   material and forget local records even when remote cleanup is temporarily
   unavailable.

The adapter uses the complete assigned ISO 3166-1 catalogue through the typed
`iso-3166` package and requires an explicit uniqueness timestamp upper bound. It
does not guess these values. One-country policies may additionally be encoded
as a Rarimo citizenship mask; all-country and multi-country policies are still
checked against the verified proof after issuance.

## Consequences

### Positive

- Preview and tests can use deterministic fakes without credentials, Rarimo
  SDKs, public service access, or live network calls.
- Midnight Passport remains the user/session core and the adapter can later be
  swapped for a Passport-native issuer without changing referendum or Compact
  boundaries.
- Request binding, exact status gating, terminal replay handling, and cleanup
  are testable independently of transport.
- The domain receives geography and age class only, supporting cohort views
  without making Passport profile data an eligibility claim.

### Risks and limits

- Rarimo's callback and proof routes are transport details. An HTTP gateway must
  authenticate private routes, verify callback JSON:API identity, validate the
  proof envelope, apply timeout/rate limits, and avoid storing raw proof data in
  logs or durable application tables. The local adapter cannot establish those
  operational guarantees by itself.
- Rarimo's service stores sensitive request/proof-derived fields and its public
  deployment is not a production trust boundary. Self-hosting, database
  retention/deletion, access control, callback origin protection, and issuer
  key management are prerequisites for any non-local use.
- A country claim is only as authoritative as the configured Rarimo issuer,
  country catalogue, and circuit verification. It is not a legal nationality
  determination. Cohort percentages must use minimum-count thresholds and be
  presented as aggregate, opt-in analytics rather than identity disclosure.
- The adapter synthesizes CICO issuer/epoch/validity metadata. These values are
  deployment policy and must be versioned and audited; they are not assertions
  made by Rarimo.
- Rarimo's upstream APIs and signal ordering may change. The gateway must pin
  the service/circuit version and the adapter's fixture suite must fail closed
  when the signal count or binding indices change.

## Test obligations

The local gateway double covers pending, exact verified issuance, failed and
uniqueness-failed statuses, request/user binding mismatch, replayed polling,
and cleanup/idempotency. The CICO HTTP façade has real loopback tests for exact
origins, bounded bodies, safe request/response shapes, canonical issuance, and
absence of a vote endpoint. The injected live Rarimo implementation still needs tests for callback path/data-ID mismatch, unauthorized private calls, malformed
proof JSON, non-23-signal proofs, duplicate callbacks, provider timeout, and
delete retry behavior.

## Rejected alternatives

- Calling Rarimo directly from the browser: rejected because it exposes
  provider transport and creates an unsafe proof/raw-data retention boundary.
- Using Passport profile fields as country or eligibility: rejected because
  profile/session data is not a verified civic credential.
- Treating any non-empty proof as valid: rejected because Rarimo status,
  request binding, circuit signal count, and policy checks are authoritative.
- Persisting the raw proof for future UI use: rejected because CICO needs only
  derived claims and a receipt/replay marker, not passport or proof material.
