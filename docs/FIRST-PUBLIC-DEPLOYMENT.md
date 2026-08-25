# First public deployment: Passport-first Midnight Preview MVP

Status: release runbook. The first public artifact is a synthetic UI preview.
Real Passport/Rarimo enrollment and real Midnight voting are separate releases.

## Release boundary

The first release exposes only the static Vite UI on Vercel:

- synthetic Passport credential and choice-free receipt, visibly labelled as demo data;
- no real credential, contract action, or chain-confirmed receipt;
- no browser request to Rarimo, a verificator, CICO, a relayer, a database, or a raw proof route;
- no issuer, organizer, relayer, verifier, wallet, holder, witness, or ballot secret in Vercel,
  GitHub Actions, `VITE_*`, the bundle, or logs.

The current legacy relayer (`/balance`, `/submit`, `/keys`, and detailed health data) is not a
public API. Do not publish it through Nginx, Vercel rewrites, wildcard DNS, or permissive CORS.
Do not publish raw Rarimo/verificator proof or callback routes.

## Staged topology

| Surface | First public preview | Later private/invited stage |
| --- | --- | --- |
| UI | Vercel static deployment at `<PREVIEW_UI_ORIGIN>` | Same UI may enable approved Preview ports. |
| Passport | Optional Midnight Passport profile/consent UI | Approved provider origin and real capability gate. |
| CICO/Rarimo | Not configured | Private CICO facade and verificator on dedicated infrastructure. |
| Citizen proving | Not required | Participant-local loopback proof server only. |
| Relayer | Not configured | Future authenticated, atomic citizen-action relay only. |
| Hostinger | Optional static redirect/marketing shell | VPS for isolated private services; never shared hosting. |
| Midnight | No transaction | Fresh Preview registry, referendum, funded roles, and transcript. |

Recommended later host split:

- `pilot.<domain>`: Vercel UI;
- `passport-preview.<domain>`: narrow CICO issuance facade;
- `relay-preview.<domain>`: only after the atomic relay exists.

Issuer and relay must not share a process, OS account, wallet seed, role secret, database, or logs.

## Inputs required from the release owner

Before deployment, record:

1. Vercel team/project access and deployment owner.
2. `<PREVIEW_UI_ORIGIN>`, DNS provider/owner, and TLS owner.
3. Whether Hostinger is only a static redirect or a later VPS service host.
4. Exact release commit SHA and GitHub `main` protection/merge owner.
5. Synthetic fixture policy, disclaimer copy, incident contact, and rollback owner.
6. The exact origins required by the selected UI capabilities so CSP can be frozen.

Later Passport and voting stages additionally require the pinned Rarimo/verificator version,
private CICO origin, callback authentication, issuer/registry/epoch details, approved Midnight
Preview endpoints, funded independent role wallets, and an issue/vote/close/reveal/finalize
transcript.

## Environment ownership

Every `VITE_*` value is public build output. For the synthetic preview:

- set demo/synthetic mode;
- leave contract address, CICO URL, relayer URL, and remote proof-server URL empty;
- never place a secret, seed, private callback header, service-role key, or database credential in
  a `VITE_*` variable;
- keep CICO and relayer environment files only in their future private operator secret stores.

Vercel CLI automation, if used, needs scoped `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID` GitHub secrets. Pin the CLI version. Build one Preview artifact, test it, then
promote that same artifact rather than rebuilding for production.

## CSP gate

`vercel.json` has baseline security headers but no Content Security Policy. CSP is a pre-deploy
gate because actual Passport, font, indexer, WebSocket, and framing origins are not frozen yet.
Do not invent or wildcard those hosts.

Before public release:

1. Freeze exact HTTPS/WSS origins from the approved demo build.
2. Add a reviewed CSP covering at least `default-src`, `script-src`, `style-src`, `font-src`,
   `img-src`, `connect-src`, `frame-src`, `frame-ancestors`, `base-uri`, `form-action`,
   `object-src`, `worker-src`, and `manifest-src`.
3. Run Chromium with CSP enforcement and capture the browser network log.
4. Fail release if the browser reaches CICO, verificator, legacy relay, raw proof routes, a
   non-loopback proof host, a real contract, or an unexpected third-party origin.

## Release gates

Run at the exact release SHA from WSL:

```bash
nvm use
npm ci
npm run quality
npm run build
npm test
CI=true npm run test:e2e
npm audit --omit=dev
git diff --check
test -s ui/dist/index.html
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"
```

Required browser smoke:

- HTTPS home and a deep-linked SPA route load;
- the synthetic disclosure is visible before credential or vote interaction;
- no private-service, relay, proof, or real-contract request appears;
- the response includes the reviewed CSP and existing security headers;
- keyboard navigation and 320px, 390px, tablet, and desktop widths have no critical regression.

## Vercel execution

1. Link/create the Vercel project with repository root `/`, Node 22, `npm ci`, `npm run build`,
   and output `ui/dist`.
2. Configure only approved synthetic Preview environment values.
3. Use the PR branch to create a unique Vercel Preview URL.
4. Run the network/CSP smoke and Playwright against that URL.
5. Add the custom domain using only the DNS record Vercel provides; verify HTTPS and redirect.
6. Publish the URL with the SHA, test evidence, incident contact, and an explicit “no real vote”
   statement.
7. Promote the tested artifact only after review. Do not run the referendum deploy, relayer, or
   CICO commands for this release.

## Hostinger execution for a later private enrollment stage

Use a VPS, not shared hosting. Place CICO behind Nginx/systemd using the checked-in examples.
Keep the verificator and database private, use exact Origin/CORS and callback authentication,
restrict filesystem permissions, and isolate issuer material from any relay. Complete physical
NFC enrollment and restart/reconciliation testing before inviting users.

## Rollback and incident stop

- Vercel: promote the last known-good static deployment or detach the custom domain.
- DNS: restore the prior provider record from the change record.
- Hostinger static shell: restore the previous static bundle/snapshot; never point it temporarily
  at a private service.
- Exposure: remove public access, revoke/rotate exposed material, preserve logs, and notify the
  issuer/relay owners.

Rollback is mandatory if the browser reaches a private host, non-loopback proof endpoint, raw
proof/verificator route, legacy relayer route, real contract, or unreviewed origin, or if demo copy
could be mistaken for a confirmed credential or vote.
