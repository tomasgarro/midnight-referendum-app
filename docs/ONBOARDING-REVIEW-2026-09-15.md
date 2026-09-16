# Midnight onboarding review — 15 September 2026

## Review batches

1. **Character assets and shared shell**
   - Six individual transparent 640 × 960 WebP assets in `ui/public/art/capybara-onboarding/` (486 KB combined).
   - `OnboardingMascot.tsx`: opt-in onboarding artwork, independently clipped paw/head gestures, eyelid blink, offscreen pause, reduced-motion static images.
   - `onboarding.css`, `PassportPageArt.tsx`, `onboarding-copy.ts`: Outfit, ivory/plum shell, warm illustration accents, EN/ES/FR copy. Existing mascot consumers and accepted landing remain unchanged.
2. **Introduction and Passport connection**
   - `PassportJourney.tsx`, `UnifiedPassportOnboarding.tsx`: shared introduction across all four runtime modes; official branding; selective disclosure illustration; real Passport bridge primary action.
   - Pending, cancellation, retry and connected states stay in the connection step. Explicit demo connection remains secondary. Skipping creates neither a session nor an eligibility credential.
3. **Verification and dashboard handoff**
   - `DocumentVerificationJourney.tsx`, `PreviewPassportJourney.tsx`, `useJourneyHistory.ts`: actual visited-screen Back history, nested document navigation, existing camera/manual/provider adapters, late-response guards, large scan-page guide.
   - `CivicRuntime.tsx`: pass the connected session into onboarding and resume at Passport or document verification as appropriate. Existing session-scoped completion storage is preserved.
   - Journey outcomes distinguish browsing, deferment, demo completion and verified completion. Only confirmed credential paths invoke credential creation callbacks.

## Artwork provenance

Identity reference: the user's `capybara-mascot-character-sheet.png`. Generated with the built-in image tool. The welcome master and original sheet informed the other poses. No Blender assets or third-party mascot artwork are shipped.

Original generated PNGs remain under `C:/Users/tomas/.codex/generated_images/01a0a59d-4897-7a11-9418-9c77b58e2f90/`:

| Export | Generated source |
| --- | --- |
| welcome.webp | exec-b8f7ccd5-2fa2-4eb5-93b6-657af47b185f.png |
| explain.webp | exec-2c659a97-f860-41bd-8554-62094aa0dce4.png |
| passport.webp | exec-480caf27-44b7-4522-b2d3-cb2bfe073500.png |
| waiting.webp | exec-00ecf091-933e-4765-abc2-e9de1f630c03.png |
| success.webp | exec-74f8b66b-1f21-4168-ad23-b366b2c3ecad.png |
| reassure.webp | exec-254dce81-0eb6-4252-951a-61a07809162f.png |

All exported assets have real alpha channels. Contact sheet: `outputs/capybara-poses.png`. Closed passport prop has no generated text or logo.

## Validation evidence

- Full UI suite: **236 tests passed across 33 files**. Final targeted provider/journey tests also pass after the late-response guard changes.
- Browser: 34 distinct passing checks across the onboarding, landing and Passport suites. Three pre-existing deployed-showcase/wallet tests remain environment-gated in this local demo build.
- 320, 390, 768 and 1440 px × English, Spanish and French. Cream and dark themes; reduced-motion static fallback; enlarged text; keyboard activation; actual-path browser/toolbar Back; both defer paths; dashboard resume; explicit demo entry.
- Controlled real-browser WindowProxy popup handshake passed. Unit tests cover connection cancellation/retry/late responses, camera failures/manual entry, provider expiry/restart and provider-issued completion.
- Final demo build, TypeScript and changed-file Biome checks pass. Build retains the existing large-chunk warning.
- Full-flow recording: `outputs/onboarding-full-flow.webm`; sampled motion review: `outputs/onboarding-motion-review.png`.
- Screenshots for each viewport/language and stage: `test-results/onboarding-v3-*`. Enlarged-text and final motion evidence: `outputs/onboarding-motion/`.

A real physical passport/NFC device and a live provider account were not used. The browser handshake uses a controlled response, and provider lifecycle checks use test adapters. These tests do not establish live provider availability or certify third-party data retention. Enlarged text and a shortened viewport were checked; an actual mobile OS keyboard was not available.

No deployment, backend migration, publishing or change to the unrelated Hostinger working-tree edit was performed.
