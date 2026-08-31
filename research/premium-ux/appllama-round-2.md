# AppLlama round 2 — the five-position shell

Research date: 2026-08-31
Credits: 16 spent this session (1342 → 1326 remaining, allowance resets 1 September). Cap was 60.
Scope: extends `pattern-spec.md`, does not replace it. Round 1 walked Vivino / Visited / Scanner Pro / Authenticator / Payout. This round targets the questions the restructure into a five-position shell opened, and deliberately went to apps round 1 did not touch.

Screenshots studied are cached under the session scratchpad, not committed. AppLlama media carries a provenance watermark top-left; it is not part of any pattern described here and must never be reproduced.

---

## Board check (task 1)

`list_my_boards` returns exactly one board: **referendum.earth** (`6dbc4d67-872f-48ff-a110-07b72d91e281`), type `apps`, **1 item** — Vivino (`414461255`) and nothing else.

Round 1 already walked Vivino's 43 screens, so the board carried no new instruction. It was honoured rather than skipped: this round walked Vivino's **Cellar** flow (4 screens), which round 1 cited but did not mine for layout, and it turned out to be the single best reference for the credential card (see task 4). The rest of the round went outside the board because the board had nothing further to say.

---

## Task 2 — five positions with an elevated centre action

Apps and screens walked:

| App | Screen | Shape |
| --- | --- | --- |
| FloraSnap: Plant Scanner `6749177707` | `oth_ovdat` Home Dashboard, `oth_9ynhf` My Garden, `oth_1lj6b` Diagnose | **4 tabs + raised centre = 5 positions** |
| AntiqSnap `6752929120` | `oth_imexv` Identify Home | 2 tabs + raised centre |
| FoilSnap: TCG Card Scanner `6752642525` | `oth_gni56` My Collection | 2 tabs + raised centre |
| Bird Sounds Identifier `6449354786` | `oth_3yd0a` Collections Grid | 2 tabs + raised centre, notched bar |
| HoloDex — TCG Scan & Collect `6747442689` | `oth_pgpsv` Community Discover | **4 tabs + inline centre = 5 positions**, not raised |
| Element sweep: `tab-bars` / "Five-Tab Bottom Nav" | 511 screens; top 10 inspected (Cara Care, Phone Tracker `oth_vgy34`, Strong, Visited, FamilyAlbum, Stock Events, Dare, Flyer Maker, TrendTok, Feed Preview) | **five equal destinations, no centre action** |

### The dominant pattern

**The centre action never carries a label.** This is the one thing all six centre-action references agree on, without exception. Every flanking tab is labelled; the centre is icon-only. FloraSnap labels HOME / DIAGNOSE / GARDEN / SETTINGS and leaves the leaf FAB bare. AntiqSnap labels Home / My Collection and leaves the camera bare. HoloDex labels Home / Collectables / Portfolio / AI Grading and leaves the scan glyph bare.

**The icon names a mechanism, not a place.** Camera (AntiqSnap, FoilSnap), scan-frame brackets (Bird Sounds, HoloDex), brand mark (FloraSnap). Never a noun-place glyph. That, plus the missing label, is the whole of how these apps say "action, not destination" — there is no badge, no different shape language, no explanatory text.

**It never takes `aria-current` / a selected state.** In every screenshot the centre renders identically regardless of which tab is active. It has no "active" appearance because it is never a location.

