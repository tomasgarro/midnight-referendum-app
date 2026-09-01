# Referéndum Cívico

**A Passport-first civic consultation prototype for Midnight.**

Referéndum Cívico makes the privacy boundary understandable: a person can
explore a consultation, present eligibility evidence, cast a ballot, and
receive a receipt without publishing their profile or ballot choice. It is a
non-binding prototype for research and demonstration. It is not an official
election, a production service, or a claim of human uniqueness.

## Current status

The table below describes this checkout as of 31 August 2026. It is a source
and product status summary, not a release approval or a Preview deployment
attestation. For the jury-facing narrative and evidence checklist, start with
[`docs/SUBMISSION.md`](docs/SUBMISSION.md).

| Surface | Status | Honest interpretation |
| --- | --- | --- |
| Synthetic demo | **Runnable** | The complete journey is simulated and must remain labelled as simulated. |
| Enrollment model | **Open in the current source** | A registry can admit credentials while a consultation is in its enrollment window; the referendum can accept separately attested later roots. |
| Passport | **Profile/session boundary only** | A real profile/session handshake is evidenced, while consent and display fields remain separate from eligibility and voting authority. No Passport credential, wallet, recovery, or Preview address is claimed. |
| Rarimo | **Temporary evidence adapter** | Rarimo is intended to provide temporary NFC-based eligibility evidence behind the CICO issuer boundary. Physical-device verification and a hosted verifier are not evidenced here. |
| Voting | **Primary product action** | The product prioritizes understanding and participating in a consultation; wallet, recovery, biometric, and ETH features are optional post-Preview Profile/Vault work. |
| Historical Undeployed v2 run | **Preserved, historical** | The committed artifact at [`docs/evidence/undeployed-v2/abdd0a2/`](docs/evidence/undeployed-v2/abdd0a2/) is a SHA-specific local run of the older frozen-enrollment model. It is not evidence for this branch head or a Preview deployment. |
| Preview / public release | **Not released** | A static demo URL exists, but its bundle predates the current journey rebuild. No Preview transaction, current public release SHA, physical NFC transcript, or Passport credential is asserted. |

The deployment target is a Hostinger static web surface plus isolated,
stateful Hostinger VPS services for any future issuer and relayer. When those
services or credentials are unavailable, the product falls back to an honest
synthetic journey; it must not silently turn fixtures into live evidence.

## What the product means by Passport and Rarimo

Midnight Passport is the consent, session, and optional display-profile
surface. A name, account, alias, address, or session identifier is never a
credential leaf, voter secret, ballot commitment, or nullifier. The Profile
and Vault concepts may later add real wallet, recovery, biometric, or ETH
capabilities, but those are optional post-Preview features and are not part of
the current release claim.

Rarimo is a replaceable evidence adapter, not the product identity layer. A
temporary Rarimo NFC verification can produce minimal issuer-bound eligibility
claims (for example, country, adult class, and document-NFC assurance) through
the restricted CICO service. Raw document, MRZ, NFC, face, and provider-proof
material must not reach the browser, public assets, or ballot path. A Rarimo
fixture or source adapter is not physical NFC evidence.

The current enrollment model is intentionally open. The registry remains
append-only while enrollment is open; a referendum records its initial root
and can accept later roots only through the narrow root-publisher path and a
separate registry attestation. Enrollment closes on its own published deadline.
The older frozen-before-deploy model is retained only in historical ADR and
evidence records.

Voting remains the primary action. The browser owns the voter secret, private
credential opening, ballot choice, and proving witness. The relay, when a
stateful service is eventually enabled, accepts only an already-authorized
action. A relay acknowledgement is pending until the Midnight indexer
confirms the transaction.

```text
Passport consent/profile ──┐
                            ├─> browser-private eligibility + ballot
Temporary Rarimo evidence ─> issuer ─> open enrollment ─> vote ─> indexer receipt
```

See [the architecture map](docs/ARCHITECTURE.md), [current release
readiness](docs/CURRENT-RELEASE-READINESS.md), and [the documentation
index](docs/README.md) for the detailed boundaries and gates.

## Historical evidence (preserved)

The local Undeployed v2 transcript was generated from source commit
`abdd0a2203fbef909f70f6ddc06681ac1327f457` (tree
`9d1319aa3540a0943f760631ec3ac9c9e5b40b36`) and has manifest digest
`d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`.
It records a complete local node/indexer/proof-server/relay lifecycle, but it
is historical evidence for that exact SHA and the old frozen registry run.
Later source changed the default to open enrollment, so this artifact must not
be described as a run of the current branch.

Read the [historical transcript](docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.md),
[machine-readable transcript](docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json),
and [manifest](docs/evidence/undeployed-v2/abdd0a2/undeployed.manifest.json) for
the complete preserved record. The artifact contains public addresses,
transaction identifiers, state, and digests; it does not establish Passport
approval, physical NFC, a hosted service, or Midnight Preview evidence.

To reproduce the historical record, use the recorded source commit in an
isolated checkout and follow its transcript. Running the current checkout's
local runner can produce a new local result, but it cannot change or upgrade
the historical artifact above.

## Run the synthetic demo

Use Node 22 and npm 10. The demo needs no wallet, funds, Passport credential,
Rarimo device, or network. Force demo mode so a developer's local
`ui/.env` cannot silently select Undeployed or Preview:

```bash
npm ci
# macOS / Linux
VITE_APP_MODE=demo npm run dev -- --host localhost --port 4173 --strictPort
```

```powershell
# Windows PowerShell
$env:VITE_APP_MODE='demo'
npm run dev -- --host localhost --port 4173 --strictPort
```

Open `http://localhost:4173`. Simulated eligibility, votes, and receipts must
remain visibly labelled. A simulated receipt is not a canonical chain receipt.

## Privacy and limitations

The design aims to keep Passport profile data, document data, MRZ/NFC payload,
face image, voter secret, credential opening, witness, vote salt, and ballot
choice out of public records and service logs. This is a design objective and
source boundary, not an independent security audit.

In particular:

- a fixture, barcode, or synthetic state is not proof that a document is genuine;
- Passport profile/session consent does not authorize eligibility or arbitrary
  Compact actions;
- Rarimo evidence remains temporary and provider-bound until a reviewed
  Passport-native capability exists;
- public geography is a separate privacy decision; see
  [ADR-004](docs/adr/ADR-004-geography-privacy-fork.md);
- no mainnet, legal-election, anti-coercion, biometric-holder, human-uniqueness,
  recovery, wallet, or ETH claim is made by this prototype.

For release gates and the synthetic fallback policy, read
[CURRENT-RELEASE-READINESS.md](docs/CURRENT-RELEASE-READINESS.md),
[ENVIRONMENT-ACCEPTANCE.md](docs/ENVIRONMENT-ACCEPTANCE.md), and
[DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Repository map

| Area | Role |
| --- | --- |
| `contracts/` | Compact credential registry and referendum policy |
| `api/` | Provider-neutral ports, witnesses, manifests, and canonical reads |
| `cico-service/` | Evidence gateway and issuer boundary |
| `relayer/` | Capability-gated, idempotent action submission |
| `ui/` | Passport consent, browser-encrypted credential state, voting, Profile, and receipt journeys |
| `scripts/` | Local verification, deployment, and evidence procedures |
| `docs/` | Active architecture/release docs and clearly labelled historical records |
| `artifacts/overnight-ui/` | Archived overnight screenshots; not current release evidence |

## License

Apache 2.0. See [LICENSE](LICENSE).
