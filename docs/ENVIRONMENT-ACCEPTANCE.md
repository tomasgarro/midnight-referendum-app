# Environment acceptance matrix

This is the target acceptance matrix, not a runtime transcript. The current
product is voting-first and uses an explicit synthetic fallback when live
dependencies are absent. Open enrollment is the current v2 model. The only
committed Undeployed v2 transcript is the historical, SHA-specific
frozen-enrollment record under
[`evidence/undeployed-v2/abdd0a2/`](evidence/undeployed-v2/abdd0a2/).

Every user-visible claim must match the selected environment. Local evidence
does not become Preview evidence, and a synthetic state never becomes a real
credential, vote, or canonical receipt through copy alone.

| Capability | `demo` | `undeployed` | `preview` |
| --- | --- | --- | --- |
| Passport session | Deterministic fixture, labelled simulated | Official Passport profile/session only when a live session is configured; the observed popup flow uses the person's consent sheet rather than an origin allowlist | Official Passport profile/session only after the release origin, network, nonce, and capability checks are evidenced |
| Passport profile | Synthetic display fixture | Consented display fields only; never eligibility or vote authority | Consented display fields only; never eligibility or vote authority |
| Civic credential | Synthetic adapter and fixture, visibly labelled | Configured local issuer and provider path; fixtures remain disclosed | Real configured issuer and verified evidence; synthetic fixtures cannot pass |
| Enrollment | Simulated | Open while the published enrollment window is active; later roots require attestation | Open while the published enrollment window is active; later roots require attestation |
| Referendum | Simulated | Referendum V2 with an initial root plus admitted, attested roots | Referendum V2 from a signed release manifest |
| Rarimo/NFC evidence | Unavailable or synthetic | Temporary Rarimo adapter only; no physical-device claim without a transcript | Rarimo/native adapter only after the physical and verifier gates |
| Proving | Simulated | Local loopback proof server when configured | Local proving preferred; any approved remote provider is disclosed |
| Action funding/submission | Simulated | Stateful v2 relay when configured; incomplete configuration blocks live action | Stateful v2 relay on approved Preview endpoints |
| Public reads | Fixture catalog/state | Configured local indexer | Configured Preview indexer |
| Receipt | Synthetic and labelled | Canonical only after indexer observation | Canonical only after independent Preview indexer observation |
| Wallet/recovery/biometric/ETH | Not offered | Not a current release requirement | Optional post-Preview Profile/Vault work, not implied by Passport consent |

## Acceptance gates

### Demo

- Show a simulation disclosure before eligibility or action.
- Keep `Synthetic credential`, `Simulated vote`, and simulated receipt wording
  visible at the relevant stages.
- Never contact CICO, Rarimo, a relay, a proof server, or a real contract from
  the synthetic path.
- Do not use demo fixtures as production acceptance evidence.

### Current source and local Undeployed target

- Use the current open-enrollment source and record the exact source SHA for any
  new local run.
- Require network, node, indexer, proof-server, contract, and relay settings to
  be explicit; missing or partial settings select synthetic/unavailable state,
  not a fabricated live result.
- Ensure later roots are paired with separate registry attestations and that
  the accepted-root list is auditable.
- Keep Passport profile/session values separate from credential leaves,
  voter secrets, ballot commitments, and nullifiers.
- Keep raw MRZ/NFC/document/face/provider-proof data behind the restricted
  verifier and issuer; do not log or persist it in the browser or relay.
- Call a receipt confirmed only after the canonical indexer observes the
  transaction.

### Historical Undeployed v2 evidence

The preserved record at
[`evidence/undeployed-v2/abdd0a2/`](evidence/undeployed-v2/abdd0a2/) is complete
evidence for its own local run only. It is bound to:

- source commit `abdd0a2203fbef909f70f6ddc06681ac1327f457`;
- source tree `9d1319aa3540a0943f760631ec3ac9c9e5b40b36`;
- manifest digest `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`;
- the older frozen registry lifecycle, including `registry.freeze`.

The registry observations and DUST accounting remain useful audit details, but
they do not prove current-source behavior, Passport approval, physical NFC, a
hosted service, or Midnight Preview. Preserve the JSON and Markdown files
unchanged; a new run gets a new evidence directory and manifest.

### Preview release

Before calling the Preview environment live or released, attach a new record
for the exact release SHA containing:

- approved Passport origin/session evidence, with independent user, issuer,
  organizer, and relay identities;
- pinned verifier/issuer configuration, physical NFC transcript, minimum-claim
  issuance, deletion, and replay/idempotency checks;
- open-enrollment schedule, accepted roots, separate registry attestations, and
  canonical indexer observations;
- cast, close, reveal, and finalize transaction records plus DUST, restart, and
  indexer-lag reconciliation;
- static-host HTTPS/deep-link smoke tests, privacy/log/storage scans, and the
  published synthetic fallback behavior.

## Fail-closed rules

- Missing or partial live configuration disables the live action and selects the
  labelled synthetic/unavailable state; it never falls back to v1 routes.
- Wrong Passport origin, nonce, request ID, schema, network, or account
  contract is rejected.
- Unknown environment/provider capability is unavailable, not inferred.
- A relay acknowledgement is pending until indexer confirmation.
- Fixtures, source adapters, and historical transcripts are never described as
  genuine Passport credentials or physical NFC evidence.
