# Undeployed Passport-v2 jury transcript

> Sanitized local evidence. This is not Midnight Preview, live Passport consent, or physical NFC evidence.

## Outcome

- Status: complete
- Network: undeployed
- Started: 2026-08-29T14:30:22.399Z
- Finished: 2026-08-29T14:37:34.586Z
- Reproduce: `npm ci && npm run evidence:undeployed:v2` from Linux/WSL with Docker running.

## Reproducible source and stack

- Source commit: `abdd0a2203fbef909f70f6ddc06681ac1327f457`
- Source tree: `9d1319aa3540a0943f760631ec3ac9c9e5b40b36`
- Manifest digest: `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`
- Compact compiler: 0.31.1
- Midnight.js: 4.1.1
- Node / indexer / proof server: midnightntwrk/midnight-node:1.0.0 / midnightntwrk/indexer-standalone:4.3.3 / midnightntwrk/proof-server:8.1.0

## Public deployment bindings

| Item | Public value |
| --- | --- |
| Registry contract | `5cd355cf242b6906c3e20c6352002278a6a2b316df49ebda5d2741cba7b53622` |
| Frozen registry root | `9541604641453441483771715182390480768947133921832842927505602360350060446905` |
| Referendum contract | `f03b605dd17b6f80e5cc703f809d4513fe3dda4020444023cf40d6e14e76ebd8` |
| Registry binding | `51aefc012783e520f9e8de44e862fca7af7a6236df579efc22e611557ad0fdd2` |

## Indexer-confirmed lifecycle

| Step | Status | Circuit | Transaction | Block |
| --- | --- | --- | --- | ---: |
| registry.deploy | confirmed | deploy | `00efb939efebde176b9ca79c6269b0483ed9459749f3724c0a30d5b6119d75cbcb` | 39 |
| registry.issue | confirmed | addCredential | `007fc928f5d7abc533916d57b0994e226f3a6f0d2ea492072a64897d0daa3cd966` | 43 |
| registry.freeze | confirmed | freeze | `00e5ca789a278b1c31889c668fbf01812aed9853323782acb88e31770ce50108c1` | 47 |
| referendum.deploy | confirmed | deploy | `00befa09068fb681731197f74f0272685b3b8867d83aa14bb260d7c57c9552afab` | 50 |
| lifecycle.cast | confirmed | castVote | `00cddfabb4d265599cf0a9489ac1fbe6ece7e62059a196ca1e1b4d8f788bf2f51f` | 56 |
| lifecycle.replay-rejected | rejected | — | — | — |
| lifecycle.close | confirmed | closeVote | `00665027fe40cac7b2a86585c13edffbc97b30375fbbfbb7b8e1c5d479806aaba3` | 60 |
| lifecycle.reveal | confirmed | revealVote | `00d9d8acaccb68e562edd32a17ac15f95420093740a5ab6e862268c0ce9877b046` | 64 |
| lifecycle.finalize | confirmed | finalizeVote | `008bf66cd00910973718c47c713d00fff4b841603ff3bd6f407f5cc7754a8784e5` | 68 |

Canonical final state: **FINALIZED**. Replay rejected: **yes**.

## Atomic walletless relay

- Submission transport: `v2-actions`
- Action ID: `189ed1ee-153a-4eed-8db1-0c6bbbd1fe73`
- Idempotency digest: `8c220a7b8d9c08aa24c583f8c4e9661458c8c6445d51945187f20e14876944b2`
- Confirmed transaction: `00cddfabb4d265599cf0a9489ac1fbe6ece7e62059a196ca1e1b4d8f788bf2f51f`
- Durable states: `authorized` → `validated` → `dust_reserved` → `finalized` → `submitted` → `indexer_pending` → `confirmed`
- Durable action store: **postgresql**
- Legacy compatibility API enabled: **no**
- Concurrent duplicate resolved once: **yes**
- Post-restart retry recovered the same action: **yes**
- Legacy `/balance` or `/submit` requests: **0**

## DUST accounting

- Fixed valuation instant: 2026-08-29T14:35:43Z
- Before / after: 54939482874360835 / 52927393236564295
- Accounted spend: 2012089637796540

## Privacy boundary

- Operator-only deployment, issuance, freeze, close, reveal, and finalize actions never traverse the public relay.
- The public relay is allowlisted to the exact Undeployed network, referendum contract, and `castVote` circuit.
- This transcript contains public addresses, transaction identifiers, state and digests only. It omits private keys, holder openings, witness/proof payloads, vote salt, raw transaction bodies, Passport profile data, and bearer capabilities.
- Runtime secret policy: memory-only process environment; no generated secret files; raw actions and capabilities are memory-only.

## Remaining external gates

- Real Passport HTTPS-origin consent and encrypted recovery.
- Deployment of the same artifacts to Midnight Preview with independent funded identities.
- Physical iOS/Android Rarimo NFC evidence.

