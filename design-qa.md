# Landing design QA - 2026-09-15

Status: passed for local review.

## Visual review

Compared the supplied step-layout reference with the updated implementation in
`outputs/passport-hero-20260915/section-comparison.jpg`. The comparison includes
both centered headline states and the controls above the illustration.

Reviewed neutral, center and palm reveal screenshots, plus mobile layouts in
`outputs/passport-hero-20260915/revision-tests/`. Settled step captures and reversible
headline captures are in `outputs/passport-hero-20260915/visual-review/`.

Observed: clean hero without wrist captions, larger palm reveal, softly fading
wrist edge. Official logo remains an SVG overlay with unchanged geometry. No
visible human/robot ghosting in reviewed states. Large centered section headline
has no kicker or subheading. Step controls sit above the artwork below navigation.
Cream canvas and illustrations remain consistent with the accepted direction.
Mobile keeps static artwork and a linear step sequence; reduced motion stays readable.

## Verification

- Browser suite: 18 passed; 5 live-service/showcase-specific tests skipped.
- Additional settled desktop visual test: passed.
- Windows and Linux UI tests: 234 passed on each.
- Windows and Linux demo build: passed; existing bundle-size warning remains.
- Showcase privacy gate: passed (11 text assets).
- Biome: 11 changed source/test files checked and formatted.
- git diff --check: passed.
- Original Hostinger compose hash unchanged:
  458D25C9E9F2189442AFE3854319647BE4F3DE9F9B83547CA15A45E28D60FECB.

The earlier CI onboarding failure was reproduced as cold Vite development
transforms. Playwright now previews the production demo while preserving the
10-second assertion. Civic Pulse's privacy test derives its allowed origin from
baseURL, preserving its no-external-request assertion when testing another port.

## Boundaries

The full 566-test verification and Linux contract compilation passed before this
UI-only revision; updated Linux UI build and tests passed afterward. Five browser
tests require environments outside this local demo and were skipped.

Gradient exploration remains for a later review. Hostinger work is paused by the
user. No push, deployment, DNS, live wallet or live relayer action was performed.

## Mountain finish and shared arrow motion

Implemented the next user review: all actionable northeast arrows across the
landing hero, navigation, steps, future section, invitation, and footer rotate
45 degrees to point right on hover and keyboard focus, then reset. Existing color
and gap changes remain. Reduced-motion users receive no arrow rotation or transition.

Removed the invitation kicker, explanatory paragraph, and large moon illustration.
The invitation now centers above an original illustrated mountain panorama, fading
from cream/lavender into a dark plum footer with light text. Footer links and labels
remain. The empty future-mascot art slot is preserved within the landscape.

Asset: ui/public/art/landscape/midnight-mountains.webp, 1536x1024, 77,832 bytes.
Generated using the built-in image tool: original painterly dawn alpine valley,
layered lavender/slate ridges, mist, drawn pine forests, cream sky, dark plum
foreground; no text, moon, people, buildings, or logos. Inspired by the user's
landscape examples without copying the stock artwork. PNG original remains at
C:/Users/tomas/.codex/generated_images/01a0a52a-d3ff-7761-8c90-16a3281d0e9b/exec-7e6d8080-df87-427a-ab4e-506b948bbb74.png.

Validation for this iteration: demo production build passed; 8 targeted browser
checks passed (390/1440 arrow hover-reset-focus, reduced motion, image loading,
footer links and overflow, 320/390 onboarding, reversible steps and navigation).
Showcase privacy gate passed. Biome and git diff checks passed. Visual screenshots
in outputs/passport-hero-20260915/mountain-tests/ confirm clean footer blending
and readable mobile navigation. Prior Linux/unit results above predate this visual
iteration and were not unnecessarily rerun. No push or deployment performed.

## Selective disclosure and Midnight City review

Privacy outro: removed top border, increased 15px text to 17.25px, changed to
Georgia italic (local system serif; no extra font request). Bottom section change
remains. Human copy now explicitly describes future citizenship proofs (Argentina,
Italy or elsewhere), verified-citizen conversations, opt-in attribute-based
consultations including gender, and AI summaries/presentations/research about
local politicians and national issues with sources. These are labelled On the
horizon, separate from Try it today.

Replaced the orbit illustration with a native CSS/React concept scene: private
fields remain masked, only a requested citizenship attribute is shared, followed
by conversations and sourced briefings. Intro animation runs once on mounting;
reduced motion disables it. Visual remains decorative and does not claim live
verification or send data.

Replaced the agents image with the supplied midnight-city-platzi.png, edited by
ImageGen to remove the bottom Enter the city button/frame/glow and fill it with
foreground rocks and foliage. Preserved the poster title and upper branding. The
original is untouched. New asset: ui/public/art/city/midnight-city-without-button.webp,
1122x1402, 255516 bytes. Generated PNG: exec-a90d5ac0-df07-4162-add5-a40a464781d4.png
in the thread's generated_images directory. Portrait artwork is shown uncropped.

Validation: demo build passed; all 10 targeted landing browser tests passed,
including 320/1440 human/agent panels, asset loading, italic size and border,
reduced motion, 320/390 onboarding, arrows, navigation and footer. Showcase gate
passed (11 assets); Biome passed (6 files); git diff check passed. Screenshots and
logs: outputs/passport-hero-20260915/disclosure-tests/. Browser visual inspection
confirmed balanced desktop human and agent compositions. No publishing performed.

## Compact audience panels

Moved Humans/Agents controls beside the section heading on desktop, stacking them
below the heading at mobile widths. Shortened the future-feature copy and human
introduction while retaining citizenship, opt-in attribute consultations and AI
research. Both artworks now have a 380px maximum width; tightened disclosure-card
padding and spacing. Removed the city caption block; its portrait remains uncropped
and below 480px high on desktop. Section padding and type spacing are more compact.
Privacy outro now uses the bundled Fraunces font (Landing Editorial), italic 350,
21-26px responsive size, raised 6px; no external font request or new divider.

Compact-panel validation: final demo build passed; 4 focused browser tests passed
at 320/390/1440 widths, including the new privacy type sizes, absent city caption,
city height cap, reduced motion and existing arrow/footer interactions. The first
run caught an unchanged old font rule; corrected it and reran successfully.
Showcase gate and formatting passed. Desktop visual inspection confirms the
right-aligned switch and tighter panel. No push or deployment.

## GitHub PR preparation

Final combined browser suite: 22 passed, 5 environment-specific tests skipped
(outputs/passport-hero-20260915/pr-final-tests.log). All 20 staged code/config/test
files pass Biome; staged diff check passes. User authorized pushing this landing
batch and opening a follow-up PR. Hostinger remains paused and excluded.
Next-session handoff: docs/SESSION-HANDOFF-LANDING-TO-ONBOARDING-2026-09-15.md.
