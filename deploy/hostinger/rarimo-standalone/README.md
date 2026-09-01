# Standalone Rarimo NFC staging project

This project stages only the provider side of the passport/NFC flow. It does
not deploy Preview contracts, CICO issuance, the relayer, or the public UI.

The Hostinger project name is `midnight-rarimo-nfc`. It is intentionally safe
to start before DNS exists:

- the private verifier binds only to VPS loopback port `18080`;
- the allow-list gateway binds only to VPS loopback port `18081`;
- no service binds public ports 80 or 443;
- PostgreSQL is internal and has no host port;
- the database password is generated on the VPS and retained in a dedicated
  named volume rather than passed through the Hostinger API;
- the existing `hermes-agent-c3p7` project is not referenced.

The compose file is self-contained: its inline Dockerfile copies from a named
official Rarimo Git context with both `ref` and `checksum` fixed to commit
`f7ebbdf4d692326dd50d2c49976dd31042b2c29a`. The reviewed handler-only cleanup
patch is fetched from immutable application commit `268c217886135cd618983d445fd8c996d17eb3de`
with SHA-256 verification, checked with `git apply --check`, and covered by
targeted Go tests during every build. No unpublished branch or private registry
is required by the VPS.

The remaining non-secret project inputs are:

- `RARIMO_CALLBACK_ORIGIN=https://rarimo.cardanoschool.org`
- `RARIMO_ALLOWED_IDENTITY_TIMESTAMP=<fixed launch timestamp>`
- `RARIMO_EVENT_ID=<stable non-zero BN254 field value>`

Run `node validate-project.mjs` before rendering or deploying the project. DNS,
TLS, public ports, and the physical NFC run are a separate, explicitly approved
morning cutover.

The tracked local override uses ports `28080` and `28081` so it can be tested
without stopping the earlier `rarimo-verificator` scratch stack:

```powershell
docker compose -p midnight-rarimo-nfc-local `
  -f docker-compose.hostinger.yml -f docker-compose.local.yml up -d --build
node smoke-local.mjs
```

To prove database persistence, run `node persistence-local.mjs prepare`, restart
the PostgreSQL and verifier containers, then run
`node persistence-local.mjs verify-cleanup`.
