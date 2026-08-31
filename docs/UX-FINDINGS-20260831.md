# UX findings — 31 August 2026

Findings from walking the demo and undeployed builds in a browser and reading
the source for every control. Companion to
[`USER-ACTION-MATRIX.md`](USER-ACTION-MATRIX.md), which records what each
action actually does.

Severity is about the reader, not the code:

- **Critical** — the interface tells the user something false, loses their
  work, or contradicts itself about where they are.
- **High** — the reader has to do work the interface should have done: read
  the same thing three times, choose between three equally-loud buttons, or
  decode an internal value.
- **Polish** — real, but nobody is misled or blocked.

`Fixed` items were changed in this pass and are covered by tests.
`Open` items are recommendations with no code change yet.

---

## Critical

### F-00 · A second simulated vote silently deleted the first receipt — Fixed

Every simulated receipt was created with the constant id
`demo-tx-cico-2026-0001`, and the receipt list de-duplicates by id. Voting on
a second consultation therefore replaced the first receipt in Profile, in the
encrypted vault, and in the on-device verifier. Reproduced in the browser:
voted on *Jubilaciones*, then on *Energía*, and ended with one receipt.

This mattered more than a normal demo bug because the receipt is the product's
headline claim — "guardá este identificador para verificar el resultado" — and
the app was quietly failing to keep it.

**Fixed** in `App.tsx`: `demo-${pollId}-${base36 timestamp}`. Still obviously
simulated, now unique. Regression test: *"keeps one receipt per simulated vote
instead of overwriting the previous one"* in `App.test.tsx`.

### F-01 · The vote flow opened on "Paso 3 de 3" — Fixed

`FlowStage` declared `verify` and `eligible` as the first two steps, and
`VoteFlow` rendered both with `StepHeader step={1}` and `step={2}`. Nothing in
the app ever set them: `startVote` sends a credentialled user straight to
`choose` and everyone else into the Passport journey. So the first screen of
every vote announced that the user was on the last of three steps.

**Fixed**: both stages and their copy are deleted (about 80 lines), `FlowStage`
is now `choose | review | processing | receipt`, and the flow reports its real
position on the shared progress bar. Everything the dead screens said about
Passport and evidence is already said in the Passport journey, at the point of
consent, so nothing true was lost.

### F-02 · Demo told the reader their wallet and DUST had failed — Fixed

The review sheet rendered `Wallet: pendiente` and `DUST: saldo no disponible`
in demo mode, because those rows are gated on `RELAYER_MODE` rather than on
whether the build has a wallet path at all. Demo has no wallet anywhere, so
this reported two permanent failures about a thing the reader was never
offered and cannot fix, immediately above the confirm button.

**Fixed**: in demo the row reads `Firma: nada sale de este dispositivo`, which
is both true and the reassurance the screen was trying to give.

### F-03 · The demo results panel implied a sealed on-chain tally — Fixed

With no contract configured, `ResultsPanel` still rendered "Votación abierta /
Los votos están sellados. Todavía no hay nada que contar." That is the correct
sentence for a real COMMIT phase and a false one for a demo with no chain
behind it — precisely the "do not claim a feature works because the UI exists"
line.

**Fixed**: demo builds render an explicit note that there is no contract or
tally behind the panel and that Preview reads totals from the contract.

---

## High

### F-04 · Three primary buttons on the evidence screen — Fixed

While waiting for the provider, the screen stacked "Comprobar verificación",
"Cancelar verificación" and "Empezar de nuevo" — all filled, all the same
weight. Worse, after an expiry or a rejection it still offered "Comprobar",
which cannot succeed.

**Fixed**: one primary action chosen by the attempt's real state. A live
attempt offers "Comprobar ahora" with a quiet "Cancelar y empezar de nuevo"
underneath; an expired, denied, or failed attempt offers only "Generar un
enlace nuevo".

### F-05 · "Última comprobación" printed twice on one screen — Fixed

The same timestamp rendered as a standalone paragraph and again inside the
polling status a few rows below it. One clock now.

### F-06 · An internal poll counter was shown to the citizen — Fixed

The polling status appended `· Lote 4`, an increment of a React state
variable used to track poll batches. Removed, along with the state.

### F-07 · Dead-end rows for capabilities the reader was never offered — Fixed

Profile reported `Wallet: no conectada` in demo with no way to connect one.
The welcome screen carried a "Preparación de este dispositivo" disclosure whose
own body admits it "no crea una passkey, no conecta una wallet y no prueba una
integración". Both are developer signals in the citizen journey.

**Fixed**: the wallet row appears only where a wallet is part of the path, and
the device-readiness disclosure and its `passkey-readiness` wiring are gone
from onboarding. (The `passkey-readiness` module itself is retained and still
unit-tested; it just no longer renders to citizens.)

### F-08 · An expired link still reported "waiting for the provider" — Fixed

