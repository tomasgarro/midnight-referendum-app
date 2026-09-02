# Rarimo NFC verifier — Hostinger staging evidence

Date: 2026-09-02

VPS: Hostinger virtual machine `1684196`

Project: `midnight-rarimo-nfc`

Deployment action: `112583024` (`success`)

## Artifact identity

- Application branch: `feat/rarimo-nfc-production`
- Deployment manifest commit: `db6ab08`
- Rarimo upstream commit: `f7ebbdf4d692326dd50d2c49976dd31042b2c29a`
- Reviewed cleanup patch SHA-256: `91ab66698f70ae1456d3f54cbb2cb5e84fefa44c2b0dd55194eff3fe2ae85053`
- Published verifier image: `ghcr.io/tomasgarro/midnight-rarimo-verificator:v0.3.12-cico-delete-204-22c3c68`
- Registry digest: `sha256:c617e38b457d488dce937741ee3ce395b1d4d9749fcc254cadbb8eefe408aa40`
- Anonymous registry manifest request: HTTP `200`, returning the same digest

## Deployment observations

- Hostinger pulled the digest-pinned verifier image successfully.
- `secret-init` and `config-init` completed with exit code 0.
- PostgreSQL started and reported healthy.
- The migration job completed with exit code 0 and reported 9 migrations applied.
- The verifier remained running and logged `Service started`.
- The allow-list gateway remained running.
- The verifier is published only on `127.0.0.1:18080`.
- The gateway is published only on `127.0.0.1:18081`.
- PostgreSQL has no published host port.
- No project service publishes host ports 80 or 443.
- The pre-existing `hermes-agent-c3p7` project and its container remained running and unchanged.

Caddy emits expected non-fatal warnings because its container filesystem is
read-only and this loopback-only gateway does not manage TLS or persist an
autosaved configuration. It continued serving its initial configuration.

## Verification completed before deployment

- Targeted Rarimo handler tests passed during the reproducible image build.
- Local gateway smoke covered session creation, initial status, proof-parameter
  access, private-route denial, callback method denial, cleanup returning 204,
  and post-cleanup status returning 404.
- Local persistence testing retained a session across PostgreSQL/verifier
  restart and then removed it through the cleanup path.
- The full Linux verification gate passed for the contract, passport-v2,
  fixture capability, API, CICO, relayer, and UI suites.

## Explicitly not claimed

- No public DNS or TLS route has been configured.
- No host port 80 or 443 has been opened by this project.
- No physical passport or Android NFC run has been performed against this
  deployment.
- No real proof, MRZ, passport identifier, user identifier, or database secret
  is retained in this evidence.

The next gate is an explicitly authorized HTTPS/DNS cutover followed by one
physical Android/RariMe passport NFC run. After the result is reduced to the
minimum eligibility evidence, the provider record must be deleted and the
post-delete 404 retained as sanitized production evidence.
