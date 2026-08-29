# Local Undeployed compatibility matrix

This is the local-first compatibility contract for the referendum MVP. It is
deliberately pinned so the app, generated Compact assets, and the three local
Midnight services do not drift independently. It describes target versions and
procedures. The current branch has an operator-verified local Undeployed v2 run
against this stack; its sanitized manifest/transcript are committed at
[docs/evidence/undeployed-v2/abdd0a2/](evidence/undeployed-v2/abdd0a2/)
(manifest digest `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`).

Checked 2026-08-27 against the official [Midnight local-dev standalone
configuration](https://github.com/midnightntwrk/midnight-local-dev/blob/main/standalone.yml)
and the current [Midnight SDK compatibility
matrix](https://github.com/midnightntwrk/midnight-sdk/blob/main/COMPATIBILITY.md).

## Target stack

| Layer | Version / value | Status |
| --- | --- | --- |
| Network | `undeployed` | Target for a compatible DApp Connector wallet |
| Midnight node | `midnightntwrk/midnight-node:1.0.0` | Pinned in `docker-compose.undeployed.yml` |
| Indexer | `midnightntwrk/indexer-standalone:4.3.3` | Pinned in `docker-compose.undeployed.yml` |
| Proof server | `midnightntwrk/proof-server:8.1.0` | Pinned; serves proof protocol `V2` |
| Ledger | `@midnight-ntwrk/ledger-v8@8.1.0` | Root dependency |
| Compact runtime | `0.16.0` | Root dependency |
| On-chain runtime | `3.0.0` | Direct root pin; must resolve to one shared WASM module |
| Midnight.js | `4.1.1` family | All `midnight-js-*` packages stay lockstep |
| DApp Connector API | `4.0.1` | Root/UI dependency; discovery accepts only valid semver on the v4 line, validates the connected network, sanitizes wallet metadata, and presents a choice when multiple compatible connectors are injected |
| Midnight Passport | Official PWA protocol at `midnightpassport.com`; SDK remains planning/spec | Target integration through `PassportSessionPort`; origin approval and a live session remain unverified |
| Compact toolchain | CLI/compiler `0.31.1`, language `0.23` | Generated assets must be rebuilt with this line |
| Node.js | `22.22.0` | `.nvmrc` source of truth; run in Linux/WSL2 |

## Local endpoints

| Service | Host endpoint | Used by |
| --- | --- | --- |
| Node RPC/health | `http://127.0.0.1:9944` | Compatible wallet connector, relayer |
| Indexer GraphQL | `http://127.0.0.1:8088/api/v4/graphql` | Midnight.js public data provider |
| Indexer GraphQL WebSocket | `ws://127.0.0.1:8088/api/v4/graphql/ws` | Contract-state subscriptions |
| Proof server | `http://127.0.0.1:6300` | Browser or relayer proving |
| UI | `http://localhost:4173` | Local browser prototype |

The proof server is intentionally loopback-only. It sees witnesses during
proving, so it must not be replaced by a public or third-party endpoint.

## Compatibility gates

1. The node, indexer, and proof server come from the same current local-dev
   line. The RPS sample's `node:0.22.3`, `indexer:4.0.0`, and `proof:8.0.3`
   versions are historical reference material, not a mix-in for this app.
2. `ledger-v8@8.1.0` is paired with proof server `8.1.0` and proof protocol
   `V2`. Do not use the similarly named `midnightnetwork/proof-server` image.
3. `@midnight-ntwrk/onchain-runtime-v3@3.0.0` must resolve to one physical
   package copy. A second WASM module copy can make identical `StateValue`
   values fail runtime checks after `findDeployedContract`.
4. All `@midnight-ntwrk/midnight-js-*` packages remain on the `4.1.1`
   compatibility line; do not update one package in isolation.
5. `setNetworkId('undeployed')` must happen before constructing providers.
   When a compatible wallet is connected, the DApp uses the endpoints returned by
   `getConfiguration()` rather than overriding them with environment values.
   The browser also calls `hintUsage()` with only the configuration, connection,
   shielded-address, DUST, proving, balancing, and submission methods needed by
   the transaction path. This keeps the permission intent explicit for any
   provider, including a future passkey-first wallet.
   Multiple compatible connectors are never silently switched into: the UI
   offers a user choice, warns on duplicate RDNS claims, and only renders
   connector icons through a restricted `<img>` source.
   The public showcase may also perform a passive browser platform-authenticator
   check as a seedless-readiness signal. It creates no WebAuthn credential and
   does not prove that Passport, Gero, or another wallet is installed.
6. The ignored `managed/` and `ui/public/managed/` assets are generated from
   the checked-in Compact sources. A fresh clone cannot run contract tests or a
   production build until the Linux Compact compiler has regenerated them.
7. When configured and independently verified, Undeployed may use the official
   Passport session/profile flow only when the approved origin accepts the CICO
   origin. A returned official account must be labelled with its actual network
   and never presented as deployed on the local Undeployed chain. If Passport
   is unavailable, the capability is unavailable; it does not fall back to a
   synthetic account. No such session is asserted by this matrix.

## Passport integration boundary

The [official Midnight Passport SDK](https://github.com/midnightntwrk/midnight-passport-sdk)
is currently a planning/spec repository. Its reduced beta roadmap separates
profile sign-in (`mn-passport-protocol` and `mn-passport-connect`) from the
larger ACC onboarding/custody path, which depends on an ACC artefact and
external signing, proving, and fee-sponsorship services.

For this app, that means:

- The product integrates only the official profile/session/account capabilities
  that the Passport origin actually returns and validates.
- The synthetic eligibility credential remains an explicit fixture, never a
  Passport claim.
- The local Undeployed referendum action authority and Passport identity
  session are separate providers.
- Gero PassKey/passkey is the preferred future seedless wallet direction, but
  Wave 1 stays provider-neutral and does not claim a Gero integration.
- Current public Gero material confirms PassKey authentication (Face ID, Touch
  ID, or Windows Hello), WebAuthn PRF-backed wallets, and Midnight support, but
  does not publish a verified Midnight DApp Connector RDNS/API contract for
  this app. We therefore track the capability as a target, not as a runtime
  vendor claim. See [Gero's PassKey release notes](https://gerowallet.io/download/release-notes/),
  [Gero's public wallet README](https://github.com/Gero-Labs/gerowallet), and
  Midnight's [self-custody integration overview](https://midnight.network/blog/looking-ahead-to-midnight-self-custody-wallet-integrations).
- No Passport-to-referendum contract-to-contract call is assumed on the pinned
  Compact 0.31.1 / ledger-v8 target. Newer Compact releases document
  cross-contract calls, but upgrading this compatibility line is outside Wave
  1 and requires an explicit security and migration review. Passport, evidence,
  and credential orchestration therefore remain off-chain here.
- A future official SDK adapter may replace the PWA protocol adapter behind
  `PassportSessionPort`; it must preserve the consent, origin, nonce, request,
  network, capability, and truth-label checks covered by tests.

## Commands

From the repository root, inside Linux/WSL2 for Node/Compact commands:

```bash
npm run devnet:up
npm run devnet:ps
npm run dev:undeployed
```

For a fresh local proof server, `devnet:up` starts all three containers. If a
compatible `proof-server:8.1.0` is already healthy on port `6300`, it reuses it
and starts only the node and indexer. This avoids disrupting an existing local
proof process.

```bash
curl http://127.0.0.1:9944/health
curl http://127.0.0.1:6300/version
curl http://127.0.0.1:6300/proof-versions
npm run devnet:down
```

## RPS sample comparison

The [mashharuki RPS sample](https://github.com/mashharuki/midnight-rps-sample-app)
is useful because it demonstrates a Bun monorepo, committed generated contract
assets, a CLI-driven `standalone.yml`, and a browser UI. Its infrastructure
versions predate this repository's `ledger-v8@8.1.0`/Midnight.js `4.1.1` target.
The referendum app therefore adopts its separation of app/contract/CLI ideas,
not its old image tags or package lockfile.