The status row rendered `enrollmentStatus.status`, the last value the provider
returned, even when the link's own `expiresAt` had already passed. The reader
saw "pending" for an attempt that could never complete. The clock now wins, and
the raw enum is translated: providers speak `pending`/`expired`/`denied`,
citizens read "esperando al proveedor" / "el enlace venció".

### F-09 · Identical subtitles on every Explore row — Fixed

All four library rows carried the same subtitle, "Consulta, fuentes y
consecuencias posibles". Four rows, one sentence, repeated — it distinguished
nothing and pushed the titles apart. Now open/closed plus the closing date.

### F-10 · An indefinite bar with no expected duration — Fixed

The processing screen showed an indeterminate bar and two sentences of
pipeline description, with no indication of how long to wait. It now states
the expected duration (30–90s live, instant in demo).

### F-11 · There is no real cancel during submission — Open

`CivicActionPort.castVote()` takes no abort signal, so nothing in the UI can
actually stop an in-flight submission. Rather than offer a cancel that lies,
the screen now says plainly that a submitted transaction cannot be cancelled
from here and that a failure returns you to the confirmation screen.

**Recommended next step**: thread an `AbortSignal` through `CivicActionPort`
and the relayer HTTP client, then offer a real cancel before the relayer has
accepted the job. Until then the current copy is the honest option.

### F-12 · Runtime referenda show fixture dossier prose — Open

`PolicyDetailView` renders summary, arguments, consequences and sources from
the fixture catalogue. A runtime v2 catalogue carries only `title` and
`question`. So a real Preview referendum would be presented with argument and
source material invented for a different, fictional consultation.

**Recommended next step**: either extend the runtime catalogue schema to carry
the dossier, or render only title + question for runtime referenda and hide the
dossier sections. Do not ship a real referendum with fixture arguments.

### F-13 · No offline state — Open

A dropped connection surfaces as whatever error string the provider throws,
inside a readiness block. There is no offline detection, no retry queue, and no
distinction between "you are offline" and "the service is down".

**Recommended next step**: an `online`/`offline` listener that renders one
offline banner and suppresses the misleading provider-specific messages, plus a
retry on reconnect for the enrollment poll.

### F-14 · No unsupported-device detection — Open

The journey explains that a compatible NFC phone is required, but performs no
capability check. A desktop-only user, or someone on an iPhone without the
right OS support, discovers the problem after scanning a QR.

**Recommended next step**: detect coarse pointer / mobile UA and adjust the
handoff screen's primary action (QR for desktop, direct link for mobile);
state the NFC requirement before the link is generated, not after.

### F-15 · Nothing warns about voting twice on the same consultation — Open

The UI does not track which consultations this credential has already voted on.
On-chain the nullifier would reject a duplicate, but the citizen only finds out
after generating a proof — and in demo they simply get a second receipt for the
same poll.

**Recommended next step**: mark polls the local receipt store already has a
receipt for, and replace "Votá ahora" with "Ya votaste" plus a link to the
receipt. This is local-only and cannot be authoritative, so word it as a
reminder, not a guarantee.

---

## Polish

### F-16 · Two competing numbering systems in the journey — Fixed

Every onboarding screen drew a four-pill stepper *and* a card eyebrow with its
own number: the pills said "2 Passport" while the card said "PASO 1 ·
CONSENTIMIENTO". They counted different things (screens vs stages) and were
permanently off by one. Worse, the pills could not move within a stage, so the
privacy screen displayed step 1 exactly like the welcome screen before it —
visible in the reviewer's own screenshot.

**Fixed**: one filling bar, `JourneyProgress`, shared by the Passport journey
and the vote flow. Stage names survive as the accessible label, so a screen
reader still hears "Paso 3 de 6 — Passport". The card eyebrows are deleted.

### F-17 · The page title repeated the card title — Fixed

Every screen carried "Tu identidad no es tu voto" in display type above a card
whose own title said the same thing in different words ("Demostrá que podés
votar. Sin demostrar quién sos."). Both are good sentences; two of them on one
375px screen is one too many. The screen's own heading is the title now.

### F-18 · The journey header cost ~340px before any content — Fixed

Exit link, labelled language select, environment chip, eyebrow, display title,
truth chips, stepper, and "Paso anterior" — eight stacked blocks on an 812px
screen. Now two rows: a utility strip (exit · environment · language) and a
track (back · progress), following the pattern used by BetterHelp, Campus Coach
and Buddy in the Appllama library.

### F-19 · The language control was the widest possible way to offer two options — Fixed

A visible "Idioma" label plus a full-height bordered `<select>`, in the first
tab stop of the welcome screen. Now a globe + "ES" pill with the native select
layered over it at zero opacity — same keyboard support and platform picker,
a fraction of the width, and on the same line as the environment chip as
requested.

### F-20 · The tutorial advertised a video it did not have — Fixed

`CredentialJourneyTutorial` rendered a play-button poster, a heading promising
a visual walkthrough, and a status line explaining the media was unavailable
pending a rights review — an advertisement for a disabled feature, permanently
occupying the evidence screen. The six transcript steps were always the real
content; they are now a disclosure and the fake poster is gone.

### F-21 · The country was chosen in one control and echoed in another — Fixed

A text input backed by a `<datalist>`, and beneath it a tinted row restating
the country just typed. One control now: a searchable flag list where the
selected row is visibly selected. On platforms that cannot draw flag emoji
(Windows) the leading mark falls back to the country code, and the trailing
code is suppressed so the row does not print the same two letters twice.

### F-22 · The success screen stacked two heroes — Fixed

A 74px tick square, then a 150px mascot, then the eyebrow, then the title —
about 250px of celebration before the sentence saying what happened. The tick
is now a small burst badge on the mascot's corner (the reviewer's note was that
it was too big), the eyebrow is gone, and the credential facts are individual
rows that stagger in behind the mark rather than one tinted slab.

