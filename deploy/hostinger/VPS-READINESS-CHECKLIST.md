# VPS deployment readiness checklist

Every value and decision the Midnight/Rarimo stack needs before
`docker compose … up -d` on the Hostinger VPS, with nothing filled in.

This is a gate list, not a runbook. The procedure is
[`RUNBOOK.md`](RUNBOOK.md); this exists so you can see, at a glance, what is
still missing without opening five template files.

**Never record a real value in this file.** Every row is a name, an owner and a
state. Secrets belong in `*.local` files with mode 0600 on the VPS, or in an
operator secret store.

## Status as of 31 August 2026

| Area | State |
| --- | --- |
| Static demo | **Live.** `https://lightskyblue-emu-103266.hostingersite.com/` serves the reviewed synthetic bundle over HTTPS. |
| VPS stack | **Not started.** No Midnight Compose project exists on the VPS. |
| Blocking category | Credentials, domains and a physical NFC test — not code. |

Target VPS: ID `1684196`, `hermes-agent.vps`, Ubuntu 24.04, KVM 2, 2 vCPU,
8 GB RAM, 100 GB disk. The existing `hermes-agent-c3p7` Compose project on that
host is unrelated and must not be touched: the Midnight stack goes in its own
project with its own networks and volumes.

---

## A. Decisions that must be made before anything is provisioned

| # | Decision | Owner | State |
| --- | --- | --- | --- |
| A1 | Is this a public pilot or an invite-only test? Determines whether an independent privacy review is required first. | Product | ☐ |
| A2 | Sponsored relayer, or citizen-supplied wallet? The relayer path removes the wallet from the citizen journey entirely and is the current default. | Product | ☐ |
| A3 | Which referenda go live, with which country policy and assurance floor. | Product | ☐ |
| A4 | Who operates the root publisher, and on what batching cadence. | Ops | ☐ |
| A5 | Retention schedule for Rarimo records and CICO state. | Legal/Ops | ☐ |
| A6 | Whether RariMe product footage may be redistributed from our origin (blocks the optional in-app tutorial clip). | Legal | ☐ |

## B. Domains and TLS

Four names, all resolved before the allowlists are rendered. Changing any of
them afterwards means re-rendering both CORS allowlists.

| # | Value | Used by | State |
| --- | --- | --- | --- |
| B1 | `UI_ORIGIN` — exact HTTPS origin of the static frontend | `.env.public`, both CORS allowlists | ☐ |
| B2 | `CICO_DOMAIN` — CICO `/v1/*` API | `.env.public`, Caddy | ☐ |
| B3 | `RELAY_DOMAIN` — relayer `/v2/*` API | `.env.public`, Caddy | ☐ |
| B4 | `RARIMO_DOMAIN` — public proof-params + callback only | `.env.public`, Caddy, `CICO_RARIMO_PROOF_PARAMS_ORIGINS` | ☐ |
| B5 | A records for B2–B4 pointing at the VPS | DNS | ☐ |
| B6 | Caddy has issued certificates for all three | Caddy | ☐ |

No wildcards, no paths, no query strings, no temporary domains.

## C. Image digests

Floating tags are not acceptable. Every one of these is a `tag@sha256:` pin in
`.env.public.local`.

| # | Image | State |
| --- | --- | --- |
| C1 | `CADDY_IMAGE` (`caddy:2.10.2-alpine@…`) | ☐ |
| C2 | `POSTGRES_IMAGE` (`postgres:16.10-alpine@…`) | ☐ |
| C3 | `MIDNIGHT_PROOF_IMAGE` (`midnightntwrk/proof-server:8.1.0@…`) | ☐ |
| C4 | `CICO_IMAGE` — built locally from a clean checkout, digest recorded | ☐ |
| C5 | `RELAYER_IMAGE` — same | ☐ |
| C6 | `RARIMO_IMAGE` — reviewed derivative at upstream `f7ebbdf4…` with `v0.3.12-cico-delete-204.patch` applied exactly once, `--target test` passing | ☐ |
| C7 | Node base digest used for both C4 and C5 is identical | ☐ |
| C8 | Go and Alpine base digests for C6 recorded | ☐ |

