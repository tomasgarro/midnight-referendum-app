# User-action capability matrix

Every user-facing action in the app, what it does, and what it depends on.
Audited against the working tree on 31 August 2026 by walking the demo build
in a browser and reading the source for each control. Where the audit found a
defect it is recorded here and cross-referenced to
[`UX-FINDINGS-20260831.md`](UX-FINDINGS-20260831.md).

## How to read the status column

| Status | Meaning |
| --- | --- |
| **Working** | Does the thing, in every mode, with no external dependency. |
| **Working in demo** | Does the thing locally against fixtures. It is labelled as simulated in the UI and produces nothing on any network. |
| **Partially integrated** | Source path and contract exist and are unit-tested; no end-to-end run against a deployed service has been evidenced. |
| **Requires credentials** | Blocked purely on a value or service that has to be provisioned. The code path is complete. |
| **Planned** | No implementation. |
| **Not in the product** | Deliberately out of scope; listed because someone will ask. |

Modes: `demo` is the static Hostinger build. `undeployed` is the local Docker
chain. `preview` is Midnight Preview. `showcase` is the live-Passport,
no-issuer variant.

---

## 1. Identity and eligibility

### Connect Midnight Passport (in-journey)

- **Where** Passport journey, consent screen; also the header chip and Profile.
- **User believes** They are signing in with their Midnight Passport account.
- **Actually happens** `demo`: a hardcoded local session object named
  `Ciudadano demo` is created synchronously. No network call. `showcase`,
  `preview`, `undeployed`: `MidnightPassportSessionAdapter.connect()` opens the
  real Passport origin (`VITE_PASSPORT_ORIGIN`, default
  `https://midnightpassport.com`) and requests `['session', 'profile']`.
- **Dependency** An HTTPS origin, and a Passport account in the same browser.
  The deployed Passport keeps no allowlist for this popup handshake: it posts
  `ready` to `"*"`, accepts a request whose source is `window.opener` and whose
  request/nonce pair matches, and replies to whatever origin sent it. Approval
  is the person's, on Passport's own consent sheet, not an operator's.
  Only the *embedded* mode -- Passport framing us in its in-app browser --
  needs a listing, and that is a public PR to the community app registry, which
  requires HTTPS and nothing else. A `*.hostingersite.com` origin qualifies.
- **Status** `demo` **Working in demo** · other modes **Untested against live
  Passport** (no credential gate; the session has simply never been run).
- **Failure/recovery** Rejection surfaces as an `alert` on the consent screen
  with the provider's message and the connect button stays available. The
  header entry point shows a dismissible popover with a retry link.
- **Copy honest?** Yes. The demo button reads "Usar Passport de demo".
- **Next step** Deploy to the HTTPS origin, create a Passport account in that
  browser, and capture one real session transcript. Expect `displayName` and
  nothing else: the app requests only that field today.

  Do not widen `profileFields` yet. The deployed Passport runs on
  stagenet/ledger-9 while this app targets Preview/ledger-v8, so
  `passportContract` would be rejected as `wrong_network`, and
  `midnightAddresses` would return a stagenet address that `parseProfile` does
  not network-check -- a silent-corruption hazard, not a visible failure.

### Passport holder binding

- **Where** Preview journey, session screen.
- **User believes** Nothing — it is a status line.
- **Actually happens** If the Passport build exposes a holder-binding port, the
  result is fetched and reported as verified/unsupported. Bytes are never shown.
- **Status** **Partially integrated**.
- **Copy honest?** Yes, and it explicitly says the binding is not an
  eligibility claim.

### Create or restore a wallet

- **Status** **Not in the product.** There is no wallet creation, seed phrase,
  recovery, or restore anywhere in the app, by design (ADR: wallet/recovery is
  a post-Preview Profile/Vault concern). The only wallet surface is connecting
  an existing DApp Connector wallet.
- **Copy honest?** Yes. Profile states that a `.night` alias "requiere wallet y
  DUST; todavía no se hace acá".

### Connect a Midnight wallet (DApp Connector)

- **Where** `WalletWidget`, rendered only inside the vote review sheet, and
  only when `CHAIN_RUNTIME_ENABLED && !RELAYER_MODE`.
