# Hostinger deployment runbook

This bundle separates the static Vite frontend from a dedicated Hostinger VPS.
The frontend is uploaded to Hostinger shared/static hosting as a ZIP whose root
contains `index.html`. The VPS runs the CICO boundary, relayer, two isolated
proof services, two separate PostgreSQL stores, and the Rarimo verifier/gateway.
Only the outer Caddy `edge-proxy` binds host ports 80 and 443. No Hostinger API
call is required by this runbook.

Use three DNS names, all pointed at the VPS, and one exact frontend origin:

- `CICO_DOMAIN` — CICO `/v1/*` API.
- `RELAY_DOMAIN` — walletless relayer `/v2/*` API.
- `RARIMO_DOMAIN` — only RariMe GET proof-params and POST callback routes.
- `UI_ORIGIN` — the exact HTTPS origin uploaded to Hostinger static hosting.

Do not substitute a wildcard, path, query string, or a temporary domain after
the CICO and relayer allowlists have been rendered.

## 1. Prepare the static frontend

From the repository root, configure only public `VITE_*` values in the Vite
production environment. Never put `RELAYER_SEED`, issuer seeds, role secrets,
database passwords, action-capability secrets, or raw Rarimo material in a
`VITE_*` variable. Those values are compiled into the browser bundle and are
public by definition.

Run a dry run first:

```powershell
.\deploy\hostinger\scripts\package-static.ps1 -Mode demo -Build -DryRun
```

After review, create the synthetic fallback archive. The script sets
`VITE_APP_MODE=demo` for only the build process, so a developer's local
`ui/.env` cannot silently turn the public fallback into an undeployed build:

```powershell
.\deploy\hostinger\scripts\package-static.ps1 -Mode demo -Build
npm run verify:showcase
```

Upload the resulting `deploy/hostinger/artifacts/ui_*.zip` through the static
site file manager. Verify that `index.html` is at the archive root, enable the
Hostinger HTTPS certificate, and configure the host's SPA fallback to serve
`index.html` for application routes. Verify the exact `UI_ORIGIN` from an
external browser before enabling the APIs.

## 2. Create the VPS inputs

Copy all templates and render local files on the VPS. Keep local files mode
0600 and do not commit them:

```bash
cd /srv/midnight-civic/deploy/hostinger
install -m 0600 .env.public.example .env.public.local
install -m 0600 .env.cico.example .env.cico.local
install -m 0600 .env.relayer.example .env.relayer.local
install -m 0600 .env.relayer-db.example .env.relayer-db.local
install -m 0600 .env.rarimo.example .env.rarimo.local
install -m 0600 Caddyfile.example Caddyfile
install -d -m 0700 rarimo
install -m 0600 rarimo/Caddyfile.example rarimo/Caddyfile
install -m 0600 rarimo/config.yaml.example rarimo/config.yaml
```

Replace every `REPLACE_*` value. Generate URL-safe random passwords for both
databases, and make the Rarimo database URL exactly match
`.env.rarimo.local`. Generate independent 32-byte values for the relayer seed,
CICO issuer wallet, CICO issuer role, root publisher, and action capability.
The CICO and relayer action-capability values must match each other, but no
other secret may be reused.

Before opening DNS, configure the VPS firewall for TCP 80/443 and restricted
operator SSH only. Deny direct inbound access to 8790, 8791, 6300, 5432,
8000, and 8080; the Compose model does not publish those ports, but the host
firewall remains a required second boundary.

Resolve and record immutable image digests for Caddy, Postgres, the Midnight
proof server, the two Node release images, and the reviewed Rarimo derivative.
Floating tags are not acceptable in `.env.public.local`.

## 3. Build and review images

Build the CICO and relayer images from a clean checkout with compiled managed
ZK assets. The root `.dockerignore` excludes local env files and state from the
build context. Use the same pinned Node base digest for both images:

```bash
docker build --pull=false \
  --build-arg NODE_IMAGE='node:22-bookworm-slim@sha256:REPLACE_NODE_DIGEST' \
  --build-arg SERVICE_WORKSPACE=midnight-referendum-cico-service \
  --build-arg SERVICE_DIR=cico-service \
  -f deploy/hostinger/Dockerfile.node-service \
  -t midnight-civic-cico:REPLACE_RELEASE .

docker build --pull=false \
  --build-arg NODE_IMAGE='node:22-bookworm-slim@sha256:REPLACE_NODE_DIGEST' \
  --build-arg SERVICE_WORKSPACE=midnight-referendum-relayer \
  --build-arg SERVICE_DIR=relayer \
  -f deploy/hostinger/Dockerfile.node-service \
  -t midnight-civic-relayer:REPLACE_RELEASE .
```

Inspect each resulting image and write its immutable digest into
`.env.public.local`. Before building Rarimo, verify the nested checkout is the
reviewed upstream commit and apply the tracked derivative patch exactly once:

```bash
test "$(git -C /srv/rarimo-verificator/upstream-verificator-svc rev-parse HEAD)" = \
  f7ebbdf4d692326dd50d2c49976dd31042b2c29a
git -C /srv/rarimo-verificator/upstream-verificator-svc status --short
git -C /srv/rarimo-verificator/upstream-verificator-svc apply --check \
  /srv/midnight-referendum/deploy/hostinger/rarimo/patches/v0.3.12-cico-delete-204.patch
git -C /srv/rarimo-verificator/upstream-verificator-svc apply \
  /srv/midnight-referendum/deploy/hostinger/rarimo/patches/v0.3.12-cico-delete-204.patch
```

