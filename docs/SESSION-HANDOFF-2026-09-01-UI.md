# Session handoff — 1 September 2026 UI pass

Pick-up document for the next session. This is the UI companion to
[`SESSION-HANDOFF-2026-09-01.md`](SESSION-HANDOFF-2026-09-01.md), which remains
the source of truth for Preview, relayer, wallet, and backend state.

The attached design notes and screenshots were treated as visual/product
direction only. They were not deployment instructions or evidence of a live
credential, NFC read, vote, or Preview deployment.

---

## 1. Current state at handoff

| Item | State |
| --- | --- |
| Review checkout | `C:\Users\tomas\Desktop\Midnight\tmp\midnight-referendum-app-review` |
| Branch | `feat/jury-ready-submission` |
| Final UI commit | `8ab73b8` — `Use five-slot mobile navigation geometry` |
| Pull request | [#25](https://github.com/tomasgarro/midnight-referendum-app/pull/25), open |
| Demo deployment | [lightskyblue-emu-103266.hostingersite.com](https://lightskyblue-emu-103266.hostingersite.com) |
| Deployment state | Final five-slot navbar build uploaded; live URL returned HTTP 200 |
| Final archive | `deploy/hostinger/artifacts/ui_jury-demo_20260901_231135.zip` |
| Archive SHA256 | `6BDCEEA1F87E5AD817F3D30A41B30C522408BD8F40F4EE1BBE3D6CBEC4DF9828` |

The only untracked item at handoff is `qa/journey-20260901/`, containing local
screenshots and captures. It is intentionally excluded from commits.

---

## 2. What was completed

### Verification funnel

- Reworked the Passport-first welcome and explanation flow around a single CTA,
  explicit privacy truth, mode labels, and centralized `en`, `es`, and `fr`
  copy.
- Kept the current provider contracts intact while converging the unified and
  Preview journey presentation styles.
- Preserved the mode boundary:
  - `demo` uses an explicit local synthetic Passport/credential journey.
  - `showcase` can connect the real Passport session.
  - `preview` and `undeployed` keep the real RariMe enrollment/polling path.
  - No browser NFC simulation or fabricated live credential was added.
- The demo eligibility action now creates a clearly labelled synthetic pass and
  proceeds to the consultation dashboard instead of showing an unavailable
  credential error.
- The document journey keeps camera permission, secure-context, no-camera,
  camera-denial, MRZ/manual fallback, and RariMe handoff states explicit.

### Settings and persistent utility shell

- Added the settings surface and advanced settings route.
- Added privacy policy and terms-of-use prototype pages, with wording that
  makes clear they are not yet a published legal policy.
- Added feedback UI. In this prototype it copies feedback locally; it does not
  send feedback to a backend.
- Added recovery/backup UI with encrypted export, Google Drive, and Rarimo
  options visibly marked as pending/soon where no integration exists.
- Removed the persistent `referendum.earth` and large Passport presentation from
  the main shell.
- Persistent utility controls are now the mode signal, feedback, planet-only
  language control, and settings.

### Navbar and branding

- Replaced the cream-baked raster logo with the adaptive inline SVG
  [`MidnightMark.tsx`](../ui/src/components/brand/MidnightMark.tsx).
- The top-left app mark uses semantic light/dark theme tokens and is larger and
  readable on both themes.
- The raised center action uses a deliberately simple 2D ballot/voting mark,
  without the old app tile or extra branding.
- The capsule and center action share translucent material, so they read as one
  composed surface rather than a button stuck on top of a bar.
- The navbar is structurally five equal slots:
  `Discover | Credentials | Vote | Activity | Passport`.
  The center action occupies the real middle slot instead of being overlaid on
  a four-column layout.
- The final geometry was checked at 320, 390, and 480px: no horizontal overflow,
  exact middle slot, and the side icons clear the center disc.

### Assets and visual direction

- Reused the existing capybara asset family first, including passport, waving,
  waiting, climbing/reading, and achievement states.
- Kept the cream canvas, large display type, restrained indigo accent, quiet
  surfaces, and explicit demo/live truth from the agreed Purpose-like direction.
- The generated ballot artwork was used only as visual inspiration; production
  uses code-native SVG for crisp theme adaptation and accessibility.

---

## 3. What was deliberately not touched

This UI pass did not change the technical interfaces or claim that the system
is ready for a real Preview release.

- `api`, `cico-service`, `contracts`, `relayer`, `devnet`, proof-server, or
  on-chain transaction logic.
- Midnight Passport, RariMe/Rarimo, camera, MRZ, or provider interface
  contracts.
- Real NFC reading, physical-document hardware support, or live credential
  issuance.
- The blocked Preview deployment and its dedicated operator-wallet funding,
  relayer restart, long indexer sync, or error-170 recovery.
- Actual Google Drive backup, Rarimo backup, private-key recovery/export
  security model, or encrypted backup storage.
- Feedback delivery to a server, analytics, account authentication, or a
  published legal/privacy policy.
- The broader civic shell naming/content pass, full Activity/results redesign,
  and later voting/protocol work.
- Editing or re-recording the how-to video. The existing `passport-scan` clip
  remains in use for now.

---

## 4. Verification performed

- Full UI baseline before the final navbar-only commits: **32 files, 230 tests
  passed**.
- Latest shell regression after the five-slot change: **App test, 19 tests
  passed**.
- Demo TypeScript/production build passed after the final change.
- Biome focused checks and the repository quality check passed. Quality still
  reports the existing 42 `noExplicitAny` warnings in `api/src/index.ts`.
- `git diff --check` passed.
- Manual Playwright journey was walked at 320, 390, and 480px. The measured
  navbar used five equal tracks, the center action was in the middle slot, and
  `document.documentElement.scrollWidth` equalled the viewport width.
- Final Hostinger asset verification returned HTTP 200 for the landing page and
  served the final bundle containing `chrome-nav__center-slot`.

The latest visual proof is in `qa/journey-20260901/`. Do not treat those local
captures as release evidence; they are working-session QA only.

---

## 5. What Opus should do next

### Technical priority

Start with the technical handoff in §5 of
[`SESSION-HANDOFF-2026-09-01.md`](SESSION-HANDOFF-2026-09-01.md): fund the
dedicated Preview operator wallet, restart the relayer, rerun the Preview
deployment with the long sync budget, and record evidence only from the final
manifest and explorer. Do not describe Preview as deployed until both confirm
it.

Then review the open PR and run the full Linux/WSL gate before merging:

```bash
MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash scripts/verify-linux-wsl.sh demo
```

The Windows pre-push hook cannot run this Linux gate correctly. Confirm
`Linux demo verification passed` before any push that bypasses the hook.

### UI/product priority

1. Do a final human visual pass in light and dark themes at 320, 390, and
   480px, especially long French/Spanish labels, keyboard/focus states,
   reduced motion, and camera recovery.
2. Decide the final product copy for legal privacy/terms pages before publishing
   them as anything stronger than prototype summaries.
3. Define the real recovery threat model before enabling private-key export or
   any cloud backup. The current greyed options are intentional placeholders.
4. Add an actual feedback destination or keep the copy-only behavior clearly
   labelled.
5. Revisit the broader civic shell, Activity/results polish, and the how-to
   video only after the technical Preview path is independently evidenced.

---

## 6. Run locally

From PowerShell in the active review checkout:

```powershell
Set-Location 'C:\Users\tomas\Desktop\Midnight\tmp\midnight-referendum-app-review'
$env:VITE_APP_MODE = 'demo'
npm run dev --workspace midnight-referendum-ui -- --host 127.0.0.1 --port 5176
```

Open <http://127.0.0.1:5176/>. If port 5176 is busy, choose another port and
open the matching URL. The local `demo` build is the intended path for UI QA;
it must remain visibly synthetic.

Useful checks:

```powershell
npm run test --workspace midnight-referendum-ui -- --run
$env:VITE_APP_MODE = 'demo'
npm run build --workspace midnight-referendum-ui
npm run quality
```