- **User believes** They are connecting Lace or a compatible wallet.
- **Actually happens** Discovers injected connectors, filters by network id,
  calls `enable()`. Full typed error mapping exists for every connector error
  code, with recoverable/retryable flags.
- **Dependency** A wallet extension on the right network.
- **Status** **Partially integrated** — the code path is complete and unit
  tested (16 tests), but no evidenced end-to-end approval on Preview.
- **Failure/recovery** Per-code messages; wrong network is a distinct state.
- **Copy honest?** Yes.
- **Note** In `demo` the wallet never appears, and the Profile wallet row is
  now hidden rather than reporting a permanent "no conectada" for something the
  reader was never offered (finding F-07).

### Passport eligibility start ("Crear mi credencial")

- **Where** Passport journey, eligibility screen.
- **User believes** They are getting the credential that lets them vote.
- **Actually happens** `demo`/`undeployed`-synthetic: builds
  `createDemoCredential(country)` in memory — kind
  `synthetic-demo-credential`, assurance `fixture`. No provider is contacted.
  `preview`: `beginEnrollment()` calls the CICO service, which creates a
  one-time Rarimo enrollment and returns a handoff URI plus an expiry.
- **Status** `demo` **Working in demo** · `preview` **Requires credentials**
  (`VITE_PASSPORT_V2_API_URL` plus a running CICO/Rarimo stack).
- **Copy honest?** Yes, and the demo banner now names the limitation *above*
  the button rather than after it.

### NFC / passport chip scan

- **Where** Not in this app. It happens inside RariMe on the user's phone.
- **User believes** After scanning the QR, they will read their passport chip
  with their phone.
- **Actually happens** The browser never touches NFC. The handoff opens
  RariMe; RariMe performs the read and posts a proof to the Rarimo verifier;
  CICO validates transiently and issues a minimal credential.
- **Status** **Requires credentials** for the hosted path, and **untested on
  physical hardware** — no real passport, on a real NFC phone, has been run
  through this. This is the single largest unverified claim in the product.
- **Copy honest?** Yes. The "Qué pasa en el teléfono" disclosure states that a
  manual entry is not a credential by itself.
- **Next step** One physical run on an NFC Android device with a real passport,
  recorded, before any pilot.

### RariMe QR and direct-link handoff

- **Where** Preview journey, evidence screen (`EnrollmentHandoff`).
- **User believes** Scanning the QR on their phone continues verification there.
- **Actually happens** Renders a QR of `enrollment.interaction.uri`, an "Abrir
  enlace" anchor for same-device mobile, a clipboard copy, and a `<details>`
  backup showing the raw URI. States requested claims, non-requested data, the
  requestor, and retention.
- **Status** **Partially integrated** — component and contract are done; the
  URI comes from a live CICO enrollment that has not been run hosted.
- **Failure/recovery** Clipboard failure is caught and simply does not flip the
  "copied" state. Expired links are handled below.
- **Copy honest?** Yes — the retention row correctly describes transient CICO
  validation rather than claiming nothing is ever processed.

### Polling and credential return

- **Where** Preview journey, evidence screen.
- **User believes** The page is watching for their phone to finish.
- **Actually happens** A 5s interval calls `getEnrollmentStatus()` while the
  attempt is `pending` and unexpired. On `issued` the credential summary is
  fetched and the journey advances. Concurrent polls are guarded by a ref.
- **Status** **Partially integrated**.
- **Failure/recovery** Automatic poll errors are non-destructive; manual
  "Comprobar ahora" surfaces the message. Expiry stops polling.
- **Copy honest?** Yes — and two defects were fixed here: the "Última
  comprobación" timestamp printed twice on one screen, and an internal poll
  counter (`Lote N`) was rendered to the citizen (findings F-05, F-06).

### Cancel / retry / restart / recovery

- **Where** Preview journey, evidence screen.
- **Actually happens** `restartEnrollment()` clears the stored credential, the
  session-storage attempt handle, and all enrollment state, returning to the
  session screen. A refresh mid-attempt restores only the opaque enrollment id
  and expiry from session storage and re-validates the Passport session; a
  stale handle is dropped rather than trusted.
- **Status** **Working** (state machine), **Partially integrated** (against a
  live provider).
