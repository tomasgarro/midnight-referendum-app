# Environment acceptance matrix

This is the target acceptance matrix, not a runtime transcript. The current
review checkout has **no verified Undeployed v2 runtime evidence** and no
committed sanitized manifest. Every user-visible claim must match the selected
environment. Synthetic data can demonstrate UX, but it cannot satisfy an
Undeployed or Preview release gate.

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

## Required runtime evidence (pending)

The following evidence is required before the corresponding environment may be
described as live or verified. None is asserted by this document until a fresh
run is reviewed and its sanitized manifest/transcript is deliberately
committed.

### Demo

- A visible simulation disclosure before eligibility or action.
- No live, verified, deployed, or canonical wording for fixture results.
- No production acceptance test consumes demo fixtures.

### Undeployed

- Network ID `undeployed` and the three local services are healthy: node `9944`,
  indexer `8088`, and proof server `6300`.
- A versioned manifest records artifact digests, deployed registry and
  referendum addresses, transaction IDs, frozen root, indexer observations,
  and DUST accounting.
- Registry deploy, issue, freeze, referendum deploy, cast, replay rejection,
  close, reveal, and finalize are reproducible from a clean checkout.
- Pending relay work survives browser and service restart; confirmation comes
  only from the indexer.

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