Stop if `status --short` reports unrelated changes or if either identity/check
command fails. The patch adds a `test` build target; run it before the release
image build:

```bash
docker build --pull=false --target test \
  --build-arg GO_IMAGE='golang:1.23.0-alpine@sha256:REPLACE_GO_DIGEST' \
  --build-arg RUNTIME_IMAGE='alpine:3.20@sha256:REPLACE_ALPINE_DIGEST' \
  /srv/rarimo-verificator/upstream-verificator-svc
```

Build the reviewed checkout and tag it
`rarimo-verificator-svc:v0.3.12-cico-delete-204`. The patch is intentionally
small: disabled auth skips the redundant admin-claim gate for DELETE cleanup;
the user-specific helper still runs, and all private routes remain off the
public gateway.

For the Rarimo derivative, pass immutable Go and runtime base images as well:

```bash
docker build --pull=false \
  --build-arg GO_IMAGE='golang:1.23.0-alpine@sha256:REPLACE_GO_DIGEST' \
  --build-arg RUNTIME_IMAGE='alpine:3.20@sha256:REPLACE_ALPINE_DIGEST' \
  -t rarimo-verificator-svc:v0.3.12-cico-delete-204 \
  /srv/rarimo-verificator/upstream-verificator-svc
```

Inspect that image and put its resulting `@sha256:` reference in
`.env.public.local`; do not use the mutable tag by itself.

## 4. Preflight without starting anything

Run the static and Compose model checks. They do not create, start, stop, or
remove containers:

```powershell
.\scripts\preflight.ps1 -DryRun
```

Before a real start, rerun without `-DryRun`; it requires rendered local files,
rejects unresolved placeholders, and runs `docker compose config --quiet` only.
Confirm that the resolved model has exactly two host port mappings (`80:80`
and `443:443`), no published database/verifier/proof port, separate internal
networks, and all persistent volumes.

## 5. Start order and health gates

Only after the preceding review, start the stack:

```powershell
docker compose --env-file .env.public.local -f docker-compose.vps.yml up -d
docker compose --env-file .env.public.local -f docker-compose.vps.yml ps -a
```

Compose runs the Rarimo migration once and will not start the verifier until it
completes successfully. PostgreSQL and CICO have in-container health checks.
The official proof-server image has no POSIX `sh`, `curl`, or `wget`, so
Compose deliberately does not install a health command inside it. Probe each
proof server from the adjacent Node service after startup instead:

```powershell
docker compose --env-file .env.public.local -f docker-compose.vps.yml exec -T cico node -e "fetch('http://cico-proof:6300/version').then(async r=>{if(!r.ok)throw new Error(String(r.status));console.log(await r.text())})"
docker compose --env-file .env.public.local -f docker-compose.vps.yml exec -T relayer node -e "fetch('http://relayer-proof:6300/version').then(async r=>{if(!r.ok)throw new Error(String(r.status));console.log(await r.text())})"
```

Both must return the pinned proof-server version. The relayer health check
remains unhealthy until its wallet has fully synced; this is intentional. Do
not expose traffic while it is unsynced or without a positive DUST readiness
check.

Verify externally with only sanitized probes:

```powershell
curl.exe -i https://REPLACE_CICO_DOMAIN/v1/enrollment/status -H "Origin: https://REPLACE_UI_DOMAIN"
curl.exe -i https://REPLACE_RELAY_DOMAIN/v2/unknown-action
curl.exe -i https://REPLACE_RARIMO_DOMAIN/integrations/verificator-svc/private/verification-status/unknown
curl.exe -i https://REPLACE_RARIMO_DOMAIN/swagger-editor/
```

The first response may be `503` until a referendum publisher is configured;
the important property is that no secret or raw evidence is returned. The
private Rarimo and Swagger requests must be 404 at the edge. A known or
synthetic public proof-params request may reach the Rarimo verifier; no proof,
MRZ, NFC payload, or holder material belongs in logs.

## 6. Rarimo/CICO boundary

Rarimo `auth.enabled: false` is acceptable only because:

1. PostgreSQL and the verifier have no host ports.
2. CICO reaches the verifier over `rarimo-cico`, a private Docker network.
3. The Rarimo gateway and outer Caddy allow only GET public proof-params and
   POST public callback paths.
4. The outer proxy does not route any `/private/` path.

The derivative DELETE handler returns 204 for a real existing user when auth is
disabled, while retaining the user-scope helper and enabled-auth admin gate.
Keep the CICO Rarimo base URL on `http://rarimo-verificator:8000`; never point
it at `RARIMO_DOMAIN`, which is intentionally public and narrow.

## 7. Safe rollback

Keep the prior immutable image references and rendered configuration in a
release directory. Preview the rollback command first:

```powershell
.\scripts\rollback.ps1
```

After reviewing the prior image digests and restoring them in the local env
files, apply the volume-preserving recreate explicitly:

```powershell
.\scripts\rollback.ps1 -Apply
```

This never uses `down -v` and does not remove CICO, relayer, Rarimo, or Caddy
volumes. Verify service health, relayer reconciliation, and canonical indexer
receipts before reopening the UI.

## 8. Teardown and retention

For planned maintenance, stop only this Compose project and preserve volumes:

```powershell
docker compose --env-file .env.public.local -f docker-compose.vps.yml stop
```

Do not run `docker compose down -v`. Database state, credential issuance
state, and Caddy certificates are persistent operational data. Apply a reviewed
retention schedule to Rarimo records and CICO state; never copy raw proof data
into support bundles.
