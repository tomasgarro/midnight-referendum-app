# Referéndum Cívico

**A passport-first, wallet-less civic consultation prototype for Midnight.**

The citizen can understand the privacy model, present eligibility evidence,
commit a ballot, and receive a receipt without publishing identity or choice.
This is a non-binding prototype for research and demonstration; it is not an
official election, a production service, or a claim of human uniqueness.

## Current evidence status

The review checkout contains the Undeployed v2 implementation and its bounded
evidence runner, but the current runtime evidence has **not been verified in this
checkout**. There is no committed sanitized v2 manifest or runtime transcript to
cite here. Code presence, a local fixture, or a passing-looking UI state is not
evidence of a deployed network transaction.

| Scope | Status in this checkout | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Historical v1 Midnight Preview | **Historical only** — see [legacy v1 evidence](docs/LEGACY-V1-PREVIEW-EVIDENCE.md) | The old DNI/contract experiment and its recorded Preview transcript | Passport-v2, `CredentialRegistryV1`, `ReferendumV2`, or this branch |
| Synthetic demo | **Runnable, synthetic** | Product flow, privacy explanations, and explicit simulated states | A real credential, Passport approval, NFC evidence, relay, or chain receipt |
| Current Undeployed v2 | **In progress; runtime evidence pending** | The repository's planned local node/indexer/proof/issuer/relay path when independently run and reviewed | Any transaction, address, receipt, manifest, release identity, or CI result until a sanitized manifest is committed |
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

## Reproduce the planned Undeployed v2 evidence run

On Linux or WSL2 with Docker and the pinned toolchain, the bounded runner creates
fresh local-only secrets in ignored files, starts the pinned local services, and
stops on missing genesis funding or any failed lifecycle step:

```bash
npm ci
npm run evidence:undeployed:v2
```

The command is a procedure, not pre-existing evidence. Only after an actual run
has completed should an operator review and deliberately commit a sanitized
manifest/transcript. Never commit generated env files, private keys, voter
secrets, witnesses, ballot choices, raw provider evidence, or local database
state. See [ENVIRONMENT-ACCEPTANCE.md](docs/ENVIRONMENT-ACCEPTANCE.md) and
[DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Privacy model and limitations

Public chain data is limited to protocol facts such as a valid action,
nullifier, and post-close aggregate. The design aims to keep Passport profile,
document data, MRZ/NFC payload, face image, voter secret, credential opening,
witness, salt, and ballot choice out of public records and service logs.

That design does not make an unverified implementation safe or live. In
particular:

- A barcode or fixture is not proof that a document is genuine. Physical NFC,
  provider verification, retention/deletion review, and any Passport-native
  holder capability remain gates.
- No Passport origin, account/network response, or app-directory approval is
  approved by this README.
- No v2 Preview deployment, transaction, indexer receipt, hosted URL, release
  SHA, CI status, test total, or video is asserted here.
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
