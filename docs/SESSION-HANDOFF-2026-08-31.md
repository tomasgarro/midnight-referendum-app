# Session handoff — 31 August 2026

Pick-up document for the next session. It records what landed, what was
actually verified rather than reported, what is open, and the few facts that
cost real effort to establish so nobody re-derives them.

Supersedes [`SESSION-HANDOFF.md`](SESSION-HANDOFF.md) (30 August) for current
state. That file remains as the historical record of the earlier session.

---

## 1. Headline

**A real Midnight Passport session now works.** A live consent handshake with
the deployed Passport completed and returned an approved profile. Evidence:
[`evidence/passport-live/2026-08-31-first-real-session.md`](evidence/passport-live/2026-08-31-first-real-session.md).

Everything else this session was clearing the path to that, and fixing what
running the app actually exposed.

## 2. Branch and PR state

| Item | State |
| --- | --- |
| `main` | `9021841` (PR #20 merged) |
| `feat/premium-civic-shell` | 7 commits, **PR #21 open**, not merged |
| Live static demo | `lightskyblue-emu-103266.hostingersite.com`, serving `index-BQ0oUuO0.js` — the `demo` build of `c256336`. **Behind the branch**: it predates the theme control and the map removal |
| VPS `hermes-agent.vps` | Untouched. Still only the unrelated `hermes-agent-c3p7` project |

The seven commits on the branch:

| SHA | What |
| --- | --- |
| `f11e4a4` | The five-destination shell + `product-boundaries.ts`. **Was uncommitted in the working tree** when the session started |
| `24f434a` | Verify-as-action, Argentina reopened, flag a11y, dead views deleted, tests rewritten |
| `63621da` | Field-less Passport hang fixed, allowlisting docs corrected |
| `c256336` | World scope made genuinely global |
| `1872bb1` | Consent-screen contrast fixed, live-session evidence recorded |
| `1ebc664` | This handoff |
| `c7ee364` | Theme control, fake map deleted, Verify taken out of the tab group, desktop frame overflow fixed |

## 3. Verification — what was actually run

- Full repository suite: **451 tests, 65 files, all passing** (`npm test`).
- `ui` production build clean. `tsc -b` clean. `biome ci` clean.
- Linux gate: `bash scripts/verify-linux-wsl.sh demo` → `Linux demo verification passed`.
- Live Hostinger deploy verified in a browser: shell renders, no console errors,
  and the scope split behaves (see §5).
- Real Passport handshake: performed by a human, in Brave, against the deployed
  Passport. Not simulated.

**The Windows pre-push hook cannot run the Linux gate.** It invokes
`scripts/verify-linux.sh`, which refuses to run outside Linux/WSL. Run
`MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash scripts/verify-linux-wsl.sh demo`
explicitly, confirm `Linux demo verification passed`, then push with
`--no-verify`. Do not push with `--no-verify` without running it. It takes
~11 minutes.

## 4. Midnight Passport — the facts, so nobody re-derives them

**The protocol is real.** `org.midnight.passport.profile/v1` is defined in
Midnight's own repo (`midnightntwrk/passport@demo/pwa-demo`,
`demo-backend/src/profileProtocol.ts`) and the production bundle at
`midnightpassport.com` contains the same parsers. Not invented by an earlier
session.

**No origin allowlisting is required for the popup flow.** This was proven, not
inferred: `http://localhost:5200` — not HTTPS, not registered anywhere —
completed a full handshake. Passport replies to whatever origin sent the
request; the approval is the person's, on Passport's own consent sheet. Only
the *embedded* mode (Passport framing the app in its in-app browser) needs a
listing, and that is a public PR to a community registry whose only stated rule
is HTTPS. **No domain purchase is needed for the popup flow.**

**The real wall is the network.** The deployed Passport runs on
stagenet/ledger-9; this app targets Preview/ledger-v8, and Passport's own copy
says it cannot open an account on Preview. Consequences:

- Passport can never supply a Preview address today.
- Keep `profileFields` at `displayName`. Requesting `passportContract` throws
  `wrong_network`; requesting `midnightAddresses` returns a **stagenet** address
  that `parseProfile` does not network-check — silent corruption, not a visible
  failure.

This is the one question worth taking to a Midnight contact: *is there a
Preview-capable Passport, or a timeline?* It is not solvable from this side.

**Delegated proving works, but through Lace, not Passport.** Passport does not
implement the DApp Connector at all (`window.midnight`, `getProvingProvider`
appear zero times in its bundle). The wallet path is already live in the UI and
uses no HTTP proof server. Caveat from Midnight's own spec: the wallet *can see
the witness*, and may itself prove remotely — so "your vote never leaves your
phone" is not guaranteed even on the good path. Prefer a scoped, true claim
("not published on-chain").

