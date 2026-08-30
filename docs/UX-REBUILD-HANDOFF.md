# UX rebuild — handoff

Written 2026-08-30. Pick-up document for the session that finishes Step 4.

Branch: `feat/warm-light-design-system`, off `main` at `454bbcf`. Not pushed.

**Approved spec — read this first:**
https://claude.ai/code/artifact/e6ccc025-c494-4565-a99d-c366dac24a09

---

## 1. Do this before anything else

The Appllama MCP is registered at user scope but a session only loads MCP
servers at startup. **If `appllama` tools are not in your tool list, stop and
say so** — Step 4's remaining work is the per-screen visual rebuild, and its
prime directive is to study 20–30 real screens per screen type before drawing.
Doing it without the MCP was explicitly declined once.

The skill itself does not need the MCP and is on disk at
`Desktop/Midnight/.agents/skills/appllama-app-design-skill/` (plus
`appllama-usage`). Read it. It targets Expo/React Native; this app is Vite +
React web, so the anti-slop laws, motion frequency gate, navigation semantics
and the record-and-scrub verification transfer — SF Symbols, Reanimated,
FlashList and simulator tooling do not.

---

## 2. What landed

| Step | Commit | What |
| --- | --- | --- |
| 2 | `7e6becf` | Warm-light token layer, Fraunces, Tailwind `@theme` |
| 3 | `395527b` | Twelve system primitives + 18 tests |
| 5 (service) | `0ee2b26` | Enrollment batch status: publisher → HTTP → client |
| 4 (slice) | `9d81def` | FAQ accordion → three-line explainer |

Suites at the tip: **ui 165/165 (24 files)**, **cico-service 63/63 (9 files)**,
`tsc` clean on both, biome clean on everything changed.

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
  `grep -c -- --legacy- ui/src/index.css` is the migration meter (currently
  ~173 refs). The legacy `:root` goes when it reaches zero.
- **455 hardcoded hex values remain** in index.css against 173 token
  references. Views must be migrated one at a time; a bulk swap leaves the
  app incoherent at every intermediate commit.
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

## 4. What is left in Step 4

Move each view out of the 3,360-line `App.tsx` into `ui/src/views/`,
rebuilding it on the primitives as it moves. `ui/src/views/` exists now with
`HowItWorks` as the worked example. `App.tsx` should end up holding routing,
state and `CivicApp` only.

Remaining views: `ExploreView`, `PolicyDetailView`, `VotesView`,
`ProfileView`, `VoteFlow`, `ResultsPanel`, `ReceiptVerifier`.

Per screen: one idea, one image, one primary action; secondary actions are
links. Headline ≤ 6 words, body ≤ 2 lines. Decisions become `Sheet`s modelled
on RariMe's proof request — labelled `StatGroup`s of `StatRow`s, then two
stacked buttons.

Still to delete: `.mode-strip` / `.mode-details`, `.explain-panel`, the badge
soup (`LIVE PASSPORT` / `SYNTHETIC CREDENTIAL` / `SIMULATED VOTE`),
`t.mascotPlaceholder` in both locales, `.mascot-reserved-slot`, and the header
language `<select>` (it becomes a Profile row).

**Step 5's UI half** is not done: `WaitState` and `HttpEnrollmentStatusPort`
both exist, but nothing renders the enrollment wait yet. It needs a polling
hook and a place in the post-enrolment flow. `pendingCount` is `null` when
unobserved — render a dash, never a zero.

**Step 6** — the six mascot PNGs are still ~1 MB each. Re-export as WebP at
display size, same filenames.

### Slop pre-flight, before the screens ship

Mechanical count, not a judgement call: distinct accent hues = 1 · every
radius from the stated scale · emoji in chrome = 0 · gradients without a
brand reason = 0 · duplicate labels for one intent = 0.

---

## 5. Verification

Per commit, on Windows — all three work fine against this checkout:

```
npx biome check --write <changed files>
npx tsc --noEmit -p ui/tsconfig.json
npm run test --workspace midnight-referendum-ui
```

Visual: `preview_start` the `referendum-ui` config, then capture each screen
at 320 / 390 / 480. Confirm no horizontal body scroll at 320. Do not ask the
user to check — look, and attach the screenshots.

Before push, the WSL gate (it refuses to run under Git Bash):

```
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/tomas/Desktop/Midnight/tmp/midnight-referendum-app-review && bash scripts/verify-linux.sh demo'
```

Prefix `wsl.exe` from Git Bash with `MSYS_NO_PATHCONV=1`. On `Illegal option`,
check `git ls-files --eol .husky/` first. On a missing
`@rollup/rollup-linux-x64-gnu`, a Windows `npm install` wiped the Linux
platform binaries — re-fetch per `SESSION-HANDOFF.md` §5.

**Not verified anywhere in this branch:** Playwright E2E, and anything on
Preview. Both are Sol's lane and should be reported as unverified, not assumed.

---

## 6. Checkout location

Work in `/mnt/c/Users/tomas/Desktop/Midnight/tmp/midnight-referendum-app-review`.
The older WSL checkout at `~/src/referendum` is stale — it sits at `01db9f2`,
five merged PRs behind — despite older notes calling it the canonical one.
