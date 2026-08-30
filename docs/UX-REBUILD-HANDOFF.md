# UX rebuild — handoff

Written 2026-08-30. Updated 2026-08-30 when Step 4 landed.

**Step 4 is done.** What follows is the record of it plus what is left in
Steps 5 and 6.

Branch: `feat/warm-light-design-system`, off `main` at `454bbcf`. Not pushed.

**Approved spec — read this first:**
https://claude.ai/code/artifact/e6ccc025-c494-4565-a99d-c366dac24a09

---

## 1. Reference research

Step 4's prime directive was to study real screens before drawing. It was done
with the Appllama MCP: the choice-card grammar came from Duomo, Cara Care and
Ayatique; the grouped settings rows from Lifesum (which happens to sit on a
near-identical cream) and RV LIFE; the detail-screen skeleton and the composed
empty state from Dwell. Those patterns are cited in the file-level comments of
the views they shaped, so the reasoning survives without the screenshots.

If you pick up Steps 5 or 6 and the MCP is missing from your tool list, note
that it is registered at user scope and only loads at session start:

```
claude mcp add --transport http --scope user appllama https://mcp.appllama.io/mcp
```

The skill itself needs no MCP and is on disk at
`Desktop/Midnight/.agents/skills/appllama-app-design-skill/` (plus
`appllama-usage`). It targets Expo/React Native; this app is Vite + React web,
so the anti-slop laws, motion frequency gate, navigation semantics and the
verification loop transfer — SF Symbols, Reanimated, FlashList and the
simulator tooling do not.

---

## 2. What landed

| Step | Commit | What |
| --- | --- | --- |
| 2 | `7e6becf` | Warm-light token layer, Fraunces, Tailwind `@theme` |
| 3 | `395527b` | Twelve system primitives + 18 tests |
| 5 (service) | `0ee2b26` | Enrollment batch status: publisher → HTTP → client |
| 4 (slice) | `9d81def` | FAQ accordion → three-line explainer |
| 4 | `5c2d6a5` | Poll model, runtime facts and the public-state hook out of App.tsx |
| 4 | `1a938a1` | ResultsPanel + VotesView |
| 4 | `b92f6a6` | PolicyDetailView |
| 4 | `1ab8889` | ExploreView |
| 4 | `d3ec0f5` | VoteFlow, with review as a Sheet |
| 4 | `e3082bf` | ProfileView + ReceiptVerifier; language control moved here |
| 4 | `4419d6e` | Shell on tokens, deletion list, dead-CSS prune |

Suites at the tip: **ui 165/165 (24 files)**, **cico-service 63/63 (9 files)**,
`tsc` clean on both, `biome ci --changed` clean.

Counters at the tip, all measured rather than estimated:

| | before Step 4 | now |
| --- | --- | --- |
| `App.tsx` | 3,284 lines | 592 |
| `index.css` | 4,402 lines | 2,413 |
| `grep -c -- --legacy- ui/src/index.css` | 180 | 91 |
| hardcoded hex in `index.css` | 455 | 281 |

### Decisions already made — do not relitigate

- **Accent is indigo `#5B5BD6`, flat.** Tomas chose it over the recommended
  deep sky after seeing all three rendered with computed contrast. It is
  4.77:1 on cream — passes AA, but **not approved for small or light-weight
  text**. It survives only as a flat solid: no gradient, no glow, no
  accent-tinted shadow, no second hue. `#1D5FA0` is the documented fallback.
- Argentine sky-blue is demoted to a country/flag accent only.
- Shape lock: actions pill, cards 20, inputs 12. Any other radius is a bug.

---

## 3. Things about this codebase that will bite you

- **`index.css` is two palettes.** The legacy one is `--legacy-` prefixed;
  the new one lives in `styles/tokens.css`. The prefix is load-bearing —
  both define an ink and a line, and `@import` hoists, so an unprefixed
  legacy block silently overrides the new tokens app-wide.
  `grep -c -- --legacy- ui/src/index.css` is the migration meter (91 refs
  after Step 4, down from 180). The legacy `:root` goes when it reaches zero,
  and what is holding it there now is the Passport journey.
