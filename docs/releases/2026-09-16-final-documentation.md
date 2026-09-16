# Final project documentation — 16 September 2026

Application baseline: `8184f708ef5fdba371d3f15c0b559d59d75044ba`, merged [PR #35](https://github.com/tomasgarro/midnight-vote/pull/35).

## Scope

This release introduces the public `/docs` overview, desktop/mobile/footer Docs links, footer community links, a Passport-first README and submission brief, dedicated Passport/proof and AI chapters, and GitBook configuration. It does not change contracts, credential issuance, live voting or the AI runtime.

The repository is now [tomasgarro/midnight-vote](https://github.com/tomasgarro/midnight-vote). Internal npm workspace names remain stable. Historical evidence retains its original dates and revisions.

## Verification before publication

| Check | Result |
| --- | --- |
| Production demo build, TypeScript and Vite | Passed; existing large-runtime-chunk warning remains |
| UI suite | 259 tests passed across 39 files |
| Changed UI files: Biome | Passed |
| Bundle privacy gate | Passed, 16 text assets scanned |
| Docs and landing navigation | Five browser configurations passed: Chromium at 320, 390, 1024 and 1440px; WebKit at 390px |
| Browser assertions | Direct `/docs` access and reload, six chapter links, desktop/mobile Docs navigation, footer Docs, exact Telegram destination, Discord UTM, no horizontal overflow and no page errors |
| Visual review | Desktop Docs and mobile footer screenshots reviewed |

These browser checks use desktop/mobile emulation, not physical-phone certification. The existing generated-source-map and JSDOM video-play warnings remain; the UI suite exits successfully. No new contract test run is claimed for this documentation/UI release.

The application baseline has successful [test CI](https://github.com/tomasgarro/midnight-vote/actions/runs/35095816561) and [format/lint CI](https://github.com/tomasgarro/midnight-vote/actions/runs/35095816534). These links refer to the baseline, not the new documentation commit.

## Evidence boundaries

The public application is an explicit demo. The physical NFC-to-confirmed-network-vote journey remains pending. Passport session evidence, earlier Preview deployment and local lifecycle transcripts retain their original scope. Ask Midnight uses authored catalogue responses; generative browsing and summarization are planned. Midnight.city agent participation is exploratory.

GitBook configuration is included; no GitBook space is claimed as published. Repository documentation is the canonical source and the public overview links to it.
