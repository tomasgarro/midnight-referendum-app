# Discovery and conversation refinement

Global and regional consultation rails now precede the reflection heading and Civic Pulse. The catalogue guide remains directly accessible from Discover.

Suggestion, follow-up and clear actions no longer programmatically focus the composer. Conversation scrolling targets its own pane rather than `scrollIntoView`, which could move ancestor containers. Header and composer retain their space; desktop answers use a bounded reading column. Proposal cards offer expandable descriptions, direct dossier access and summary/context/arguments/uncertainty/source follow-ups.

The landing story previously required an 800px-high viewport. It now supports desktop viewports from 650px, with compact typography below 800px. Narrow/short viewports and reduced-motion preferences retain readable sequential panels.

Research: 20 AppLlama screens reviewed. Notee AI Chat Response (oth_7as41), Minutes Meeting Chat (oth_7wcg6), Craft New Chat (oth_1b9u5) informed fixed composers, restrained answer surfaces and contextual suggestions. No reference assets copied.

Validation: 259 UI tests; nine focused browser checks across desktop Chromium, Android Chrome and iPhone Safari emulation. Light/dark screenshots and recorded mobile conversation frames reviewed. Tests assert no input focus from suggestions, unchanged composer/page position, catalogue ordering, laptop story progression and reduced-motion fallback. Physical mobile keyboards and device frame rates are not measured by browser emulation.

The guide still uses deterministic published catalogue data. No generative AI service or external transmission of reflection answers is added.
