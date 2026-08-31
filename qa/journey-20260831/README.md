# Revised citizen journey — 31 August 2026

Captured from the `demo` build at 390×844, DPR 2, by
[`scripts/capture-journey.mjs`](../../scripts/capture-journey.mjs). Regenerate
with:

```bash
node scripts/capture-journey.mjs http://localhost:5198 qa/journey-20260831
```

Frames are viewport-sized, not full-page: the app is a fixed-height shell whose
`<main>` scrolls internally, so a full-page capture invents a tall image nobody
sees. Where a screen runs past one viewport there is a matching `-scrolled`
frame showing the bottom.

## The journey

| # | Frame | Stage | What changed |
| --- | --- | --- | --- |
| 01 | `welcome` | Bienvenida | Hero globe removed, capybara enlarged to 190px, device-readiness disclosure deleted, second paragraph rewritten around Midnight and private voting. Page title no longer duplicates the card title. |
| 02 | `privacy` | Bienvenida | Eyebrow and the summary paragraph deleted — the paragraph restated the three numbered items directly beneath it. Reading capybara added. Items rewritten outcome-first. |
| 03 | `passport-consent` | Passport | Card eyebrow removed. The requested/not-requested boundary stays here, where consent is actually being asked for. Technical justification moved behind "¿Por qué se necesita esto?". |
| 04 | `consent-return` | Passport | The duplicate "NO SE SOLICITA" row — word for word identical to frame 03 — is gone. The wallet explainer is now a disclosure. |
| 05 | `eligibility-country` | Evidencia | Country choice merged in from what used to be its own screen. One flag list instead of an input plus an echo row. Reframed from "choose this demo's country" to "vote from wherever you are". The NFC walkthrough is a disclosure. |
| 06 | `credential-ready` | Lista | Burst mark reduced and pinned to the mascot's corner instead of stacked above it. Credential facts are separate rows that stagger in, not one tinted slab. |
| 07 | `dashboard` | — | Unchanged except the results panel, which now says there is no contract behind it in demo. |
| 08 | `vote-choose` | Elegí | Previously opened on "Paso 3 de 3" because the first two stages were unreachable. Now step 1 of 3 on the same bar the Passport journey uses. |
| 09 | `vote-review` | Elegí | "Wallet: pendiente / DUST: saldo no disponible" replaced with "Firma: nada sale de este dispositivo" in demo. |
| 10 | `vote-receipt` | Comprobante | Identifier is now unique per vote; a second vote no longer deletes the first receipt. |
| 11 | `profile` | — | Wallet row hidden where no wallet is part of the path. |
| 12 | `explore` | — | Capybara replaces the stray gaucho PNG, library rows show status and closing date instead of four identical subtitles, glossary moved behind a disclosure. |

## Header, before and after

Every journey screen used to carry eight stacked blocks above its content —
exit link, labelled language select, environment chip, eyebrow, display-size
page title, two truth chips, a four-pill stepper, and a "Paso anterior" link —
roughly 340px of an 812px screen. Frames 01–06 show the replacement: a utility
row (exit · environment · language) and a track (back · progress).

The four-pill stepper is gone for a second reason beyond size. It could not
move within a stage, so the privacy screen displayed step 1 exactly like the
welcome screen before it. The bar advances on all six screens.

## Not covered here

- The Preview/undeployed journey (`npm run dev` on port 5199) received the same
  header and disclosure treatment but is not captured, because its evidence
  screen needs a live CICO enrollment to render anything real.
- English. Every string in these frames has an `en` counterpart exercised by
  the test suite.
