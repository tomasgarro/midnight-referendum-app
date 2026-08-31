# First public deployment: voting-first synthetic showcase

Status: target release runbook. No public deployment is asserted by this
document or the current checkout. The target is a Hostinger static web surface
for the browser and isolated Hostinger VPS services for any later stateful
issuer, verifier, database, and relayer.

## Release boundary

The first release is a static, voting-first consultation showcase:

- Passport may provide approved session/consent and display-profile data only;
- eligibility, voting, and receipts remain synthetic unless their separate live
  gates are explicitly enabled and evidenced;
- browser camera access and direct Rarimo/verificator calls remain disabled in
  the synthetic path;
- no issuer, organizer, relayer, verifier, wallet, holder, witness, or ballot
  secret is placed in static-host configuration, `VITE_*`, the bundle, or logs;
- missing Passport, Rarimo, issuer, relay, or Preview configuration selects an
  explicit synthetic/unavailable state rather than fabricating success.

The current legacy relayer (`/balance`, `/submit`, `/keys`, and detailed health
data) is not a public API. Do not publish it through Nginx, static-host
rewrites, wildcard DNS, or permissive CORS. Do not publish raw
Rarimo/verificator proof or callback routes.

## Staged topology

| Surface | First public showcase | Later private/invited stage |
| --- | --- | --- |
| UI | Hostinger static web at `<SHOWCASE_UI_ORIGIN>` | Same static surface may enable approved Preview ports. |
| Passport | Profile/session consent only, after origin approval | Future Passport-native evidence capability, if separately approved. |
| CICO/Rarimo | Synthetic/unavailable | Private CICO façade and pinned verifier on isolated VPS infrastructure. |
| Citizen proving | Not required for synthetic flow | Participant-local loopback proof server or explicitly approved provider. |
| Voting | Simulated and labelled | Stateful, authenticated v2 action relay only after Preview evidence. |
| Hostinger VPS | Not required by the static showcase | Issuer, verifier/database, and relay as separate stateful services. |
| Midnight | No transaction | Fresh Preview registry, referendum, funded roles, and transcript. |

Issuer and relay must not share a process, OS account, wallet seed, role secret,
database, or logs. Static hosting receives public configuration only.

## Inputs required from the release owner

Before deployment, record:

1. Hostinger static-site and VPS owners, access scope, and rollback owner.
2. `<SHOWCASE_UI_ORIGIN>`, DNS provider/owner, and TLS owner.
3. Exact release commit SHA and the artifact digest produced from it.
4. Synthetic fixture policy, disclaimer copy, incident contact, and support path.
5. Exact origins required by the selected Passport/session capabilities so CSP
   can be frozen.

Later Passport, enrollment, and voting stages additionally require a
pinned Rarimo/verificator version, private CICO origin, callback authentication,
issuer/registry details, approved Midnight Preview endpoints, independent role
wallets, and an issue/vote/close/reveal/finalize transcript.

## Environment ownership

Every `VITE_*` value is public build output. For the public synthetic showcase:

- set the explicit showcase mode and only the exact approved Passport origin;
- leave contract, CICO, relayer, and remote proof-server URLs empty;
- never place a secret, seed, private callback header, service-role key, or
  database credential in a `VITE_*` variable;
- keep CICO and relayer environment files only in their future private VPS
  secret stores.

The static host must install development dependencies needed to build the
artifact, but it must not receive service secrets. Build from the reviewed SHA,
run the repository's quality and showcase checks, and upload only the resulting
`ui/dist` files through the approved Hostinger channel. Automatic deployment
from arbitrary branches is not a release process.

## CSP and browser smoke gate

The static response must enforce the reviewed allowlist: scripts, styles,
fonts, images, and connections are limited to approved origins; Passport is
allowed only as the exact configured origin; objects and unexpected third-party
origins are disabled.

Run Chromium with CSP enforcement and fail the release if the browser reaches
CICO, a verifier, a legacy relay, a raw proof route, a non-loopback proof host,
or a real contract while the showcase is synthetic.

Required smoke checks:

- HTTPS home and a deep-linked SPA route load;
- the synthetic disclosure is visible before eligibility or vote interaction;
- no private-service, relay, proof, or real-contract request appears;
- security headers and the reviewed CSP are present;
- keyboard navigation and 320px, 390px, tablet, and desktop widths have no
  critical regression.

## Live-enablement gates

Do not enable live Passport evidence, Rarimo enrollment, or Preview voting from
this static release until the matching evidence exists:

1. Passport origin/session approval and network/nonce validation.
2. Pinned self-hosted Rarimo verifier, authenticated callback, physical NFC
   transcript, minimal-claim issuance, deletion, and replay/idempotency tests.
3. Open-enrollment registry/referendum manifest with separately attested roots.
4. Stateful VPS relay with authorization, allowlists, idempotency, DUST,
   restart, and canonical-indexer reconciliation.
5. Independent privacy, storage, log, accessibility, and deployed-browser
   review tied to the exact release SHA.

Profile/Vault wallet, recovery, biometric, and ETH capabilities are optional
post-Preview work. They are not implied by Passport consent and are not
prerequisites for this voting-first release.

## Hostinger execution

### Static web

Build the reviewed SHA in a clean environment, run the smoke checks above, and
publish `ui/dist` to the Hostinger static site. Configure HTTPS, the SPA
fallback, the exact public origin, and the approved CSP/security headers. Keep
all stateful service endpoints absent from the synthetic build.

### Stateful VPS services

Use a dedicated, non-root service account and separate systemd/container
boundaries for CICO, the Rarimo verifier/database, and the relay. Terminate TLS
at Nginx, expose only the narrow approved façade, bind proof services to
loopback/private networks, and keep state and secrets outside the static site.
Use the reviewed examples under `deploy/hostinger/` as starting templates;
they do not by themselves deploy or fund any service.

## Rollback and incident stop

- Static web: restore the previous immutable artifact or detach the custom
  domain from the change record.
- VPS: stop public proxying, preserve the incident record, rotate exposed
  material, and reconcile service state before restart.
- Exposure: remove access if the browser reaches a private host, a
  non-loopback proof endpoint, a raw proof/verificator route, a legacy relay
  route, a real contract, or an unreviewed origin.

Rollback is also mandatory if showcase copy could be mistaken for a confirmed
credential, physical NFC verification, or real vote.