- **Copy honest?** Yes.
- **Fixed here** Three equally-weighted primary buttons ("Comprobar",
  "Cancelar", "Empezar de nuevo") competed on one screen. There is now one
  primary action chosen by the attempt's actual state, and an expired or
  rejected attempt no longer offers a re-check that cannot succeed (F-04).
  A link whose clock had expired also reported "pending" from the last provider
  status; the clock now wins (F-08).

### Credential storage

- **Where** `browserCivicCredentialVault`, keyed by mode + issuer + epoch.
- **Actually happens** Browser-local vault. Read on mount to restore an
  already-issued credential.
- **Status** **Working**.
- **Copy honest?** Yes.

### Enrollment in the on-chain registry

- **Where** Not a user action. CICO's root publisher batches credential
  commitments into the registry contract.
- **Status** **Requires credentials** — needs `CICO_ROOT_PUBLISHER_SECRET_HEX`,
  a deployed registry, and DUST.
- **Note** Open enrollment (ADR-007): the registry stays append-only while the
  window is open, so a late credential is not locked out.

---

## 2. Discovery and reading

### Referendum discovery

- **Where** Votá tab (`VotesView`) and Explorá tab (`ExploreView`).
- **Actually happens** `demo` reads the four fixture polls from `poll-model`.
  Runtime modes build the catalogue from `VITE_CICO_REFERENDA_JSON` and fail
  closed if it is malformed. Open/closed is computed from the clock and, when
  available, the on-chain phase.
- **Status** `demo` **Working in demo** · runtime **Requires credentials**
  (a signed v2 catalogue).
- **Copy honest?** Yes — fixture participation figures are labelled "Cifra
  simulada para este prototipo".
- **Fixed here** Every Explore library row carried the identical subtitle
  "Consulta, fuentes y consecuencias posibles"; it now shows open/closed and
  the closing date (F-09).

### Read the proposal (`PolicyDetailView`)

- **Actually happens** Renders the fixture dossier: summary, arguments,
  consequences, sources with external links.
- **Status** **Working in demo**. Runtime catalogues carry title and question
  only, so the dossier body is fixture-only.
- **Copy honest?** Mostly. **Open gap:** in a runtime mode the dossier prose
  shown alongside a real referendum still comes from the fixture catalogue.
  Recorded as F-12.

### Public results / reveal

- **Where** `ResultsPanel`, on both Explorá and Votá.
- **Actually happens** Subscribes to `watchReferendumV2State` and renders the
  phase (COMMIT / REVEAL / FINALIZED) plus per-choice totals read from the
  contract. An unreadable contract renders a warning, never a zero.
- **Status** **Partially integrated** — correct against the contract API,
  never observed against a deployed contract.
- **Copy honest?** It is now. In `demo` the panel used to render "Los votos
  están sellados. Todavía no hay nada que contar." with no contract behind it
  at all, which reads as a real sealed tally. It now says so explicitly (F-03).
- **Reveal/finalize as a user action** **Not in the product** — see §4.

---

## 3. Voting

### Start a vote ("Votá ahora")

- **Actually happens** Rejects a closed poll with a message. With a credential,
  goes straight to the choice screen; without one, opens the Passport journey.
- **Status** **Working**.
- **Fixed here** The flow declared three steps and opened on "Paso 3 de 3",
  because the first two stages were unreachable dead code. Both are deleted and
  the flow now reports its real position on the same bar the Passport journey
  uses (F-01).

### Vote selection

- **Actually happens** Three identical rows — Sí / No / Abstención — with the
  accent marking the selection and nothing else. Deliberately not tinted
  green/red.
- **Status** **Working**.
- **Copy honest?** Yes.

### Vote submission and proof generation

- **Actually happens** `demo`: no proof, no network; writes a simulated
  receipt. Runtime: checks readiness, resolves the action route (fails closed
  if the v2 runtime is configured but incomplete), obtains an action
  authorization from the credential port, and calls
  `MidnightCivicActionAdapter.castVote()`. The browser owns the choice, the
  voter secret, the opening, and the witness.
- **Dependency** Preview contract, indexer, proof server, relayer or wallet,
  a verified credential.
