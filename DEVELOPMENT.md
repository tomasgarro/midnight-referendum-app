# Development setup

This repository is the public code boundary. Keep Obsidian notes, recordings,
credentials, and other private material in the parent vault.

## The working checkout

Keep one Linux-native clone as the authoritative build checkout inside WSL2.
The Windows checkout can be used for the browser and editor, but Node,
npm, Compact, tests, and builds must use the Linux-native clone.

Staying on ext4 rather than `/mnt/c` is important: the UI test suite is much
faster there and avoids native-module and file-lock issues.

## Running it locally

Everything runs on `localhost`; there is no hosted deployment. Passport
passkeys and `getUserMedia` both accept `http://localhost`, so no HTTPS or
tunnel is needed.

Local-first Undeployed stack:

```bash
npm run devnet:up                       # node 9944, indexer 8088, proof 6300
npm run devnet:ps
npm run dev:undeployed
```

See [the local compatibility matrix](docs/COMPATIBILITY-MATRIX.md) for the
pinned image/package versions and health checks. If a compatible proof server
is already healthy on port `6300`, `devnet:up` reuses it and starts the node and
indexer only.

The existing Preview-oriented three-process path remains available for the
relayer pilot:

```bash
npm run relayer                        # sponsored fee payer, 127.0.0.1:8790
npm run dev -- --host localhost --port 4173 --strictPort
```

For a local sponsored transaction path, copy
`relayer/.env.undeployed.example` to `relayer/.env.undeployed`, fill only the
local `RELAYER_SEED`, then use these commands:

```bash
npm run relayer:address:undeployed
npm run relayer:undeployed
npm run deploy:undeployed
```

The relayer must receive local NIGHT and register DUST before deployment. Use
the official [midnight-local-dev funding
tool](https://github.com/midnightntwrk/midnight-local-dev) to fund the
printed Undeployed address; do not use a Preview faucet or a Preview wallet.

The proof server must be **published** to the host. A container started with
`--expose` alone is unreachable from both the browser and the relayer, and
every proof then fails with a connection error that reads like a wallet fault.
See [relayer/README.md](relayer/README.md) for the funding steps and the trust
boundary.

## Canonical environment: Linux/WSL2

All Node, npm, Compact, test, and build commands must run inside Linux or
WSL2. Windows is only the host OS and can provide the browser. This avoids
mixing Windows native modules with Linux dependencies and makes the Compact
compiler available to the same environment that builds the app.

Use Ubuntu on WSL2:

```bash
cd ~/src/referendum
source ~/.nvm/nvm.sh 2>/dev/null || true
nvm install
nvm use
bash scripts/setup-linux.sh
```

If `nvm` is not available, install it from the [official nvm
repository](https://github.com/nvm-sh/nvm), reopen the WSL shell, and rerun the
commands. The project `.nvmrc` is the Node version source of truth.

For better filesystem performance, a Linux-native checkout such as
`~/src/midnight-referendum` is recommended. The existing `/mnt/c` checkout is
supported, but its `node_modules` must be installed by Linux npm, never by
PowerShell npm.

The setup script fails if `node` or `npm` resolves under `/mnt/c`. This is
intentional: WSL currently imports Windows PATH entries by default, and using
those binaries makes a project appear to run while still being a Windows
deployment.

## Compact compiler

Install the Linux Compact compiler using the current [Midnight developer
prerequisites](https://docs.midnight.network/). Verify the command before
compiling:

```bash
compactc --version
# The CLI fallback is also supported:
compact compile --version
```

The system `compact` command on Windows is an NTFS compression utility and is
not the Midnight compiler. Inside WSL, `compact` is the Midnight CLI. If the
Linux compiler is not on `PATH`:

```bash
COMPACTC_BIN=/path/to/compactc npm run validate:contract
```

The wrapper also accepts `COMPACT_BIN` for the legacy Compact CLI. Generated
contract artifacts are ignored by Git and are recreated by compilation and
`npm run sync:contract`.

## Preview configuration

Target network: Midnight Preview. Keep the [official compatibility
matrix](https://docs.midnight.network/relnotes/support-matrix) as the source of
truth for versions.

| Service | URL |
| --- | --- |
| Node RPC | `https://rpc.preview.midnight.network` |
| Indexer GraphQL | `https://indexer.preview.midnight.network/api/v4/graphql` |
| Local proof server fallback | `http://localhost:6300` |

The node and indexer are remote Preview services. Proof generation is local and
must use the matrix-compatible Proof Server version; it does not receive a
wallet seed or signing key.

Copy the browser environment template inside WSL:

```bash
cp ui/.env.example ui/.env
```

Use `VITE_APP_MODE=preview` only after setting a deployed contract address and
connecting a Preview-compatible DApp Connector wallet. The default mode is the
wallet-less demo. It may save an explicitly simulated, Passport-scoped local
receipt after demo completion; it never represents that receipt as a canonical
chain confirmation. Only a canonical Preview confirmation is marked confirmed
in local profile history.

## Run and test

Start the UI from WSL:

```bash
npm run dev -- --host localhost --port 4173 --strictPort
```

Open `http://localhost:4173`, not `http://127.0.0.1:4173`. Passport passkeys
require a valid HTTPS origin or the localhost relying-party domain. The browser
may run on Windows; the development server and all project processes run in
WSL.

Run the deterministic demo checks:

```bash
npm run verify:linux
```

If Vitest stops before collecting tests when this repository is opened under
`/mnt/c`, do not mix the Windows `node_modules` tree with Linux Node. Use a
Linux-native WSL checkout (for example under `~/src`), install dependencies
there with Node 22, and rerun the same command. The product code is unchanged;
the cross-filesystem runner symptom is an open verification gate until that
native checkout completes cleanly.

Run the full Preview-oriented checks after installing `compactc`:

```bash
npm run verify:linux -- preview
```

The Preview verification path runs tests, Compact compilation, simulator
checks, contract asset synchronization, and the production build. It does not
claim that a deployed contract or real-wallet transaction has been confirmed.

## Current implementation boundary

The UI has a deterministic fixture eligibility provider. Rarimo and Blockenfy
remain research tracks until a real, tested Midnight attestation verifier is
available. No identity documents are accepted or stored.

Passport provides profile consent, display identity, and an app-scoped profile
ID. Anonymous voter secrets and nullifiers are independent. Contract approval
continues through the official DApp Connector until generic Passport contract
execution is formally supported.

The browser private-state provider encrypts state with WebCrypto and stores it
in IndexedDB. It falls back to memory only when IndexedDB or WebCrypto is not
available, such as some test or server-rendered environments.

## Before publishing

Run the Linux/WSL validation, inspect `git status`, and confirm that no private
vault material, credentials, `.env` files, or generated artifacts are tracked.
Use Apache License 2.0 for the public submission.

## Proof server version must match the ledger

Two traps here, both of which fail in ways that look like something else.

The image is `midnightntwrk/proof-server` — note `ntwrk`, not `network`. A
`midnightnetwork/...` image is not the official one.

The tag must match the ledger. This project uses `ledger-v8@8.1.0`, which
needs **proof version V2**. A 6.x server speaks only V1 and rejects every
proof in a few milliseconds with nothing more than "Failed to prove
transaction".

```bash
curl -s http://localhost:6300/version         # expect 8.1.0
curl -s http://localhost:6300/proof-versions  # expect ["V2"]
```

```bash
docker run -d --name referendum-proof-server -p 127.0.0.1:6300:6300   --restart unless-stopped midnightntwrk/proof-server:8.1.0   -- midnight-proof-server -v
```
