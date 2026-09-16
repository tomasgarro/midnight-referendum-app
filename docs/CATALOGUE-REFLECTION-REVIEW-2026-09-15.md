# Discover, Ask Midnight and Civic Pulse revision

## Delivered

- Discover always renders Global first, followed by the selected country. Each section has its own swipe rail and previous/next controls. One subject filter applies to both; empty filtered sections remain labelled.
- The centre navigation action retains the official Midnight symbol, including when it opens Ask Midnight. Demo access remains separate from real verification.
- Ask Midnight adds Places/Topics prompt groups, climate/economy/housing/transport filters, Bitcoin aliases, contextual arguments, uncertainty, authored context and clickable primary-source links.
- A short, interruptible retrieval indicator precedes answers; paragraphs enter gently. Reduced motion reveals immediately. Clear cancels pending work. This remains deterministic catalogue retrieval, with an explicit disclosure that generative AI is not connected.
- Civic Pulse adds optional deficit tolerance and funding questions, with no preselected answer. GDP is explained, economic conditions are stated, and uncertainty is a legitimate response. Back/edit/skip preserve or clear choices explicitly. No score, political label, backend submission or persistent storage was added.
- Added three source-backed editorial mock consultations: Swiss Bitcoin reserves, global repair rights, and Spain’s water digitalisation. Existing fictional country concepts remain available.

## Research

Studied 20 additional AppLlama chat screens, plus the existing 20-screen Purpose AI questionnaire board. Local boards: `research/dashboard/chat-board-0.png`, `chat-board-1.png`, `purpose-board.png`.

Patterns used: Craft’s concise task starters; Notee’s compact response/action separation; Proactor’s visible retrieval state and suggestions; Chat AI’s prompt categories; Purpose’s segmented progress and one-question rhythm. No watermark, competitor copy or paid-service claims were copied.

- [Craft](https://appllama.io/apps/1487937127): `oth_1b9u5`
- [Notee](https://appllama.io/apps/6745517667): `oth_h9vrz`, `oth_7as41`
- [Proactor](https://appllama.io/apps/6747657380): `oth_daw8c`, `oth_lat8i`, `oth_7wbop`
- [Purpose](https://appllama.io/apps/6749098156/purpose-ai-mentor-coach)

## Real-topic sources and limits

Reviewed 15 September 2026. App questions, open/close dates and participation are demonstration content, not official ballots.

- [Federal Chancellery initiative 568](https://www.bk.admin.ch/de/details-volksinitiativen?initiative=568): official register linked for procedural updates. Its dynamic detail content could not be fully read during this review, so no current qualification, signature total, vote date or enactment is asserted.
- [Bitcoin initiative committee FAQ](https://initiativebtc.ch/en/faq/): proponents’ proposal and diversification argument; identifies no fixed allocation. This advocacy source is labelled as such.
- [SNB reserve objectives](https://www.snb.ch/en/the-snb/mandates-goals/investment-assets): liquidity, diversification and long-term value preservation. The mock frames the tradeoff without investment advice or invented returns.
- [Council of the EU, 30 May 2024](https://www.consilium.europa.eu/en/press/press-releases/2024/05/30/circular-economy-council-gives-final-approval-to-right-to-repair-directive/): adopted repair directive and its limited product scope. The global app question is a discussion inspired by this policy, not a claim of worldwide legal rights.
- [MITECO water programme](https://www.miteco.gob.es/es/agua/temas/pertes.html): digitalisation, innovation and training. No measured water savings or current funding totals are invented.

## Boundaries

Real provider adapters and runtime catalogues do not receive demo fixtures. Existing age, country and expiry checks remain. The accepted landing and unrelated deployment edits were preserved. Nothing was published or deployed.

The assistant has authored summaries, not an LLM connection. Video-capable card media remains supported; this revision adds no real video footage. Optional budget answers remain component-memory reflection data, separate from the existing legacy pulse draft adapter.

## Validation

- 250 UI tests passed across 36 files (`outputs/revision-final-tests.log`).
- 11 browser scenarios passed against the explicit production demo build (`outputs/revision-demo-browser.log`): 320/390/768/1440 px, EN/ES/FR, light/dark, reduced motion, chat follow-ups and return, sources, Global/region order, swipe controls, simulated age/country selection, under-18 restriction, and deficit review editing.
- TypeScript and both default and demo production builds passed. Default runtime correctly excludes synthetic catalogue fixtures. Existing large-bundle warnings remain.
- Changed TS/TSX checks and `git diff --check` passed. CSS checks have specificity warnings, no errors.
- Reviewed the phone screenshot and a frame sequence from the recorded chat flow. Artifacts: `outputs/ask-midnight-bitcoin-390.png`, `outputs/ask-midnight-motion.webm`, `outputs/ask-midnight-motion-board.png`, `outputs/civic-budget-390.png`.
- Development-server runs encountered cold-load timeouts; the production demo run passed all scenarios. One radio assertion was corrected to check the resulting country after the selection closes the sheet.