**Only `showcase` and `preview` builds reach the real Passport.** In `demo`,
`connectPassport()` short-circuits to a hardcoded local session and makes no
network call. To reproduce the live session:

```bash
npm run dev --workspace midnight-referendum-ui -- --mode showcase --host localhost --port 5200
```

The header must read **PASSPORT EN VIVO** and the connect screen must offer no
demo shortcut. `--mode` beats `ui/.env`, which is set to `undeployed`.

## 5. Product boundaries now encoded

`ui/src/integration/product-boundaries.ts` makes these unrepresentable rather
than merely documented, and `ui/src/__tests__/product-boundaries.test.ts` holds
them:

- Browsing a country grants no eligibility.
- Midnight Passport is the only citizen identity provider.
- The only real proving mode is wallet-delegated. A generic remote proof server
  is not expressible as a citizen capability.

Verified live on the deployed demo with a French pass: Global and France offer
*Participate*; Argentina offers *Add eligibility* on all three open
consultations and shows no eligibility badge.

## 6. The three things that stopped being called "passport"

The confusion this product kept producing. Keep them distinct in all copy:

1. **Midnight Passport** — the person's account and secure entry point.
2. **A physical passport** — a document used once, in a separate step.
3. **An eligibility pass** — the minimal private result participating uses.

The onboarding privacy stage states all three by name and says the document is
*not* stored inside Passport.

## 7. Open work, roughly in priority order

1. **Review and merge PR #21.** Nothing else should be built on top of it while
   it is open.
2. **The AppLlama polish list** —
   [`../research/premium-ux/appllama-round-2.md`](../research/premium-ux/appllama-round-2.md),
   ~25 checkboxed items each naming its file and its justifying reference.

   Done in `c7ee364`: Verify unlabelled and outside the tab group, its geometry
   corrected to the measured 60px/-16px, the reduced-motion gap on its press
   scale closed, and the duplicate Discover switcher removed along with the
   decorative map.

   Still outstanding, and worth doing next: `validUntil`/`assurance` are
   captured by `CivicCredentialSummary` and then discarded by `CredentialsView`,
   so the pass shows issuer and age class but not expiry — the one fact that
   decides whether it is usable. Both credential buttons still call the same
   handler, so "renew or replace" and "add" are the same click with no
   confirmation. A pre-scan tips step with named failure modes (glare, wrong
   page, moving during the NFC read) is not built.

3. **The visual register is an open question, not a settled one.** The reader
   said the cream tone was what they liked and was lukewarm on the rest. The
   theme control returns cream as an explicit choice, but it hands back a
   palette that already existed rather than reworking anything. If the cream
   version still does not land, that is a visual pass — palette, type, density
   — and a different AppLlama round from the navigation one already run.
4. **Deploy a showcase build to a real HTTPS origin** if a shareable live-Passport
   demo is wanted. `cardanoschool.org` is owned and active until 2026-11-05 but
   has **no website or certificate attached** — it resolves to a Hostinger IP
   and serves nothing. Setting it up means creating a website, issuing a cert,
   and waiting on DNS. Not required for the popup flow to work.
5. **Physical NFC**, untested on real hardware. France is the polished path.
6. **VPS stack**, not started. Isolate it in its own Compose project; never
   touch `hermes-agent-c3p7`.

## 8. Known issues not yet fixed

- **`ui/vercel.json` would break a real Vercel deploy.** `connect-src 'self'`
  blocks the indexer, the relayer and the CICO API; `Permissions-Policy:
  camera=()` blocks the passport-scan step.
- **`deploy/hostinger/Caddyfile.example` sets `X-Frame-Options "DENY"`**, which
  would kill embedded Passport mode if that config is ever used.
- **Two Biome warnings persist** and are accepted: an unused suppression in
  `PassportScanTutorial.tsx` and a descending-specificity selector in
  `profile-view.css`. `biome ci` still exits 0.
- **`compact-runtime` is pinned at 0.16.0 against 0.19.0 latest** — three minors,
  the largest drift in the tree. The whole `midnight-js` 4.1.1 line is current.
- **The France consultation has no Spanish copy**, so the Spanish UI shows its
  French title.

## 9. Working rules worth keeping

- Verify claims by running the thing. Five of this session's defects — the
  Verify re-onboarding loop, the closed Argentine consultation, the invisible
  consent values, the dead `ExploreView`, and a shell that overflowed its
  desktop frame and pushed the nav labels off-screen — were invisible in review
  and obvious on first run.
- Do not weaken a test to make it pass. Every legacy assertion this session was
  rewritten against the new contract, never deleted.
- Never state a privacy property the deployed data flow does not support.