## D. Secrets

Five independent 32-byte values, plus two database passwords. Generate them on
the VPS; never in a `VITE_*` variable, never in a chat window, never in git.

| # | Secret | File | Must equal | Must NOT equal | State |
| --- | --- | --- | --- | --- | --- |
| D1 | `RELAYER_SEED` | `.env.relayer.local` | — | anything else here | ☐ |
| D2 | `CICO_ISSUER_WALLET_SEED` | `.env.cico.local` | — | D1, D3, D4, D5 | ☐ |
| D3 | `CICO_ISSUER_ROLE_SECRET` | `.env.cico.local` | — | D1, D2, D4, D5 | ☐ |
| D4 | `CICO_ROOT_PUBLISHER_SECRET_HEX` | `.env.cico.local` | — | D1, D2, D3, D5 | ☐ |
| D5 | `CICO_ACTION_CAPABILITY_SECRET` | `.env.cico.local` | `RELAYER_V2_CAPABILITY_SECRET` | D1–D4 | ☐ |
| D6 | Relayer DB password (URL-safe) | `.env.relayer-db.local` + the URL in `.env.relayer.local` | itself, in both places | — | ☐ |
| D7 | Rarimo DB password (URL-safe) | `.env.rarimo.local` + `rarimo/config.yaml` | itself, in both places | — | ☐ |

D5 is the one pair that must match. Everything else matching is a defect.

## E. Midnight network configuration

| # | Value | State |
| --- | --- | --- |
| E1 | `CICO_NODE_URL` / `RELAYER_NODE_URL` reachable from the VPS | ☐ |
| E2 | `CICO_INDEXER_HTTP_URL` / `_WS_URL` reachable | ☐ |
| E3 | `RELAYER_INDEXER_HTTP_URL` / `_WS_URL` reachable | ☐ |
| E4 | Both proof servers answer `/version` with the pinned version, probed from the adjacent Node container | ☐ |
| E5 | Relayer wallet fully synced (its health check stays unhealthy until it is — this is intended) | ☐ |
| E6 | Relayer has DUST, and a positive readiness check | ☐ |
| E7 | Registered DUST capacity is enough for the expected vote volume | ☐ |

> **Known operational limit.** The relayer holds a single DUST coin. Two
> submissions in quick succession hit error 170 and the relayer needs a
> restart — waiting does not clear it. Either fund additional coins or serialise
> submissions before opening this to more than one person at a time.

## F. Contracts and catalogue

| # | Value | State |
| --- | --- | --- |
| F1 | Registry contract deployed on the target network | ☐ |
| F2 | `CICO_REGISTRY_CONTRACT_ADDRESS` + `CICO_REGISTRY_ID_HEX` recorded | ☐ |
| F3 | Referendum contract(s) deployed | ☐ |
| F4 | `CICO_ACTION_ALLOWED_CONTRACTS` / `RELAYER_V2_ALLOWED_CONTRACTS` list exactly those addresses | ☐ |
| F5 | `CICO_ACTION_ALLOWED_CIRCUITS` is `castVote` and nothing else | ☐ |
| F6 | `CICO_ISSUER_ID` + `CICO_ISSUER_ID_HEX` + `CICO_CREDENTIAL_EPOCH` agreed and consistent across CICO and the frontend build | ☐ |
| F7 | `CICO_REFERENDA_JSON` is a complete array, or empty — never partially filled | ☐ |
| F8 | `VITE_CICO_REFERENDA_JSON` in the frontend build matches F7 | ☐ |
| F9 | Deployment manifest and transcript captured for the exact release SHA | ☐ |

## G. Frontend build inputs

All public by definition — they are compiled into the browser bundle.