**On tap it is a full-screen takeover that removes the tab bar.** FloraSnap `oth_p4rz6` Plant Scan Camera: black full-bleed, no nav, close **X** top-left in a translucent grey circle (not a back chevron — you escape an action, you don't retreat through it), flash toggle top-right, four corner brackets, a mode pill above the shutter, a large white shutter flanked by two smaller utility circles (gallery left, info right) at roughly 1.6:1 diameter. iScanner `1040093707/oth_j5ewu` ID Card Camera is the same grammar with an accent-coloured document-shaped guide rectangle instead of brackets. Nobody uses a bottom sheet for a capture action.

### Geometry, measured off the references

Measured on 1170×2532 captures (3× device scale), so figures below are in pt:

- Centre circle diameter: **60–64pt** (FloraSnap ≈ 63, FoilSnap ≈ 61, Bird Sounds ≈ 62).
- Amount protruding above the bar's top edge: **14–18pt**, i.e. roughly a quarter of the circle, not half. The circle's centre sits at or just below the bar's top edge.
- Separation from the bar: two techniques, both used. (a) **Ring** — a 3–4pt ring in the page ground colour around the circle (AntiqSnap, FoilSnap). (b) **Notch** — the bar's top edge curves down into a concave cradle around the circle (Bird Sounds, most pronounced; AntiqSnap secondary). FloraSnap uses a soft light halo instead.
- Flanking tab icons: 22–24pt. Labels 9–11pt, `600`. FloraSnap sets its labels ALL CAPS with letterspacing; the others use sentence case.

### Where the strong examples disagree

1. **Raised vs inline.** Four scanner apps raise the centre into a circle. HoloDex — which is also a scan-and-collect app, and which has our exact 4+1 layout — does **not** raise it. It keeps the glyph on the same baseline as the other four, renders it in the accent, sizes it ~1.35× the neighbours, and drops the label. That is enough. This is the cheapest possible version of the pattern and it reads correctly.
2. **Bar shape.** FloraSnap and HoloDex float a detached pill bar (HoloDex's is frosted/translucent over content). AntiqSnap, FoilSnap, Bird Sounds and every five-equal-tab app use a full-width seated bar. Both are current; the floating pill is the more "premium" register but costs bottom margin.
3. **How many destinations may coexist with a centre action.** The scanner apps that raise it keep destinations to **2**. FloraSnap keeps **4**. HoloDex keeps **4** but declines to raise. Nobody in the sample runs 4 raised + a wide bar comfortably except FloraSnap. **We are at the documented ceiling, and FloraSnap is our only direct precedent for it.**
4. **Active-tab indicator.** Colour + filled icon (FloraSnap, FoilSnap — same as ours); colour + a short bar above the item (Roame); a filled pill capsule behind the item (Phone Tracker). No consensus; ours is the most common.
5. **Five equal tabs is the majority pattern overall.** 511 screens carry a five-tab bar and the top-ranked ones have no centre action at all. The elevated centre is a scanner-app idiom, not a generic five-position idiom.

---

## Task 3 — scan once, own a reusable item

Journey walked end to end on FloraSnap (`Plant Identification` flow, 3 screens) plus iScanner's pre-scan and capture screens, cross-checked against Bird Sounds' save step.

**Before the scan — a framing screen, and it is dark.** FloraSnap `oth_p07mj` "Identify Tips": full-screen dark panel, one **good** example rendered large with a green check badge, then a row of **three bad** examples rendered small with red X badges, each named in one or two words — "Too close", "Too far", "Multiple species". One instruction line between them ("Place the plant in the center of the frame"). Single pill Continue. iScanner `oth_i8aw3` "Actions Scan Tips" does the same job with the same dark ground.

Two things this buys: the user learns the failure modes *by name* before they happen, so a later failure is recognisable rather than mysterious; and because the tips screen shares the camera's dark ground, the transition into capture is continuous rather than a flash from light to dark.

**During the scan — no fake progress.** Neither FloraSnap nor iScanner shows a percentage, a determinate bar, or a spinner over the viewfinder. The instruction is a single imperative line on a dark chip above the frame ("Fit the ID card into the borders and snap."), and the affordance is a real shutter. iScanner's mode rail names document types across the bottom — **QR CODE / DOCUMENTS / ID CARD / PASSPORT / AREA** — with the active one in accent plus a dot beneath, and a secondary pill toggle for the scan's own parameter ("One Side / Both Sides"). An info **(i)** circle bottom-right returns to the tips screen from inside the camera.

**After the scan — a review page, not a save.** FloraSnap `oth_86jcb` "Identification Results" is where the thing becomes ownable:

- Titled page with a back chevron (the *capture* was the modal; the *review* is a page in the flow).
- H1 "Select the best match" plus a subline explaining why a choice exists at all: "Your photo may match more than one plant. Choose the closest result to continue."
- The captured evidence shown large, a thumbnail strip of alternates beneath it, then the identity (name, scientific name, aliases).
- A short question label — "Are you looking for this plant?" — immediately above the actions.
- **Two full-width stacked actions with retry ABOVE confirm**: secondary "Identify again" (white card, accent text), then primary "Yes, that's my plant" (solid). Retry is a first-class peer, not a text link.

**The save itself is a sheet.** Bird Sounds `6449354786/oth_t6v92` "Save to collection": bottom sheet, X left, centred title, "Done" text action right in the accent, then rows of collections each with a leading tile, name, item count, and a `+` circle. Page behind fully dimmed.

**Disagreement:** FloraSnap makes the review a *disambiguation* (pick among candidates). Vivino's add-to-cellar (`414461255/oth_bm0py`) makes it a *quantification* (a stepper and option rows, then one black bottom CTA) with no candidate choice. Which applies depends on whether the scan can return more than one plausible result. A passport NFC read cannot, so the Vivino shape — confirm what was read, set nothing ambiguous, one primary action — is the closer fit, with FloraSnap's retry-as-peer borrowed into it.

---

## Task 4 — credential and pass collections

References: Vivino Cellar `414461255/oth_d2f3f` (Cellar Details), `oth_r00mk` (Cellar History), `oth_bm0py` (Add Bottles), `oth_itrbz` (Delete Selection); Roame — Award Travel `6466661045/oth_mj5ai` (Wallet Cards Empty), `oth_7rrg2` (Wallet Points Empty), `oth_ek2q9` (Wallet Add Menu); Bird Sounds `oth_3yd0a` (Collections Grid).

**The single credential card.** Vivino Cellar Details is the best model available. Structure: outlined card carrying thumbnail + issuer-ish line (small, above) + item name (bold) + origin with a **flag** mark; then a standalone **icon + value + label** row for the validity window — "2025 – 2033 / Recommended drinking window" beside a calendar icon. The validity is not a `<dt>/<dd>` pair buried in a facts list; it is promoted to its own row with its own icon, because it is the fact that decides whether the item is usable.

**Status is an event, not a chip.** Below the item, a `History` section lists plain rows — "Added 1 bottle" in the positive green, with a relative timestamp ("Just now") right-aligned. Status colour appears on the *event text*, not as a pill.

**Actions are a pinned footer pair, side by side.** Outlined secondary left ("Add bottles"), solid primary right ("Consume"), on a slightly raised footer surface with a rounded top edge and a soft shadow. Not two stacked full-width blocks.

**Empty state.** Roame `oth_mj5ai` is the strongest: a **line drawing of the missing object itself** (two card outlines with a `+`), a serif title naming the absence ("No Credit Cards"), a two-line grey subline that names *two* paths forward ("Get started by adding your card or apply for a new one"), then one full-width solid CTA. Crucially the summary strip above the collection **still renders, showing zeros** — the wallet's frame does not disappear because it is empty.

**"Replace this credential" is confirmed by an action sheet, not an inline expander.** Roame `oth_ek2q9`: iOS action sheet, the entire page behind dimmed including the tab bar, options as separate rows ("Add Credit Card" / "Add Loyalty Program" / "Edit Preferences"), a detached Cancel block below. Vivino's destructive variant `oth_itrbz` uses a rounded bottom sheet with checkbox rows and a single black bottom CTA — you *select what to remove* and confirm once, rather than confirming a blanket delete.

**Disagreement:** Vivino puts the add/replace actions in a **pinned footer on the item detail**; Roame puts them in a **pill in the page header** ("+ Accounts", top-right) *and* in the empty state's CTA, and reaches the multi-option case through an action sheet. Vivino's fits a single-credential product; Roame's fits a product where several kinds of credential coexist.

---

## Task 5 — map/list discovery with world-vs-country scope

References: Visited `846983349/oth_gf4bk` (Countries Map) re-examined for scope mechanics; Bird Sounds `oth_3yd0a` and FloraSnap `oth_9ynhf` for the segmented-control register.

**The scope switch floats over the map at the bottom, not above it.** Visited gives the map the entire canvas — search bar floating at the top, scope pill floating at the bottom just above the tab bar. The pill is a two-up segmented control ("Countries | Cities") with a solid dark fill on the selected half.

**The map states its own semantics with a legend.** Directly beneath the scope pill, a row of colour swatches with words: **Been / Want / Live / Lived**. The map's fills are never left to inference. This is the most transferable idea in this section: the fact that a colour on a map does not mean what a user might assume is solved by *saying what it means*, in a persistent legend, rather than by a caption or a disclaimer.

**Disagreement:** Bird Sounds and FloraSnap use a *pill-track* segmented control (white raised thumb on a grey track) for in-page switching, whereas Visited uses a *filled-half* pill, and Roame uses *underlined top tabs*. All three coexist. The underlined-tab variant reads as "these are views of one collection"; the pill-track variant reads as "these are filters". Scope is a filter; presentation is a view — so the two switchers in Discover arguably should not look alike.

---

## Task 6 — account and settings in wallet-shaped apps

References: Loopsy `6745416564/oth_1oast` (Settings, warm cream — closest palette match in the library to our tokens); Phone Tracker `1669041518/oth_vgy34` (Settings Menu, dark); FamilyAlbum `935672069/oth_osvf1` (Settings Overview, grouped rows); Roame `oth_mj5ai` header; Smart Noter `6739575916/oth_ok9cz` and Prehab `1626839977/oth_eadc2` for destructive rows in sheets.

**Address / identifier display.** The library is thin on true crypto wallets, and the semantic search for a truncated on-chain address returned nothing better than adjacent patterns. What the settings references *do* consistently show is the **value-on-the-right row**: Loopsy's "Profile → morriss.sun1", Phone Tracker's "Units → Imperial". A single-line row, label left, current value right in muted ink, chevron only if it navigates. No reference puts an explanatory `<small>` under every row.

**Network / status badging.** Where a status exists it is a right-aligned muted value on its own row, not a coloured chip. Coloured chips in these references are reserved for *earned* states (Pro, Ultra Rare) — not for network identity.

**Sign-out vs destructive deletion.** Phone Tracker is the clearest: "Sign In" and "Delete Account" are the **same row shape, same label colour, same chevron**. The only differences are (a) the leading icon tile is red for the destructive one, and (b) it is positioned last, after the legal rows. Red is confined to the icon; the label stays neutral ink. The row navigates to a confirmation rather than expanding inline. In sheet contexts (Smart Noter, Prehab) the destructive row *does* take a red label, but it is the last row of an action sheet where the surrounding rows are unambiguously actions.

**Group structure.** Loopsy: a muted grey section label sitting *above* a white rounded card; rows inside the card with **inset** dividers (starting after the icon column, not full-bleed); accent-coloured 24px line icons with no tile behind them. This is very close to what `ProfileView` already does.

**Disagreement:** icon treatment splits — Loopsy uses a bare accent glyph, Phone Tracker and FamilyAlbum use a rounded-square tile behind each icon. The tile version scales better when one row needs to be red, because the red lands on the tile rather than the label.

---

## Task 7 — motion and premium feel

From `list_ui_elements` (38 families) and `get_element_screens` on `sheets-modals` / "Sheet Drag Handle" (170 screens, 10 inspected).

- **Sheet anatomy is fixed across the library**: a dimmed backdrop over the *entire* screen including the tab bar, a rounded top (~28px) panel, and a **drag handle** — a ~40×5 muted pill, centred, ~10px from the top. Loopsy adds a circular close X at top-left *in addition to* the handle.
- **Sheets are used for choosing; full-screen modals are used for capturing.** Every camera reference is a full-screen takeover; every options/save reference is a sheet. Nothing in the sample opens a camera in a sheet.
- **Press feedback** in the captures is limited to scale on the raised centre control; nothing else animates. This matches the 120ms decision already in `pattern-spec.md`.
- **Celebration** appears only at genuine completion (FloraSnap's green check badge is on a *tips* illustration, not a result). No reference celebrates a capture; celebration is attached to the saved item existing.
- **The elevated centre control is the only element in a tab bar that ever gets a transition.** Everything else in the bar is instantaneous.

---

## Implementable changes

Each item names the file and the reference. None of these were applied — `ui/` is being edited by another agent.

### Shell / tab bar — `ui/src/views/Chrome.tsx`, `ui/src/views/chrome.css`

- [ ] **Drop the Verify label.** `Chrome.tsx` renders `<span>{label}</span>` for all five items including the action. Every centre-action reference is icon-only (FloraSnap `6749177707/oth_ovdat`, AntiqSnap `6752929120/oth_imexv`, FoilSnap `6752642525/oth_gni56`, Bird Sounds `6449354786/oth_3yd0a`, HoloDex `6747442689/oth_pgpsv` — 5 of 5). Keep the text in `aria-label` only, which `Chrome.tsx` already builds.
- [ ] **Grow the circle from 50px to 60px and reduce the lift.** `chrome.css` `.chrome-nav__item--verify .chrome-nav__icon` is `50px` with `margin-top: -25px` (a half-circle lift). References measure **60–64pt diameter protruding only 14–18pt** — about a quarter. Set `width/height: 60px; margin-top: -16px`. Per FoilSnap `oth_gni56` and Bird Sounds `oth_3yd0a`.
- [ ] **Keep the ground-coloured ring, and consider the notch.** The existing `border: 4px solid var(--ground)` is exactly AntiqSnap's and FoilSnap's separation technique — keep it. Bird Sounds `oth_3yd0a` additionally notches the bar's top edge into a concave cradle; that is the stronger read but needs an SVG or mask on `.chrome-nav` and is optional.
- [ ] **Raise the Verify icon to 28px inside the larger circle.** Currently 25px in a 50px circle. Reference glyphs occupy roughly 45% of the circle.
- [ ] **Take the action out of the tablist semantics.** `Chrome.tsx` renders all five in one `<nav>` with the action distinguished only by `aria-label`. No reference gives the centre a selected state, and ours cannot receive one either — make that explicit by rendering the Verify control as a sibling of the tab group rather than a member of it, so assistive tech never reads it as "3 of 5".
- [ ] **Consider swapping `Scan` for a camera or document glyph.** Phosphor `Scan` reads as a generic scan-frame, which is correct per Bird Sounds and HoloDex. AntiqSnap and FoilSnap use a literal camera, which is more explicit about "this opens the camera on a physical document". Either is defensible; a place-noun glyph is not.

### Verify journey — `ui/src/components/passport-v2/PreviewPassportJourney.tsx`

- [ ] **Add a pre-scan framing step with named failure modes.** The journey's first stage is `consent`. FloraSnap `6749177707/oth_p07mj` and iScanner `1040093707/oth_i8aw3` both put a dark tips screen first: one good example large with a positive badge, three bad examples small with negative badges, **each named** ("Too close", "Too far", "Multiple species"). For a physical passport the three named failures are the ones a user will actually hit — glare on the laminate, the wrong page, and moving the phone before the NFC read completes.
- [ ] **Give the capture step a close X, not a back chevron.** FloraSnap `oth_p4rz6` and iScanner `oth_j5ewu` both use a circular X top-left. You escape an action; you do not retreat through it. Check what `JourneyTopBar` currently renders.
- [ ] **Do not add determinate progress to the enrollment wait.** `PREVIEW_SCREENS` already uses a four-step segmented indicator for the *journey*, which is right. Inside the capture/wait itself, no reference shows a percentage or a determinate bar — iScanner and FloraSnap show an instruction line and nothing else. `pattern-spec.md` already forbids fake percentages; this round confirms it against two more apps.
- [ ] **Make retry a full-width peer of confirm at the credential step, stacked above it.** FloraSnap `oth_86jcb` puts "Identify again" (outlined) directly above "Yes, that's my plant" (solid), with a short question label above the pair. Currently retry, where it exists, is not at this weight.

### Credentials — `ui/src/views/CredentialsView.tsx`, `ui/src/views/credentials-view.css`

- [ ] **Render the expiry. It is currently dropped entirely.** `CivicCredentialSummary` (in `ui/src/integration/cico-passport-journey.ts`) carries `validUntil` and `assurance`; `CredentialsView` renders only `issuer`, `ageClass` and a constant "Use" string. Vivino `414461255/oth_d2f3f` promotes the validity window out of the facts list into its own **icon + value + label** row ("2025 – 2033" over "Recommended drinking window", beside a calendar icon), because validity decides usability. Give `validUntil` that treatment above the `dl`.
- [ ] **Pair the two actions in a pinned footer instead of stacking two full-width blocks.** Today "Renew or replace" (secondary) sits inside the card and "Add eligibility" (primary) sits below it, both full-width. Vivino `oth_d2f3f` pins an outlined-secondary + solid-primary pair side by side on a raised footer with a rounded top edge. This also removes the current oddity where both buttons call the identical `onVerify`.
- [ ] **Replace the empty-state icon with a drawing of the missing pass.** `EmptyState` takes `icon={<IdentificationCard size={30} />}`. Roame `6466661045/oth_mj5ai` draws the absent object itself as line art at roughly 3× that size, above a serif title naming the absence and a subline naming two paths forward. `sys-empty__icon` supports this without a component change — only the passed node and its size change.
- [ ] **Move "add another" into the page header as a pill.** Roame `oth_mj5ai` puts "+ Accounts" top-right in the header row, leaving the bottom for the primary CTA. `credentials__head` currently holds only Eyebrow/Display/lead.
- [ ] **Route replacement through a dimmed action sheet.** Roame `oth_ek2q9` confirms a replace/add choice in an action sheet over a fully dimmed page, with a detached Cancel. Currently `onVerify` fires straight into the whole journey with no confirmation that an existing pass is about to be superseded.

### Discover — `ui/src/views/VotesView.tsx`, `ui/src/views/votes-view.css`

- [ ] **Add a legend to the map instead of relying on the caption.** `discover-map__caption` currently carries "This does not prove eligibility." as a `<small>`. Visited `846983349/oth_gf4bk` keeps a persistent swatch+word legend (Been / Want / Live / Lived) directly under the scope control, so the map's colours never have to be guessed. A two-item legend — "Browsing" vs "Eligible" — states the world/country distinction structurally rather than as a disclaimer.
- [ ] **Differentiate the two segmented controls.** `votes__scope` and `votes__view-switch` are two adjacent `role="tablist"` rows that currently look alike, which reads as one four-or-five-way control. Per task 5: scope is a *filter* (pill-track, per Bird Sounds `oth_3yd0a`), presentation is a *view* (underline tabs, per Roame `oth_mj5ai`). Making them different shapes removes the ambiguity without adding a control.
- [ ] **Consider floating the scope control over the map rather than stacking both above it.** Visited `oth_gf4bk` gives the map the full canvas and floats the scope pill at the bottom. Lower priority — it is a layout change, not a correctness one.

### Passport — `ui/src/views/ProfileView.tsx`, `ui/src/views/profile-view.css`

- [ ] **Drop the per-row `<small>` hints; use value-on-the-right.** Every `profile__row--action` renders `<strong>` + `<small>`. Loopsy `6745416564/oth_1oast` and Phone Tracker `1669041518/oth_vgy34` use single-line rows with the *current value* right-aligned in muted ink and no explanatory subtext. Keep the hint only on the two rows where the consequence is genuinely non-obvious (lock, remove).
- [ ] **Move red off the destructive label and onto a leading icon tile.** `profile-view.css` colours `.profile__row--danger strong` and its `svg` in `--danger`. Phone Tracker `oth_vgy34` keeps the destructive label in neutral ink and puts red only on the leading icon tile, keeping the row visually identical to its neighbours. This also requires adding icon tiles to the rows, matching FamilyAlbum `935672069/oth_osvf1`.
- [ ] **Order the destructive row last, after help and legal.** Currently "Remove local data" sits in a `Session` group above nothing. Phone Tracker places Delete Account after Terms / Privacy / Community Guidelines, as the final row on the screen.
- [ ] **Give the inline remove-confirm a drag handle if it becomes a sheet.** If `profile__remove-confirm` moves out of the card, every sheet in `sheets-modals` (170 screens) carries a ~40×5 centred handle plus a dimmed full-page backdrop. Vivino's destructive variant `414461255/oth_itrbz` goes further and makes the user *select what is removed* before confirming once.

### Cross-cutting

- [ ] **`prefers-reduced-motion` must also neutralise the centre control's press scale.** `tokens.css` collapses `--dur-press` to 1ms, which stops the *duration* but leaves `transform: scale(0.96)` applying instantly. Add an explicit `transform: none` for `.chrome-nav__item--verify:active .chrome-nav__icon` under the reduced-motion query.

---

## Actively wrong in the current build

1. **The Verify control is labelled.** Five of five centre-action references drop the label. With a label under a raised circle it reads as a fifth *destination* that happens to be styled loudly — which is precisely the meaning the restructure was trying to avoid. This is the single highest-value fix in this document.
2. **The Verify control is a member of the tab group.** In `Chrome.tsx` it is the third of five `<button>`s inside one `<nav>`, differing only in `className` and `aria-label`. It can never take `aria-current`, so screen-reader users are told there are five navigation items of which only four are ever current. No reference treats the centre as a peer of the tabs.
3. **Tapping Verify replays the entire onboarding, consent step included.** `App.tsx:570` sets `passportJourneyOpen = true`, which mounts `PassportJourney` at stage `consent` — the same entry point as first-run onboarding, and it also hides the header and the whole nav. A returning user who already holds a pass and taps the centre action is re-asked for consent before reaching anything resembling a scan. Every scan reference goes from the centre control **directly to capture** (via tips at most), never back through account consent.
4. **`validUntil` and `assurance` are captured and then discarded.** They exist on `CivicCredentialSummary` and never reach the screen. Vivino promotes exactly this fact to its own row. A credential card that shows issuer and age class but not expiry is showing the two least decision-relevant facts it holds.
5. **Both credential buttons do the same thing.** "Renew or replace" and "Add eligibility" both call `onVerify` with no distinguishing behaviour and no confirmation, so the destructive reading (replace) and the additive reading (add) are the same click. Roame `oth_ek2q9` disambiguates exactly this with an action sheet.
6. **The two Discover segmented controls are visually identical and adjacent.** Two `role="tablist"` rows in the same shape, stacked, controlling different axes. Nothing in the references stacks two identical switchers.
7. **The disclaimer is doing a legend's job.** "This does not prove eligibility" as a `<small>` inside the map caption is a disclaimer bolted onto a visual whose semantics were never stated. Visited states map semantics positively and persistently in a legend.
8. **Reduced motion does not actually stop the centre control's movement** — see the cross-cutting item above. It is the one transform in the shell and the one the guard misses.

---

## Saturation

The five-position question reached saturation quickly: after FloraSnap, AntiqSnap, FoilSnap, Bird Sounds and HoloDex the only remaining variable was raised-vs-inline, and the 511-screen five-tab sweep settled the base rate. The scan-to-own journey saturated after FloraSnap plus iScanner plus Bird Sounds' save sheet — the three-beat structure (framed tips → dark capture with no fake progress → review with retry as a peer) repeated without variation. The wallet-address question did **not** saturate and could not: the library is consumer top-grossing apps and holds almost no true crypto wallets, so the recommendations in task 6 are drawn from general settings-row grammar rather than from a wallet that displays an on-chain address. That is the one area where a different source would beat more AppLlama credits.
