# Mobile submission release — 16 September 2026

Application source baseline: `43535872f9d1c48cc8380451bb95b7d35d9b2900`
(merged PRs #31 and #32). This follow-up changes test synchronization, mobile
browser coverage and release planning; it does not enable live voting or NFC.

## Corrections and checks

- Civic Pulse's browser journey now visits all four optional screens and
  verifies review before finishing. Its no-external-request and unchanged
  browser-storage-key assertions remain.
- Receipt unit tests await the asynchronous receipt heading/navigation after
  profile-key derivation and storage, retaining simulated receipt disclosures.
- The full UI suite passed: **252 tests across 37 files**.
- The production demo build and bundle privacy gate passed. The existing
  large-chunk warning remains.
- Desktop checks cover 320/390/768/1440px and EN/ES/FR. New Pixel 7 Chromium
  and iPhone 13 WebKit projects each complete reflection and simulated receipt
  journeys. These are browser emulation, not physical-device certification.
- The initial 57-scenario local run passed 52, skipped the four existing
  mode-specific cases, and failed the Passport popup on the unsupported
  `127.0.0.1` origin. The popup passed when rerun on `localhost`. No product
  workaround or assertion relaxation was introduced.
- All 88 executable/declaration API files match the merged-main CI artifact
  from [run 35081121831](https://github.com/tomasgarro/midnight-referendum-app/actions/runs/35081121831)
  after line-ending normalization. That run passed compilation, unit tests,
  builds and dependency audit but failed the stale Pulse browser test.

## Reviewed demo artifact

Archive: `midnight-vote_20260916_120000.zip`, 11,784,588 bytes.

SHA-256: `4e4bdfe87da1adea89cab71691bfd32c66b3f449f78574d6136da44b3337cf70`.

The archive contains `index.html` and `.htaccess` at its root. It includes
production demo output, SPA fallback, MIME types and existing security headers.
It contains no environment files or private proving keys. Build and packaging
do not establish that this artifact is publicly hosted.

## Domain and phone acceptance

Hostinger confirms ownership of `midnight.vote` and existing static hosting on
account `u665780279`, order `55519490`. Before this release, the root domain
served a parked page; the older demo was on the Hostinger temporary hostname.
The separate `cico` and `rarimo` subdomains target the existing VPS.

The demo was deployed to [midnight.vote](https://midnight.vote) on the existing
plan at approximately 10:00 UTC. HTTPS works at both the apex and `www`, and
SPA fallback returns the app. Hostinger connected the apex using
`midnight.vote.cdn.hstgr.net` and `www` using `www.midnight.vote.cdn.hstgr.net`;
the `cico` and `rarimo` VPS records are unchanged.

All **four mobile browser journeys passed against the public URL** (1.2 minutes).
Of the 33 public build files, 30 match the local artifact byte-for-byte through
the CDN, including HTML, JavaScript, CSS, fonts and WASM. The CDN rewrites three
PNGs; each of those matches the artifact byte-for-byte when fetched directly
from the Hostinger origin. Security headers and SPA fallback were also checked.

On a physical phone, check the landing menu, demo Passport, simulated pass,
consultation/receipt, Civic Pulse, back navigation and reload in Safari or
Chrome. Use synthetic information. Keep simulation labels visible.

Portal submission, physical-phone results and a complete current-source
Preview lifecycle require their own evidence; this record does not claim them.
The [next-sprint checklist](../NEXT-SPRINT-LIVE-LIFECYCLE.md) defines that lifecycle.