- **281 hardcoded hex values remain** in index.css, all of them inside
  `passport-*`, `unified-*` and `showcase-*` rules. Migrate a screen at a
  time; a bulk swap leaves the app incoherent at every intermediate commit.
- **Dead CSS is worth sweeping mechanically, not by eye.** Step 4 removed 155
  rule sets by extracting every class in `index.css`, checking each against
  all of `ui/**/*.{ts,tsx,html}`, and deleting the rules whose every selector
  was unreferenced. Two traps if you repeat it: comments in this file contain
  unbalanced braces (`/* Connector between the dots {`), so mask comments
  before you parse; and rewrite with the file's existing line endings or
  `biome ci` fails the pre-commit hook on formatting alone.
- **The shadcn components in `components/ui/` were rendering unstyled** —
  there was no `@theme` block, so `bg-primary` and friends generated no CSS.
  Now mapped onto the new tokens. `card.tsx` is unused and should go with the
  primitives; `badge.tsx` and `button.tsx` are used in three places that
  should move to `components/system/Button`.
- **Tests assert on copy.** Change copy and its assertions in the same commit.
  Splitting those across parallel lanes caused six silent failures before.
- `biome.json` now sets `css.parser.tailwindDirectives` — without it `@theme`
  is a parse error.

---

## 4. Step 4, as built

Every view is out of `App.tsx` and rebuilt on the primitives. `App.tsx` is 592
lines holding routing, state and `CivicApp`; `ui/src/views/` holds the screens,
the poll model, the runtime facts and the shell chrome.

`ExploreView` · `PolicyDetailView` · `VotesView` · `ProfileView` · `VoteFlow` ·
`ResultsPanel` · `ReceiptVerifier` · `Chrome` (header + tab bar) · `HowItWorks`.

Deleted as listed: `.mode-strip` / `.mode-details`, `.explain-panel`, the badge
soup, `t.mascotPlaceholder` in both locales, `.mascot-reserved-slot`, and the
header language `<select>` (now a Profile row). The dead-CSS sweep took another
155 rule sets whose every selector is unreferenced anywhere in `ui/`.

### Three decisions worth knowing before you change them

- **Review is a Sheet over the choice screen, not a fourth stage.** `FlowStage`
  still has `'review'`; it renders the `choose` screen with the Sheet open, so
  dismissing returns to the answer rather than needing a back button.
- **`Screen`'s footer is only pinned because the shell is bounded.** `.app-shell`
  is a flex column at `100dvh` and `.sys-screen__body` is the scroller. Before
  that, `Screen`'s documented "pinned" footer sat wherever the content ended.
  If you make the shell a plain block again, every flow screen silently loses
  its action below the fold.
- **The badge assertions moved with the badges.** `showcase-passport-journey`
  still asserts a live journey never shows a synthetic credential; it now looks
  for `Synthetic credential` rather than `SYNTHETIC CREDENTIAL`.

### The slop pre-flight, run

Mechanically, over `views/` and the primitives: distinct accent hues **1**
(state tokens aside; zero hardcoded hex in either directory) · every radius from
`--r-pill` / `--r-card` / `--r-input` · emoji in chrome **0** · gradients **0** ·
duplicate labels **0** after unifying "Votar esta consulta" onto "Votá ahora".

---

## 4b. What is left

**Step 5's UI half** is not done. `WaitState` and `HttpEnrollmentStatusPort`
both exist and `WaitState` has tests, but nothing renders the enrolment wait
yet. It needs a polling hook and a place in the post-enrolment flow.
`pendingCount` is `null` when unobserved — render a dash, never a zero.

**Step 6** — the six mascot PNGs are still ~1 MB each. Re-export as WebP at
display size, same filenames. While you are in there: `gaucho-waving.png` has a
pale-blue plate baked into the artwork, which is the only sky-blue left on
Explore. Crop it to transparency in the same pass.

**Not touched, and still on the legacy palette:** the Passport journey
(`components/passport-v2/`). It is the largest remaining block of legacy CSS and
was outside Step 4's view list. The `--legacy-` meter stops falling until it
moves.