| # | Value | State |
| --- | --- | --- |
| G1 | `VITE_APP_MODE=preview` | ☐ |
| G2 | `VITE_PASSPORT_V2_API_URL` = `https://CICO_DOMAIN` | ☐ |
| G3 | `VITE_RELAYER_URL` = `https://RELAY_DOMAIN` (if A2 chose the relayer) | ☐ |
| G4 | `VITE_MIDNIGHT_INDEXER_URL` / `_WS_URL` | ☐ |
| G5 | `VITE_MIDNIGHT_EXPLORER_BASE_URL` | ☐ |
| G6 | `VITE_PASSPORT_ORIGIN` — the **approved** production origin | ☐ |
| G7 | `VITE_RARIMO_UNIQUENESS_TIMESTAMP_UPPER_BOUND` | ☐ |
| G8 | Verified that no secret from §D appears in the built bundle | ☐ |

> **Check G8 mechanically.** `npm run verify:showcase` scans the bundle; run it
> against the Preview build too, not only the demo one.

## H. Passport and Rarimo authorisation

| # | Gate | State |
| --- | --- | --- |
| H1 | `UI_ORIGIN` registered and approved with Midnight Passport | ☐ |
| H2 | Passport returns a real session from that origin (transcript captured) | ☐ |
| H3 | Rarimo verifier pinned to the reviewed commit, running self-hosted | ☐ |
| H4 | Rarimo callback authenticated, and the callback path is the only public POST route | ☐ |
| H5 | Replay test: the same proof submitted twice is rejected | ☐ |
| H6 | Deletion test: `DELETE` returns 204 and the record is actually gone | ☐ |
| H7 | **Physical NFC run** — a real passport, a real NFC phone, end to end, recorded | ☐ |

H7 is the largest unverified claim in the product. Nothing about the NFC path
has been observed on hardware.

## I. Host hardening

| # | Item | State |
| --- | --- | --- |
| I1 | Firewall allows only TCP 80/443 and restricted operator SSH | ☐ |
| I2 | Inbound denied on 8790, 8791, 6300, 5432, 8000, 8080 | ☐ |
| I3 | `docker compose config` shows exactly two host port mappings (`80:80`, `443:443`) | ☐ |
| I4 | No `/private/` path routable at the edge (verify: 404) | ☐ |
| I5 | Swagger editor not reachable (verify: 404) | ☐ |
| I6 | Separate internal networks; CICO reaches the verifier only over `rarimo-cico` | ☐ |
| I7 | Compose project name is distinct from `hermes-agent-c3p7` | ☐ |
| I8 | All persistent volumes declared and named | ☐ |

## J. Operations

| # | Item | State |
| --- | --- | --- |
| J1 | Backup schedule for both databases | ☐ |
| J2 | Backup **restore** rehearsed at least once | ☐ |
| J3 | Rollback rehearsed with `rollback.ps1 -Apply` against a prior digest set | ☐ |
| J4 | Monitoring/alerting on relayer sync, DUST balance, and CICO health | ☐ |
| J5 | Log review confirms no MRZ, NFC payload, proof, or holder material is logged | ☐ |
| J6 | Prior release directory retained with its digests and rendered config | ☐ |
| J7 | On-call owner and escalation path named | ☐ |

## K. Pre-announcement verification

Do not publish a URL until every line here has actually been run.

| # | Check | State |
| --- | --- | --- |
| K1 | `preflight.ps1` passes without `-DryRun` | ☐ |
| K2 | All containers healthy; Rarimo migration completed once | ☐ |
| K3 | Sanitised external probes return the expected codes | ☐ |
| K4 | One real end-to-end run: Passport → NFC → credential → vote → confirmed receipt → explorer link | ☐ |
| K5 | The receipt from K4 reconciles against the canonical indexer independently | ☐ |
| K6 | The release SHA, the URL, and the evidence links are recorded in a release record | ☐ |
| K7 | `CURRENT-RELEASE-READINESS.md` updated to match what was actually verified | ☐ |

---

## What is not blocked

For completeness, so effort goes where it is needed. These are done and do not
appear above:

- Compose topology, Caddy routing, and the private network layout.
- The Rarimo DELETE derivative patch and its isolated test target.
- Preflight, rollback, packaging and privacy-scan tooling.
- The static demo bundle and its live HTTPS deployment.
- The application code paths for every gate above — the blockers are values,
  domains and one hardware test, not implementation.
