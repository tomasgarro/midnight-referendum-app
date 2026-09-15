# Release and deployment record — 13 September 2026

This is a reconciliation record, not a new deployment and not a production approval. It records the newest checked-in evidence available to source commit `572f79fb87d0f521f0d38c1cbf65179fbfefe1ce`. Exact deployed-source equivalence is not established.

## Public web demo

- URL: `https://lightskyblue-emu-103266.hostingersite.com/`
- Product mode: static synthetic/demo UI; no real pulse collection.
- A fresh 13 September comparison found the live entry HTML, main JS, and main CSS byte-identical to `deploy/hostinger/artifacts/ui_jury-demo_20260901_231135.zip`.
- Archive SHA-256: `6BDCEEA1F87E5AD817F3D30A41B30C522408BD8F40F4EE1BBE3D6CBEC4DF9828`.
- Matching entry hashes are recorded in the focused review at `outputs/referendum-review-20260913/REPORT-AND-IMPLEMENTATION-PLAN.md` outside this checkout.
- The deployed CSP is not yet restrictive enough for release certification. No artifact or headers were changed by this implementation batch.

## Midnight Preview evidence

The preserved 2 September record at [`../evidence/preview-2026-09-02/`](../evidence/preview-2026-09-02/) is tied to source commit `f8e7602c784276131d4a90bca47ca8163f7f13a2`, not the current source head. It records:

- Credential Registry V1 deployment;
- one credential issuance and registry-root attestation;
- Referendum V2 deployment;
- independent observations from the Preview indexer.

It does **not** record a completed citizen vote, reveal, final tally, or canonical citizen receipt. The manifest remains `in-progress`. These facts supersede older statements that no Preview contracts had ever been deployed, but they do not establish current-head deployment readiness.

## Rarimo and CICO staging evidence

The preserved 2 September record at [`../evidence/rarimo-nfc/2026-09-02-hostinger-staging.md`](../evidence/rarimo-nfc/2026-09-02-hostinger-staging.md) records a digest-pinned Hostinger staging topology, loopback-only verifier/gateway access, persistence/restart behavior, and cleanup checks. It is staging evidence, not a physical NFC/ePassport transcript and not proof of a complete participant journey. No fresh VPS health check was performed for this record.

## Current product boundary

The locally implemented entry restores the mascot-led privacy and
zero-knowledge onboarding. The civic-priorities demonstration now lives inside
the Discover workspace and is lazy-loaded only when opened. Its answers remain
in component memory and are not submitted or persisted. The official Passport
account bridge accepts Stagenet profile/session responses and displays their
actual network separately from the app's contract runtime. Real pulse
collection is blocked on a privacy-preserving aggregation design because
Referendum V2 reveals individual choices during tallying.

## Unresolved release gates

- exact source SHA for the deployed public artifact;
- restrictive, artifact-tested CSP and header policy;
- current-source Preview replay through citizen vote and canonical receipt;
- CICO issuance-to-capability completion without weakening holder checks;
- physical-device NFC/ePassport evidence;
- secure aggregation, consent, retention, publication, and operator-trust decisions for any real civic pulse.