### F-23 · Two mascots in one product — Fixed

Explore's hero used `/assets/gaucho-waving.png`; every other surface uses the
capybara. Now the capybara, reading.

### F-24 · Three explainers on the Explore screen — Fixed

`HowItWorks`, the public/private visibility inventory, and the glossary all sat
open on one screen, and `HowItWorks` says the same three things as the
onboarding privacy screen. The glossary is reference material and is now behind
a disclosure; `HowItWorks` remains the single canonical statement.

### F-26 · 5.78 MB of mascot art for images drawn at 190px — Fixed

`CapybaraMascot` statically imports all six variants, so every build shipped
all six whether a screen used them or not: six 1024-square PNGs, about 1 MB
each, for artwork never drawn larger than 190 CSS px. On the live static demo
that is 5.78 MB of images before the 5.1 MB JavaScript bundle, on a civic app
whose audience is mostly on phones.

**Fixed**: the component now imports 640-square WebP — still more than three
times the pixels a 190px slot needs on a 3× display — and the set is 395 KB, a
93% reduction. The 1024px PNGs stay in the repository as the editable source,
so this is reversible by changing six import extensions.

**Not fixed**: the 5.1 MB JavaScript bundle and the 10.1 MB ledger WASM. Those
are Midnight SDK weight and need a code-splitting pass, not an asset pass.

### F-25 · Dead code that a reader could mistake for a feature — Open

`dni-verification.tsx` (a PDF417 barcode + liveness document reader), its
exclusive dependencies `dni.ts`, `pdf417.ts`, `liveness.ts`, plus
`network-badge.tsx` and `proof-server-status.tsx` are not mounted anywhere.
The DNI reader in particular contradicts the comment in `App.tsx` that
eligibility must "never fall back to a legacy document reader".

**Recommended next step**: delete them. Left in place this pass because it is
outside the UX scope that was asked for and it touches four test files.

### F-27 · The RariMe recordings are not the right tutorial media — Open

The reviewer asked whether the RariMe screen recordings in
`Midnight/rarimo information/uxui flow rarimo` could be clipped into the
evidence screen. They were examined frame by frame. Two reasons not to:

1. **They are RariMe's branded product UI**, published from our origin. That is
   a redistribution decision, not a design one.
2. **The content contradicts this release's boundary.** The only clip that
   actually shows the passport step (`screen-20260830-171307.mp4`, first
   seconds) sits one tab away from a Wallet screen showing an ETH balance and a
   Profile screen offering Recovery Method, Auth Method and Delete account.
   `CURRENT-RELEASE-READINESS.md` states that wallet, recovery and ETH are *not*
   current release capabilities and that no release may imply they exist. A
   video tour of them, embedded in our onboarding, implies exactly that.
   The second recording (`...171609.mp4`) is the freedomtool.org marketing site,
   not a passport walkthrough at all.

**Recommended next step**: if the evidence screen needs visual guidance, draw
it -- a short looping illustration of the phone-on-chip gesture, in the
capybara's style, showing only the step we are asking for. That is on-brand,
carries no rights question, weighs a fraction of a 9 MB clip, and cannot
advertise capabilities this release does not have. The written six-step
disclosure stays either way.

---

## What was checked and found healthy

Worth recording, because these are the parts most likely to be wrong in a
privacy product and were not:

- **No passport or NFC data is ever claimed to reach the chain.** The evidence
  boundary states requested claims, non-requested data, requestor and retention,
  and correctly describes CICO's validation as transient rather than claiming
  nothing is processed at all.
- **Fail-closed action routing.** An enabled-but-incomplete v2 runtime cannot
  fall through to the legacy executor; `resolvePassportV2ActionRoute` blocks
  with a specific reason.
- **Synthetic credentials cannot be presented as real.** The showcase journey
  reaches a deliberate dead end rather than issuing a fixture, and the test
  asserting that still passes.
- **An unreadable contract renders a warning, not a zero.** A 0% bar would
  claim we observed no votes when we observed nothing.
- **Voting choices are not editorialised.** Three identical rows, no green Yes
  and red No.
- **Receipt verification is honestly scoped.** It says the search is local.
- **Secrets are not committed.** `.env.v2.preview` and `ui/.env` hold real
  operator material and both are gitignored, with no history entries.