- **Status** `demo` **Working in demo** · runtime **Requires credentials**.
- **Failure/recovery** Any throw returns to the review sheet with the message
  in a danger callout, so the user can retry or change their answer.
- **Copy honest?** Yes. `demo` labels the CTA "Crear comprobante simulado" and
  states the receipt will be simulated *before* the tap.
- **Fixed here** The demo review sheet reported "Wallet: pendiente" and "DUST:
  saldo no disponible" — two permanent failures about a thing demo never uses
  (F-02). The processing screen showed an indefinite bar with no expected
  duration (F-10).
- **Open gap** There is no true cancel during submission: `CivicActionPort`
  takes no abort signal. The screen now says so rather than implying a cancel
  exists. Recorded as F-11.

### Receipt

- **Actually happens** Saved to an IndexedDB vault encrypted per Passport
  profile, surfaced on the receipt screen, in Profile, and via a toast.
- **Status** **Working** (`demo` receipts are labelled simulated).
- **Fixed here** Every simulated receipt used the same hardcoded identifier
  `demo-tx-cico-2026-0001`, and receipts de-duplicate by id — so casting a
  second vote silently deleted the first receipt. This was reproduced in the
  browser and is now regression-tested (F-00, the only correctness bug found).

### Explorer link

- **Actually happens** Rendered only when the confirmed receipt carries an
  `explorerUrl` from the adapter. Absent in demo.
- **Status** **Partially integrated**.
- **Copy honest?** Yes.

### Verify a receipt

- **Where** Profile, `ReceiptVerifier`.
- **Actually happens** Searches only the receipts stored on this device and
  says so.
- **Status** **Working**.
- **Copy honest?** Yes — it is explicit that the search is local, so nobody
  mistakes it for an on-chain lookup.

---

## 4. Organizer and operator actions

### Admin / organizer actions in the UI

- **Status** **Not in the product.** There is no organizer surface at all: no
  create-referendum, no open/close, no reveal, no finalize, no root publishing.
  A search of `ui/src` finds no organizer control.
- **How it is actually done** Node scripts against the contract:
  `deploy-passport-v2.mjs`, `count-referendum.mjs`, `cast-vote-e2e.mjs`, plus
  the CICO root publisher running as a service.
- **Recommended next step** If a pilot needs an organizer, this is a separate
  authenticated surface with its own threat model — not a tab in the citizen
  app.

---

## 5. Edge and failure paths

| Path | Handled? | Behaviour |
| --- | --- | --- |
| Offline / network down | Partially | Provider errors surface as a readiness block with the underlying message; there is no dedicated offline state or retry queue. **Gap** — recorded as F-13. |
| Enrollment link expired | Yes | Clock-driven, independent of the provider's last status; polling stops and the only offered action is a new link. |
| Provider rejected / failed | Yes | Status is translated to plain language and the recovery path is a fresh attempt. |
| Unsupported device (no NFC) | Partially | The disclosure explains that a compatible phone is required and that manual entry is not a credential, but the app performs no capability detection and cannot tell the user in advance. **Gap** — F-14. |
| Refresh mid-enrollment | Yes | Opaque handle restored from session storage; stale handles dropped. |
| Wrong wallet network | Yes | Distinct `wrong-network` state with its own message. |
| v2 catalogue malformed | Yes | Fails closed; voting is blocked with the parse error rather than falling back to the legacy path. |
| Contract unreadable | Yes | Warning callout, never a zero tally. |
| Closed poll | Yes | Rejected at `startVote` and at `confirmVote`. |
| Second vote on the same poll | **No** | Nothing in the UI prevents or warns about voting twice on the same consultation; on-chain the nullifier would reject it, but in demo it just writes a second receipt. **Gap** — F-15. |

---

## Dependency summary

| Dependency | Blocks |
| --- | --- |
| Approved Passport production origin | Every non-demo identity action |
| `VITE_PASSPORT_V2_API_URL` + CICO service | Enrollment, credential issuance |
| Rarimo verifier (self-hosted, pinned) | NFC evidence |
| Physical NFC phone + real passport | The only untested claim in the credential path |
| Preview contract addresses + signed catalogue | Discovery, voting, results |
| Indexer + proof server | Voting, results |
| Relayer (or a user wallet) + DUST | Vote submission |
