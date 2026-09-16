# Independent product branding and submission kit — 16 September 2026

This release applies the owner-supplied D3 symbol to midnight.vote's landing navbar/footer, Docs brand, loading screen, onboarding welcome and app header. The app identity sits at the top right; the centered network action retains the official Midnight symbol. Passport/network illustrations continue to identify their respective integrations. A square SVG favicon uses the independent mark.

The [submission copy](../PRODUCT-SUBMISSION.md) covers name, tagline, prototype status, description, product value, implementation, limitations and roadmap. Five 1600×1000 gallery PNGs and a 512×512 product icon are available under `docs/assets/submission/`. Gallery screens were captured from the actual demo build with synthetic eligibility; no physical passport or real vote is represented.

Validation: production demo build and bundle privacy gate passed. The UI suite initially caught a missing accessible name on the replaced app mark; the accessible name was restored and all 20 affected App tests passed on rerun (the other 238 tests passed in the full run). Changed UI files passed Biome. Browser checks cover Docs/navigation at 320/390/1024/1440px and mobile WebKit, plus the simulated onboarding/review/receipt path, app-header position at 320/390/768/1440px, retained center network symbol and a dark-theme screenshot. Existing runtime bundle-size and generated-source-map warnings remain.

This release changes branding and submission materials, not verification, voting or AI behavior. The product remains an independent, non-binding prototype. No submission portal action is performed.
