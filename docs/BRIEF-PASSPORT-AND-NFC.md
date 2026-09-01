# Brief — full Midnight Passport, and reading a real passport

Written 31 August 2026, for the session that builds these two things. Read
[`SESSION-HANDOFF-2026-08-31.md`](SESSION-HANDOFF-2026-08-31.md) first for
current repository state; this is the forward-looking piece.

Two goals, in this order, because the second depends on decisions made in the
first:

1. **Full Midnight Passport functionality** — beyond the display-name session
   that now works.
2. **Reading a real physical passport** — the photo page and the NFC chip.

---

## Part 0 — What is already true, and must not be re-derived

A real Passport session **works today**, proven by a live handshake, not by
reading code. Evidence:
[`evidence/passport-live/2026-08-31-first-real-session.md`](evidence/passport-live/2026-08-31-first-real-session.md).

Four facts that cost real effort to establish. Do not spend the budget again:

| Question | Answer | Where it was proven |
| --- | --- | --- |
| Is `org.midnight.passport.profile/v1` real? | Yes — defined in `midnightntwrk/passport@demo/pwa-demo`, and the deployed bundle ships the same parsers | Source + production bundle |
| Does our origin need approving? | **No.** `http://localhost:5200` completed a full handshake | The live session |
| Do we need to buy a domain? | **No**, not for the popup flow | Same |
| Can Passport give us a Preview address? | **No.** Passport runs stagenet/ledger-9; this app targets Preview/ledger-v8 | Passport's own bundle and copy |

**Only `showcase` and `preview` builds reach the real Passport.** In `demo`,
`connectPassport()` short-circuits to a hardcoded local session and makes no
network call. Reproduce with:

```bash
npm run dev --workspace midnight-referendum-ui -- --mode showcase --host localhost --port 5200
```

The header must read **PASSPORT EN VIVO** and the connect screen must offer no
demo shortcut.

---

## Part 1 — Full Midnight Passport

### The blocker to resolve first

Everything else in this part is gated on one question, and it is not solvable
from our side:

> Is there a Preview-capable Midnight Passport, or a timeline for one?

Passport's own copy says it cannot open an account on Preview. Until that
changes:

- **Keep `profileFields` at `displayName`.** Requesting `passportContract`
  throws `wrong_network`. Requesting `midnightAddresses` *succeeds* and returns
  a **stagenet** address that `parseProfile` does not network-check — silent
  corruption, not a visible failure. This is the single most dangerous thing
  to change casually in this codebase.
- Do not build UI that displays "your Midnight Preview address" sourced from
  Passport. It cannot exist yet.

Ask the Midnight contact this one question before designing around it. If the
answer is "not soon", Part 1 reduces to the session-quality work below, and the
address/identity surface waits.

### What to build while that is open

1. **Session durability.** The session currently lives in memory. A successful
   live profile/session handshake is recorded, but reconnect, expiry, and
   rejection paths in `passport-session-port.ts` have only been exercised
   against fixtures. Test each against the real thing and record what actually
   happens.
2. **The redirect flow.** The deployed Passport also implements
   `org.midnight.passport.callback/v1` — a signed redirect (`passportCallback`,
   `passportFields`, `passportState` → `passportResponse`, signed
   `bip340-schnorr-secp256k1-sha256`). It is **not** on the documented branch
   and has no public spec found so far. It would be materially better on mobile
   than a popup, which is fragile in in-app browsers. Investigate before
   committing to it; treat as unverified.
3. **Embedded mode**, if a Passport-native listing is wanted. Requires a public
   PR to the community registry (HTTPS-only rule) and `networks` including
   `"stagenet"`, or Passport's grid filters the entry out. Also requires fixing
   `deploy/hostinger/Caddyfile.example`, whose `X-Frame-Options "DENY"` would
   kill framing outright.
4. **Holder binding** is not available. There is no such message type in the
   protocol, and `passport-session-port.ts` correctly returns
   `{status: 'unsupported'}`. Do not manufacture one.

### What Passport is not

Passport does **not** implement the DApp Connector — `window.midnight`,
`getProvingProvider`, `balanceUnsealedTransaction` appear zero times in its
bundle. Wallet-delegated proving works through **Lace**, and is already the
live path in the UI. Keep the two separate in code and in copy: Passport is
identity, the wallet is transactions.

---

## Part 2 — Photo page and NFC

This is the larger build. Sequence it so the risky parts fail early.

### Decide these before writing code

1. **Where does verification run?** The current design routes through a
   Rarimo/CICO adapter. Self-hosting it is the stated intent
   (`docs/DEPLOYMENT.md`), and no VPS stack exists yet. Decide before building
   UI, because the UI's honest copy depends on the answer.
