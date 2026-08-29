# Referéndum Cívico

**A passport-first, wallet-less civic consultation prototype for Midnight.**

The citizen can understand the privacy model, present eligibility evidence,
commit a ballot, and receive a receipt without publishing identity or choice.
This is a non-binding prototype for research and demonstration; it is not an
official election, a production service, or a claim of human uniqueness.

## Current evidence status

This branch contains a current operator-verified Undeployed v2 run. Its
sanitized manifest and transcript are committed at
[docs/evidence/undeployed-v2/abdd0a2/undeployed.manifest.json](docs/evidence/undeployed-v2/abdd0a2/undeployed.manifest.json)
and [docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json](docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json)
(human-readable form at [undeployed-v2.transcript.md](docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.md)),
manifest digest `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`.
The local run is evidence for the bounded Undeployed lifecycle only; it is not
Passport approval, Midnight Preview evidence, or physical NFC evidence.

The manifest attests source commit `abdd0a2203fbef909f70f6ddc06681ac1327f457`
(tree `9d1319aa3540a0943f760631ec3ac9c9e5b40b36`), which is the runtime,
contract, relay, and operator code as it was executed. Later
documentation-only commits on this branch do not alter that tree, so the
attested SHA is deliberately the run's SHA rather than the branch head.

| Scope | Status in this checkout | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Historical v1 Midnight Preview | **Historical only** — see [legacy v1 evidence](docs/LEGACY-V1-PREVIEW-EVIDENCE.md) | The old DNI/contract experiment and its recorded Preview transcript | Passport-v2, `CredentialRegistryV1`, `ReferendumV2`, or this branch |
| Synthetic demo | **Runnable, synthetic** | Product flow, privacy explanations, and explicit simulated states | A real credential, Passport approval, NFC evidence, relay, or chain receipt |
| Current Undeployed v2 | **Operator-verified locally; evidence committed** | Real local v2 run against real midnight-node/indexer/proof-server containers and a real PostgreSQL relay store: deploy, issue/freeze, cast/replay rejection, close/reveal/finalize, canonical indexer receipt, and relay DUST/concurrency/restart checks | A real provider credential, Passport approval, Preview deployment/receipt, physical NFC, release identity, CI result, or hosted release |
| Passport / Preview / physical NFC gates | **Not verified** | — | Passport origin approval, Preview deployment, provider verification, genuine document/NFC evidence, hosted URL, or walkthrough video |

## How it works

1. Midnight Passport is a consent/session and optional display-profile surface;
   profile fields are never cryptographic voting authority.
2. A provider-neutral credential adapter is intended to derive minimal,
   issuer-bound eligibility claims. Rarimo is a replaceable evidence adapter,
   not a claim that physical NFC verification is available here.
3. `CredentialRegistryV1` issues credentials into an open epoch. An operator
   freezes the canonical root; each `ReferendumV2` binds to that exact root and
   its policy.
4. The browser owns the voter secret, credential opening, ballot choice, and
   proving witness. The ballot is a referendum-bound commitment and the vote
   nullifier prevents a second vote without identifying the voter.
5. A capability-gated relayer may submit an already-proved action. A relay
   response is only pending; the Midnight indexer is the source of truth for a
   confirmed receipt.

```text
Passport consent/profile ──┐
                            ├─> browser-owned witness ─> v2 relayer ─> indexer receipt
Evidence adapter ─> issuer ─┘       (choice stays private)
```

The trust boundaries are documented in [ARCHITECTURE.md](docs/ARCHITECTURE.md)
and the decisions in [docs/adr](docs/adr/ADR-001-passport-first-boundaries.md).

## Reproduce the synthetic demo

Use Node 22 and npm 10. The demo does not need a wallet, funds, Passport
credentials, or a network:

```bash
npm ci
npm run dev -- --host localhost --port 4173 --strictPort
```

Open `http://localhost:4173`. Every simulated credential and vote must remain
labelled in the UI. A simulated receipt is not a canonical chain receipt.

## Reproduce the Undeployed v2 run

On Linux or WSL2 with Docker and the pinned toolchain, the bounded runner creates
fresh local-only secrets in ignored files, starts the pinned local services, and
stops on missing genesis funding or any failed lifecycle step:

```bash
npm ci
npm run evidence:undeployed:v2
```

The command reproduces the local run behind the committed evidence at
[docs/evidence/undeployed-v2/abdd0a2/](docs/evidence/undeployed-v2/abdd0a2/);
it is not a substitute for a Preview release record. Never commit generated env
files, private keys, voter secrets, witnesses, ballot choices, raw provider
evidence, or local database state. See
[ENVIRONMENT-ACCEPTANCE.md](docs/ENVIRONMENT-ACCEPTANCE.md) and
[DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Privacy model and limitations

Public chain data is limited to protocol facts such as a valid action,
nullifier, and post-close aggregate. The design aims to keep Passport profile,
document data, MRZ/NFC payload, face image, voter secret, credential opening,
witness, salt, and ballot choice out of public records and service logs.

That design does not make a local Undeployed run a live Preview service or make
the prototype suitable for a pilot. In particular:

- A barcode or fixture is not proof that a document is genuine. Physical NFC,
  provider verification, retention/deletion review, and any Passport-native
  holder capability remain gates.
- No Passport origin, account/network response, or app-directory approval is
  approved by this README.
- No v2 Preview deployment, transaction, indexer receipt, hosted URL, release
  SHA, CI status, test total, or video is asserted here. The committed evidence
  covers only the local Undeployed run described above.
- The three `registry.*` indexer observations in the committed evidence
  (deploy, issue, freeze) were all captured after the freeze had completed, so
  each records the terminal registry state rather than the state as of that
  individual stage; each observation carries its own timestamp so this is
  transparent in the artifact. The referendum observations progress correctly
  across stages.
- The contract, relayer, provider boundary, browser private-state design, and
  operational recovery still require independent review before any pilot.
- Geography is a separate privacy decision. A public country counter is not a
  private ballot attribute; see [ADR-004](docs/adr/ADR-004-geography-privacy-fork.md).

For the full acceptance gates, read
[ENVIRONMENT-ACCEPTANCE.md](docs/ENVIRONMENT-ACCEPTANCE.md),
[ROADMAP.md](docs/ROADMAP.md), and the [deployment plan](docs/DEPLOYMENT.md).

## Repository map

| Area | Role |
| --- | --- |
| `contracts/` | Compact registry and referendum policy |
| `api/` | Provider-neutral ports, witnesses, manifests, and canonical reads |
| `cico-service/` | Evidence gateway and issuer boundary |
| `relayer/` | Capability-gated, idempotent action submission |
| `ui/` | Passport consent, eligibility, voting, and receipt journeys |
| `scripts/evidence-undeployed-v2.mjs` | Local-only evidence procedure |
| `docs/` | Architecture, acceptance gates, release evidence, and legacy history |

## License

Apache 2.0. See [LICENSE](LICENSE).
