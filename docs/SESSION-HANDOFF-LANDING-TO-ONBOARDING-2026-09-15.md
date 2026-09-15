# Session handoff: landing complete, mobile onboarding next

Date: 2026-09-15
Repository: tomasgarro/midnight-referendum-app
Branch: feat/landing-and-passport-ui
This is a follow-up to merged PR #29. Use the follow-up PR for the final commit
and checks. This handoff supersedes the earlier local session note for UI status.

## Next session brief

Focus on the app onboarding, especially mobile, and refine it into a professional,
finished experience. Begin by reviewing the current /#app journey at 320px and
390px, then tablet and desktop. Identify hierarchy, spacing, typography, copy,
transitions, form and button states, navigation, and accessibility improvements.
Work in small reviewable iterations. Preserve functional Passport/demo behavior;
visual concept illustrations are not working identity or eligibility features.
The current landing is the accepted visual starting point, not a request to
redesign it again. The user will supply a new mascot separately.

Suggested next-session prompt:

> Read docs/SESSION-HANDOFF-LANDING-TO-ONBOARDING-2026-09-15.md first. Inspect the
> current branch and dirty tree. Review the follow-up landing PR and its CI.
> Work on mobile app onboarding and refine the design into a professional,
> finished experience, starting from the existing /#app journey. Preserve demo,
> Passport and privacy boundaries. Show small local review iterations. Hostinger
> remains paused; do not deploy or change DNS. Ask before additional pushes.

## What changed in this session

- Replaced the hero orb with matching transparent human/agent passport artwork.
  Both layers share a gentle wrist tilt. A circular mask reveals the agent image;
  it grows near the passport and palm, resets on exit, and stops offscreen.
  Touch, mobile and reduced-motion layouts use the static human image. Loading
  failures preserve navigation and a usable fallback.
- Overlaid official local Midnight SVG geometry on both passport covers. The
  supplied incorrect marks were removed. No backend or Passport state changes.
- Removed text beneath the wrist and the independent-experiment hero strip.
  Explore Midnight is the secondary hero link. Hand size and edge blending improved.
- Larger bridge icons. Centered scroll-controlled exposure/possibility headline.
  Step progress controls moved above the illustrations; redundant helper labels
  removed. Native scrolling works in both directions, with linear mobile fallback.
- Shared arrow behavior: northeast arrows rotate to point right on hover/focus;
  existing color/gap changes retained. Reduced-motion behavior supported.
- Original illustrated lavender mountain finish blends into the dark plum footer
  with light text. Footer navigation preserved. Large placeholder moon removed;
  future-mascot slot reserved. Hero gradients remain unchanged.
- Privacy sentence uses larger Fraunces italic (21-26px), raised 6px, without a
  top border. Audience controls sit right of the heading on desktop and stack
  below it on mobile. Both audience panels have tighter spacing and artwork.
- Human concept graphic explains selective disclosure: personal details remain
  private while a requested citizenship attribute is shared. Short future copy
  covers citizenship, verified-citizen conversations, opt-in attribute-based
  consultations (e.g. gender), and sourced AI civic briefings/research.
- Agent panel uses the user's Midnight City poster with its baked-in Enter the
  city button removed. It remains uncropped, max 380px wide; extra caption removed.

## Source map

- ui/src/components/landing/PassportHeroArt.tsx and passport-hero-art.css
- LandingHero.tsx, HowItWorks.tsx and associated styles
- LandingFinale.tsx, landing-finale.css, landing-actions.css
- SelectiveDisclosureScene.tsx and selective-disclosure-scene.css
- ui/public/art/{passport,landscape,city}/ and official brand SVG
- tests/e2e/{landing-onboarding,passport-hero,landing-finish}.spec.ts
- docs/PASSPORT-HERO-2026-09-15.md: hero asset provenance and original CI diagnosis
- design-qa.md: visual iterations and validation evidence

## Validation and CI context

PR #29's browser failure was reproduced: cold Vite development transforms delayed
onboarding after Explore Passport. Managed Playwright now builds and previews the
production demo bundle; the heading assertion stays at 10 seconds. BASE_URL can
point to an existing preview. Tests use per-run screenshot outputs and the Civic
Pulse privacy test derives allowed origin from the configured base URL.

Full 566-test suite, root build and Linux contract verification passed during the
hero iteration. Updated UI tests (234) and Linux UI build passed after the second
section work. Later visual revisions passed demo builds, focused browser suites,
Biome, diff checks, and showcase privacy gates. See PR description for the final
full browser result. Five environment-specific live wallet/showcase/relayer tests
are skipped in a local demo and should not be described as verified live behavior.
Existing bundle-size warnings remain. Do not conflate earlier checks with a fresh
full Linux run of the final visual revision.

Local preview during this session: http://localhost:4187/ and /#app. It may need
restarting in another session. Build with npm run build --workspace
midnight-referendum-ui -- --mode demo, then npm run preview --workspace
midnight-referendum-ui -- --host localhost --port 4187 --strictPort.

## Preservation and release boundaries

The user authorized pushing this batch and creating a GitHub PR. This does not
authorize merging, Hostinger deployment, DNS changes, or later unrelated pushes.
Hostinger work is explicitly paused. Do not ask to deploy there in the next session.

Keep the pre-existing dirty Hostinger compose file untouched:
deploy/hostinger/rarimo-standalone/docker-compose.hostinger.cutover.yml
SHA-256: 458D25C9E9F2189442AFE3854319647BE4F3DE9F9B83547CA15A45E28D60FECB.
Also preserve the earlier untracked docs/SESSION-HANDOFF-2026-09-15.md, output/,
outputs/, qa/journey-20260901/, and research/landing/. These are excluded from this
PR. Raw generation outputs, QA captures and processing scripts remain local;
only selected production assets belong in the PR. Do not git add everything.