---

## 5. Verification

Per commit, on Windows — all three work fine against this checkout:

```
npx biome check --write <changed files>
npx tsc --noEmit -p ui/tsconfig.json
npm run test --workspace midnight-referendum-ui
```

For the per-view loop, run vitest from `ui/` instead — the same suite takes
about 21s there against 114s through the workspace script, and a single file is
faster still:

```
cd ui && npx vitest run src/__tests__/App.test.tsx
```

The pre-commit hook is `biome ci --changed`, which is stricter than
`biome check`: it fails on formatting and on `noDescendingSpecificity`, and it
pulls in every pre-existing finding in any file you touch. Run it before you
commit rather than discovering it in the hook.

Visual: `preview_start` the `referendum-ui` config, then capture each screen
at 320 / 390 / 480. Confirm no horizontal body scroll at 320. Do not ask the
user to check — look, and attach the screenshots.

Two things that cost time in Step 4 and need not cost it again:

- The dev server binds **5199** via `.claude/launch.json` at the *repo root*,
  not this checkout's copy, and another session may already hold it. Add a
  second entry on a different port rather than fighting for 5199; `autoPort`
  does not work here because `npm run dev` ignores `PORT` and falls back to
  5173, which the preview tool will not open.
- `ui/.env` pins `VITE_APP_MODE=undeployed`, which lands on the Passport
  journey with no fixture polls behind it. For a visual pass over the rebuilt
  views, drop a gitignored `ui/.env.local` with `VITE_APP_MODE=demo`, set
  `sessionStorage['cico-wave1-onboarding-complete'] = '1'`, and delete the
  file afterwards.

Before push, the WSL gate. **The one-liner this document used to give here
does not work on this machine** — it cost three failed runs before Step 4 was
pushed, each failing for a different reason, none of them code:

1. `bash -lc` is a *login* shell, which does not source `~/.bashrc`, so nvm
   never loads. `node` then resolves to nothing and the Windows npm on WSL's
   interpolated PATH wins, and the gate reports *"Windows npm leaked into WSL
   PATH"* — which reads like a PATH bug but is really "nvm was never loaded".
2. Stripping `/mnt/c` out of PATH to fix that also removes the only route to
   the Compact compiler, which lives in `~/.local/bin` (`compact 0.31.1`) and
   is not on PATH in a non-login shell. The gate then reports *"A working
   Compact compiler is required"*.
3. An inline `wsl.exe -- bash -c '...'` mangles quoting across the Git Bash
   boundary, and a script written by a Windows tool arrives with CRLF, which
   dies as `set: pipefail: invalid option name` — the `.husky` `Illegal
   option` trap in a new costume.

So: drive it from a **script file with LF endings**, and load the toolchain
explicitly. `scripts/verify-linux-wsl.sh` in this repo does exactly that; run
it from Git Bash as

```
MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash scripts/verify-linux-wsl.sh demo
```

Two things about reading the result. The run takes **about 12 minutes**, nearly
all of it the UI suite over `/mnt/c`. And do not pipe it into `tail` to read the
output: the pipeline's exit status is `tail`'s, so a failed gate reports success.
Redirect to a file and echo `$?` separately.

What it actually covers, from a clean `compactc` compile: the two Compact
simulator suites, the undeployed fixture issuer, and the api, cico-service,
relayer and ui suites — 356 tests, plus the api and relayer builds.

On a missing `@rollup/rollup-linux-x64-gnu`, a Windows `npm install` wiped the
Linux platform binaries — re-fetch per `SESSION-HANDOFF.md` §5.

Push from WSL too, not from Git Bash: `.husky/pre-push` runs the same gate, and
it refuses to run outside Linux.

**Not verified anywhere in this branch:** Playwright E2E, and anything on
Preview. Both are Sol's lane and should be reported as unverified, not assumed.

---

## 6. Checkout location

Work in `/mnt/c/Users/tomas/Desktop/Midnight/tmp/midnight-referendum-app-review`.
The older WSL checkout at `~/src/referendum` is stale — it sits at `01db9f2`,
five merged PRs behind — despite older notes calling it the canonical one.
