# Mascot integration design QA

## Comparison target

- Source visual truth: `C:/Users/tomas/Downloads/capy.jpg`
- Rendered welcome: `qa/mascot-welcome-390x844.png`
- Rendered credential success: `qa/mascot-success-390x844.png`
- Full-view comparison: `qa/mascot-full-view-comparison.png`
- Focused comparison: `qa/mascot-focused-comparison.png`
- State: Spanish demo onboarding, welcome and synthetic credential-success stages.
- Viewport override: 390 × 844 CSS px.
- Browser-reported viewport: 390 × 844 CSS px at device pixel ratio 1.
- Exported implementation screenshots: 375 × 811 px after the in-app browser's
  capture normalization.
- Source photo: 4000 × 3000 px with EXIF orientation applied for comparison.
- Production mascot PNGs: 1024 × 1024 px, RGBA, alpha extrema 0–255.

The source is a photographed physical sticker rather than a screen mock. The
comparison therefore treats character identity, art direction, crop, and mood
as visual truth while preserving the app's existing layout and design tokens.

## Full-view comparison evidence

`qa/mascot-full-view-comparison.png` places the oriented source photo beside the
rendered welcome and success screens. Both integrations preserve the card's
existing hierarchy and keep the primary action visible. The welcome mascot is
clearly secondary to the privacy explanation; the success mascot supports the
state without displacing the credential summary.

## Focused comparison evidence

`qa/mascot-focused-comparison.png` places the source character beside the two
browser-rendered mascot crops. The generated family retains the golden-yellow
body, muted muzzle and paws, black dot eye, short limbs, rounded proportions,
hand-drawn dark linework, coral accent, white sticker edge, and calm expression.
The focused region is sufficient because the task changes only the mascot asset
and its reserved onboarding slots; no typography, navigation, or layout redesign
was requested.

## Required fidelity surfaces

- Fonts and typography: unchanged from the existing product. The mascot contains
  no text, and the two new Spanish alternative-text strings are localized.
- Spacing and layout rhythm: the responsive `lg` size remains within the intended
  96–180 px UI reading range after transparent padding. No mascot is cropped, the
  welcome CTA remains above the fold, and the success summary keeps its prior
  vertical order.
- Colors and visual tokens: the amber, taupe, coral, and soft green illustration
  palette matches the source family and sits comfortably against the app's warm
  neutral card and blue action system. Existing UI tokens are unchanged.
- Image quality and asset fidelity: every delivered asset is a square 1024 px
  transparent PNG. Alpha was validated programmatically and both rendered states
  show clean edges without a checkerboard, background box, stretching, or visible
  halo. The reference's quiet paper texture remains legible at UI scale.
- Copy and content: no generated image contains words, marks, or logos. The mascot
  remains absent from privacy, eligibility, dashboard, and ballot-adjacent states.

## Interaction and console checks

- Tested the complete local demo path: welcome → privacy → Passport demo →
  consent return → eligibility → country selection → credential success → civic
  dashboard.
- Confirmed zero `[data-mascot]` elements on privacy and eligibility stages and
  after onboarding completion.
- Confirmed semantic localized image labels on welcome and credential success.
- Checked warning and error console output after both rendered mascot states:
  none recorded.

## Findings

No actionable P0, P1, or P2 mismatch was found.

Residual test gap: reading, thinking, climbing, and waiting are production assets
exposed by the component but are not yet placed in a live product state. Their
RGBA channels and dimensions were validated, and the component API covers them;
their final page-level scale should be checked when those states are introduced.

## Comparison history

- Pass 1: no actionable P0/P1/P2 differences. No visual fixes were required after
  the browser-rendered comparison. Earlier background-extraction and square-canvas
  normalization happened before this QA pass and were validated in the final
  evidence above.

## Implementation checklist

- [x] Replace welcome placeholder with the waving variant.
- [x] Replace credential-success placeholders with the achievement variant.
- [x] Keep mascot out of consent, privacy-decision, eligibility, and ballot states.
- [x] Validate accessible semantic and decorative usage.
- [x] Validate transparent square PNG output and responsive rendering.
- [x] Test the complete onboarding path and console.

## Follow-up polish

- When Explore / FAQ or enrollment-pending screens are implemented, place the
  reading or waiting variants through the existing component rather than adding
  new ad hoc image markup.

final result: passed

