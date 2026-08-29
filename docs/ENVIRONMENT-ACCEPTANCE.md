# Environment acceptance matrix

This is the target acceptance matrix, not the runtime transcript. The current
Undeployed v2 lifecycle has an operator-verified local run, and its sanitized
manifest/transcript are committed at
[docs/evidence/undeployed-v2/abdd0a2/undeployed.manifest.json](evidence/undeployed-v2/abdd0a2/undeployed.manifest.json)
and
[docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json](evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json)
(manifest digest `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`).
Every user-visible claim must match the selected environment: local Undeployed
evidence does not upgrade the synthetic demo, and neither satisfies a Preview,
Passport, or physical NFC release gate.

| Capability | `demo` | `undeployed` | `preview` |
| --- | --- | --- | --- |
| Passport session | Deterministic fixture, labelled simulated | Real official Passport passkey/profile session when the origin is accepted; otherwise unavailable, not faked | Real official Passport passkey/profile session on the approved HTTPS origin |
| Passport account/ACC | Synthetic display fixture | Official returned account may be displayed, but is **not** claimed deployed on local devnet unless the protocol proves that network | Returned account must identify the Preview network and pass schema/origin/nonce validation |
| Passport recovery | No real recovery claim | Passport-owned encrypted backup only | Passport-owned encrypted backup only |
| Holder binding | `unsupported` or synthetic fixture, labelled | Verified Passport grant/signature when available; otherwise `unsupported` | Verified Passport grant/signature when available; otherwise `unsupported` |
| Civic credential | Synthetic adapter and fixture | Real local Registry V1 issuance from fixture evidence; fixture source remains disclosed | Real configured issuer and evidence adapter; synthetic fixtures cannot pass |
| Referendum contract | Simulated | Real local Referendum V2 deployed against the frozen local registry root | Real Preview Referendum V2 from the signed manifest |
| Proving | Simulated | Local proof server at `http://localhost:6300` | Local proving preferred; any remote/TEE provider is explicitly disclosed |
| Action funding/submission | Simulated | Durable atomic v2 relay, local node `ws://localhost:9944`; Lace is diagnostic fallback | Durable atomic v2 relay on configured Preview endpoints; Lace separately verified |
| Public reads | Fixture catalog/state | Real local indexer `http://localhost:8088/api/v4/graphql` | Real configured Preview indexer |
| Receipt | Synthetic and labelled | Canonical only after local indexer observation | Canonical only after independent Preview indexer observation |
| NFC/passport evidence | Not available or synthetic | Fixture evidence only until physical companion transcript exists | Rarimo/native companion only after physical-device gate; raw document data never enters this web app |

## Evidence state and remaining gates

The current local run is verified for the bounded Undeployed v2 lifecycle, and
its sanitized manifest/transcript are committed as the release evidence for
that lifecycle; the final Preview release record is still pending. The
following evidence is required before the corresponding environment may be
described as live or released.

### Demo

- A visible simulation disclosure before eligibility or action.
- No live, verified, deployed, or canonical wording for fixture results.
- No production acceptance test consumes demo fixtures.

### Undeployed v2 — operator-verified locally; evidence committed

- Verified locally: network ID `undeployed`, node/indexer/proof/PostgreSQL
  services, registry issue/freeze, referendum deploy/cast/replay rejection/
  close/reveal/finalize, canonical indexer confirmation, and the capability-
  gated relay's DUST, concurrency, and restart checks.
- Committed for the release record: the sanitized manifest and transcript at
  `docs/evidence/undeployed-v2/abdd0a2/undeployed.manifest.json` and
  `docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json`
  (human-readable form at `undeployed-v2.transcript.md`), containing only
  reviewed public addresses, identifiers, digests, the frozen root, indexer
  observations, and DUST accounting. Manifest digest
  `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`.
- Known limitation of the committed evidence: the three `registry.*` indexer
  observations (deploy, issue, freeze) were all captured at approximately
  2026-08-29T14:35:50Z, after the freeze had already completed. Each therefore
  records the terminal registry state (`frozen: true`, `credentialCount: 1`)
  rather than the state as of that individual stage. Each observation carries
  its own `observedAt` timestamp, so this is transparent in the artifact. The
  referendum observations progress correctly across stages (COMMIT ->
  REVEAL -> FINALIZED, issuedVotes 0 -> 1, tally 0 -> YES 1).
- DUST accounting uses a fixed-time valuation model: because DUST accrues over
  wall-clock time, the before/after balances in the evidence are both
  valuated at a single bounded reference instant (`valuationAt`); raw later
  balances can otherwise exceed earlier ones even after DUST was spent.
- The local result remains separate from Passport approval, a real provider
  credential, a hosted deployment, and Midnight Preview evidence.

### Preview

- The same artifact versions and operator command produce a signed Preview
  manifest.
- Passport/user, issuer, organizer, and relay identities are independent.
- Passport response network/account fields resolve to Preview.
- The transcript includes public addresses/hashes and DUST before/after, and a
  clean machine can resolve the final receipt through the Preview indexer.

## Fail-closed rules

- Missing or partial v2 configuration disables the real action; it never falls
  back to the v1 reader or simulated success.
- Wrong Passport origin, nonce, request ID, schema, network, or account contract
  is rejected.
- Submission without indexer confirmation remains pending.
- Unknown environment/provider capability is reported as unavailable, not
  inferred or fabricated.
