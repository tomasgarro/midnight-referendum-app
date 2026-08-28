# Wave 1 onboarding pattern notes

These notes record durable interaction patterns, not brand assets or exact screen copies.

## Layout grammar

- Start with an uncluttered warm surface and a single clear promise.
- Keep one job per screen: explain, request consent, return the consent result, prepare evidence, choose a demo fixture, or confirm success.
- Use a large readable heading, short supporting paragraph, and one dominant action near the lower edge of the mobile viewport.
- Keep secondary navigation quiet and available for read-only exploration.
- Use rounded cards only when grouping information; avoid decorative containers around every line.

## Trust and identity

- Explain the separation between Passport identity, eligibility credential, and civic response before opening a provider handoff.
- Show requested and explicitly not-requested fields before consent.
- After return, summarize what was approved instead of inferring nationality, age, or voter identity from a profile.
- Introduce wallet capability at the live action boundary, not during first-run education or ordinary browsing.

## Progress and recovery

- Progress is visible but subordinate to the content; technical vocabulary stays out of the user-facing journey.
- Focus moves to the new heading after a stage change.
- Popup denial, closure, timeout, blocked popup, and malformed return remain on the same stage with a retry action.
- Success receives a dedicated transition and an explicit synthetic/live truth label.

## Responsive and accessibility rules

- Target 320px and 390px first, then scale to tablet and desktop.
- Use a documented 4/8px spacing rhythm, 44px minimum controls, visible focus, semantic status colors, and no horizontal overflow.
- Reduced motion collapses stage transitions into fades and avoids reliance on animation for meaning.
- Country selection is global and searchable/localized; Argentina is only the default synthetic fixture.

## Applied decisions

- The first-run flow is now designed as Welcome → privacy lesson → Passport → consent return → eligibility lesson → demo country → credential success.
- The dashboard owns World/Countries exploration; consultation detail precedes any action.
- A future capybara illustration may occupy the success/lesson illustration slot, but no third-party image is a Wave 1 dependency.
