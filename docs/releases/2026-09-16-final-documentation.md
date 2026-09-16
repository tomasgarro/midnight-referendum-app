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

## Published artifact and public checks

Documentation/UI source: initial commit 19c0a75 in [PR #36](https://github.com/tomasgarro/midnight-vote/pull/36); subsequent changes correct documentation only. Static archive: midnight-vote_20260916_145100.zip. SHA-256: `77d6ddec9bf33f5d7178b179c9743dd2c9e5e92fd8f6b65efe93afcae559867b`.

Hostinger accepted the deployment to midnight.vote. All five browser configurations above then passed against the public HTTPS site, including direct /docs reload, landing navigation and community links. The archive contains prebuilt assets with index.html and .htaccess at its root. 135 relative documentation links passed local existence checks before the follow-up documentation corrections.

The final source review also corrected stale memory-only Civic Pulse descriptions: explicit device-only save/review/delete and user-controlled AI prompt export were introduced in PR #34. These are now reflected in the submission, specification and architecture.