2. **What leaves the device, exactly?** Write this down as a table — field by
   field — before the first screen. Every privacy sentence in the product must
   be checkable against it.
3. **Which country first.** France is the polished path today. Argentina is
   supported but has never been tested with an Argentine document.
4. **The on-chain policy matches one exact passport country.** There is no
   "any EU member" rule. An EU-wide eligibility claim needs a deliberate
   contract change, not a UI change.

### Build order

1. **NFC feasibility spike, before any UI.** Web NFC (`NDEFReader`) is Chrome
   Android only, and **cannot read ePassport chips** — those need ISO 14443 APDU
   exchange with BAC/PACE, which the web platform does not expose. Establish
   early whether the target is (a) a native or hybrid app, (b) a hand-off to
   RariMe or a similar existing app, or (c) MRZ-from-photo only with no chip
   read. This determines the entire shape of the feature. **Do not build a scan
   UI before this is answered** — the current app already carries a scan
   tutorial video for a capability it does not have.
2. **MRZ capture from the photo page**, if that is the chosen path. Camera
   access, an alignment guide, OCR of the two/three MRZ lines, checksum
   validation. The checksums are the honest verification here: they catch a
   misread, they do **not** prove authenticity. Never present an MRZ read as
   proof the document is genuine.
3. **The journey around it.** AppLlama research already specifies this from
   real apps — see
   [`../research/premium-ux/appllama-round-2.md`](../research/premium-ux/appllama-round-2.md)
   §3. Three beats: a framed tips screen naming three real failure modes (glare
   on the laminate, wrong page, moving during the read), a dark full-screen
   capture with an instruction line and **no fake progress**, then review with
   retry as a full-width peer above confirm. Escape a capture with a close X,
   never a back chevron.
4. **Credential issuance**, only once a real read produces real fields.

### Non-negotiables

- **Never store the passport image, the NFC payload, or raw identity data.**
  Keep only the minimum derived eligibility facts.
- **No fake progress bars.** If the read takes an unknown time, say what is
  happening, do not animate a lie.
- **The demo must stay clearly labelled.** The public build is simulated and
  says so. Do not let a real-capture build reach the public URL by accident —
  `verify:showcase` exists to catch that and must keep passing.

---

## Working practices that earned their place

These are not generic advice. Each one came from something that went wrong
here.

**Run the app. Reading it is not enough.** Seven defects this session were
invisible in review and obvious on first run: Verify replaying the whole
onboarding, Argentina's only consultation being closed, consent values rendered
navy-on-brown at ~1.2:1 contrast, a dead `ExploreView`, a "World" scope holding
only Argentine topics, a shell overflowing its desktop frame, and scope pills
whose styles were deleted by a shared selector. None of these would have been
caught by tests or by reading diffs.

**Verify in the browser, not by assertion.** `read_page` and `javascript_tool`
against a running dev server catch computed-style bugs that no unit test sees.
The contrast bug was found by reading `getComputedStyle`, not by looking at CSS.

**Never delete CSS with a regex over selectors.** Removing the map by stripping
rules whose selector mentioned `discover-map`/`votes__view-switch` also removed
shared selector lists, silently deleting the scope control's entire layout —
and it shipped. Delete rules by reading them.

**Do not weaken a test to make it pass.** Thirteen legacy tests contradicted the
new structure. Every one was rewritten against the new contract; none deleted.
When a test fails after a redesign, decide whether the test or the code is
wrong, and say which.

**State privacy claims only where the deployed data flow supports them.**
"Your choice never leaves this device" was false: delegated proving hands the
witness to the wallet, and Midnight's own spec says the wallet can see it.
Prefer scoped truths — "not published on-chain", "not visible to this app".

**Distinguish "tests pass" from "it works".** 451 tests passed while the consent
screen was showing nothing and the nav labels were off-screen.

**The Windows pre-push hook cannot run the Linux gate.** Run
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash scripts/verify-linux-wsl.sh demo`,
confirm `Linux demo verification passed`, then push with `--no-verify`. It takes
~9-12 minutes, runs against the working tree rather than an isolated checkout —
so do not edit files while it runs — and must not be piped to `tail`, because
the pipeline status would be `tail`'s and a failed gate would look like a pass.

**Keep the three things distinct in every piece of copy.** Midnight Passport is
the account. A physical passport is a document. An eligibility pass is the
minimal result. Conflating them is the confusion this product kept producing,
and `ui/src/integration/product-boundaries.ts` now encodes the boundaries so
they cannot quietly drift.

**The visual register is an open question.** The reader liked the cream tone and
was lukewarm on the rest of the shell. Appearance now offers cream, dark, or
follow-the-device, but that hands back an existing palette rather than reworking
anything. Do not treat the current look as settled or as approved.
