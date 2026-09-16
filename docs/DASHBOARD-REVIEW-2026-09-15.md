# Dashboard revision — 15 September 2026

## Delivered

- App-scoped warm gray surfaces, charcoal actions, Outfit typography, quieter borders and consistent dark mode. The landing remains unchanged.
- A wider desktop canvas, readable navigation labels, official Midnight symbol, consistent consultation cards and public catalogue entry.
- The centre navigation action becomes a robot / Ask Midnight only for an unexpired verified credential. Synthetic demo credentials and an account connection alone do not trigger it. Verification remains available from Credentials and Passport.
- Catalogue chat lists currently open global and country consultations, returns authored project summaries and arguments/uncertainties, and opens the existing consultation detail. Back preserves the conversation. Unsupported questions receive a bounded explanation; invented projects are not matched to an unrelated previous answer.
- Unverified users can use the public catalogue entry. Browsing a country never creates a credential or establishes eligibility.
- Civic Pulse now presents three thoughtful questions, a review and a quiet completion. Large answer rows, visited-screen Back, optional skips, editable answers and stable bottom actions replace the long promotional page. English, Spanish and French are supported throughout.
- Credentials, activity, Passport, settings and verification inherit the same app palette. Existing connection, verification, voting, receipt and session adapters remain in place.

## AI boundary

As requested, this is catalogue chat now; connect a server-side AI provider later. Responses are deterministic excerpts from the published catalogue, not model-generated answers. The UI states this. Only a verified country is used for the default country scope. No document details or Civic Pulse answers are supplied to the guide. Chat stays in runtime memory and clears on reload, Clear chat, disconnect or local-data removal. It is retained when opening and returning from a consultation.

## Design references

Reviewed the supplied screenshots and twenty additional Purpose screens through the AppLlama MCP. The useful patterns were one question per screen, short supporting copy, segmented progress, generous answer targets and restrained illustration placement. Midnight retains its own typography, mascot and palette.

- [Purpose AI — reference flow](https://appllama.io/apps/6749098156/purpose-ai-mentor-coach)
- [Duolingo — expression and pacing reference](https://appllama.io/apps/570060128/duolingo-language-lessons)
- [Flo — privacy and explanation reference](https://appllama.io/apps/1038369065/flo-cycle-period-tracker)
- Local contact sheet: `research/dashboard/purpose-board.png`.

## Validation

- Full UI suite: **242 tests passed**. The six catalogue/nav boundary tests were rerun after the final answer formatting change and passed.
- TypeScript project check, changed-file Biome checks, demo production build and `git diff --check` passed. Existing large-bundle and generated sourcemap warnings remain.
- Dashboard browser checks: **5 passed**, covering 320, 390, 768 and 1440 px, EN/ES/FR, light/dark, reduced motion, all four navigation destinations, question selection/Back/skip/completion, catalogue summary/follow-up/detail/Back/clear and a shortened composer viewport.
- Existing Passport journey checks: **6 passed**, **3 mode-specific checks skipped**. They cover local-only reflection, simulated voting/receipts, multilingual layouts, no demo runtime requests and an actual browser popup handshake.
- Existing onboarding-v3 checks: **15 passed**, including the multilingual width matrix, defer/resume, nested Back, reduced motion, enlarged text and provider response boundaries.
- Visually reviewed mobile chat, questionnaire, Discover, credential and Passport screens, settings, and sampled flow recordings. Corrected compressed cards, double page scrolling, selection contrast, loading-theme continuity and chat input focus styling during review.

## Review artifacts

- `outputs/dashboard-320-en.png`, `outputs/dashboard-390-es.png`
- `outputs/dashboard-chat-mobile.png`
- `outputs/reflection-320-en.png`, `outputs/reflection-390-es.png`
- `outputs/dashboard-reflection-review.webm`, `outputs/dashboard-chat-review.webm`

Browser tests use the local demo catalogue and mock/provider test fixtures. They do not prove a live physical-passport verification or deployed network transaction. The shortened viewport approximates keyboard space; it is not a test on a physical phone keyboard. No deployment or backend migration was performed.
