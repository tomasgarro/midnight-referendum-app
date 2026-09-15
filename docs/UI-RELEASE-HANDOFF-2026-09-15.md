# UI release handoff — 15 September 2026

## Continue here

Branch: `feat/landing-and-passport-ui`, based on `572f79fb87d0f521f0d38c1cbf65179fbfefe1ce`.

The landing page now has a cream hero, floating navigation, Midnight artwork,
responsive three-step privacy story, Humans/Agents section, Midnight City
connection, closing invitation and footer. The app lives at `/#app`; internal
landing anchors preserve scroll. Desktop story panels advance and reverse with
native scroll; mobile and reduced-motion users get a linear layout.

The old landing mascot is removed. `data-art-slot="future-mascot"` reserves the
closing illustration for the replacement; onboarding keeps its existing mascot.
Passport connection is distinct from eligibility. Physical passport proof,
AI summaries and agent participation remain explicitly illustrative or planned.
Civic Pulse is a secondary, in-memory human demo inside Discover.

## Validation

- `npm test`: 529 tests passed across all packages.
- `npm run build`: passed; existing large runtime chunk warnings remain.
- Biome: zero errors after adding the imported SVG title.
- Six landing browser checks passed before release preparation: 320/390px
  onboarding, reduced motion, pinned forward/reverse scroll, navigation layering,
  Humans/Agents toggle and footer.

## Hostinger release

The previously recorded synthetic site is
`https://lightskyblue-emu-103266.hostingersite.com/`.
The Hostinger website-list endpoint returned HTTP 500 twice during this release,
so destination account ownership could not be revalidated and no upload occurred.
VPS inventory was readable, but the VPS is not the static UI target.

Prepare a static demo build with live service URLs empty, run
`npm run verify:showcase`, and archive the contents of `ui/dist` with
`index.html` at ZIP root. Record source commit and ZIP SHA-256 together.
Keep archives and local logs out of git. Once website inventory works, verify
the existing destination/account, upload the reviewed artifact, compare served
entry assets, and smoke-test the landing plus `/#app` on HTTPS. Retain the prior
archive for rollback. DNS, VPS services and public domain cutover are separate.

## Next iteration

Inspect the dirty tree before editing. Older Hostinger cutover scripts,
`relayer/src/register-dust.ts`, local QA, research and output files were preserved
outside this PR. Do not bulk-stage or discard them.

Start with a visual review of the complete landing and mobile onboarding.
Integrate the new mascot only after it is provided; polish spacing, story motion
and copy in small reviewable passes. Preserve Passport origin/network/nonce
checks and the distinction between demo receipts and live proof. Verify changes
locally before publishing. Ask before further push, deployment or DNS changes.
