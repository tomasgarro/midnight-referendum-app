# Simulated Passport and Discover update

## What changed

- The centre action in demo mode opens the physical-passport introduction directly. A prominent simulated-pass option opens its own country and age screen.
- France, Argentina, Switzerland, Italy and Spain are immediately available. **More countries** searches the complete country catalogue. Age accepts whole numbers from 1 to 120; the pass retains only the age class, not the exact age.
- An unexpired simulated pass enables the robot/dialogue action in demo mode. It remains synthetic, never becomes a verified credential, and cannot enable this shortcut in a live runtime. Real provider verification is unchanged.
- Discover initially uses the pass country. Switzerland has three fictional consultations (regional transport, housing and nature), with additional Italian transport and Spanish water-use mockups. Global consultations remain accessible through the place selector and are included in catalogue chat.
- Image-led cards use a horizontal scroll-snap row on phones, including a next-card preview, position indicator and previous/next controls. Swiping browses cards; it never casts a vote. Desktop keeps a grid.
- Subject filters narrow the chosen country catalogue. Cards support decorative images and optional, user-controlled video with caption tracks. This batch ships still artwork; no stock footage or fake play button is included.
- The Swiss transport cover is original generated editorial artwork. Its WebP is about 302 KB. The other covers use existing landscape artwork or subject illustrations.
- Synthetic voting checks age class, expiry and country at the action boundary. Under-18 demo passes can browse and chat, but cannot participate in the 18+ demo consultations.

## References

Studied the AppLlama discovery results in `research/dashboard/discover-board.png`: the clearest patterns were Muse's carousel feed, ReShoot's topic chips and horizontal covers, and Temply's editorial discovery rows. Applied their layout principles within Midnight's existing gray palette and type system.

- [Muse](https://appllama.io/apps/1638320348/muse-reels-video-editor)
- [Temply](https://appllama.io/apps/1538145481/temply-ai-video-reels-maker)
- [ReShoot](https://appllama.io/apps/6751296351/reshoot-ai-face-photo-editor)

## Review artifacts

- `outputs/demo-pass-390.png`
- `outputs/swiss-cards-390.png`
- `outputs/discovery-browser.log`
- `outputs/discovery-final-tests.log`

## Validation

- 246 UI/unit tests passed; TypeScript, changed-file Biome checks and demo build passed.
- 30 distinct browser checks passed across the regression and final targeted runs; three live/showcase-only cases were skipped in demo mode.
- Covered Swiss creation, under-18 restrictions, invalid ages, additional-country search, Back preserving choices, country-aware dialogue, subject filters, actual touch swipes and keyboard-compatible navigation controls.
- Reviewed 390 px light and 320 px French dark cards, with the existing 320/390/768/1440 dashboard and onboarding matrix also passing.
- Fixed inherited column flex direction that initially inflated the horizontal cards, and made the new country-sheet radio input cover its full touch row.
- Final motion capture: `outputs/swiss-discovery-review.webm`. Build retains the existing large-chunk warning. No live document or network transaction was executed.

All additional consultations are product mockups, with no official status, real participation figures or policy claims. Runtime catalogues do not merge these fixtures. No deployment or backend migration is part of this update.
