# UI preview artifact — 15 September 2026

- Source: `0123dce42ba4dd9ba4ffd01b51eb01eb263945c9`.
- Local archive: `deploy/hostinger/artifacts/ui_20260915_143000.zip`.
- SHA-256: `14D5B047A44719AD8ADC3EFD20546063718D039F1C86F534C273BCC542112EF9`.
- Size: 61,182,539 bytes; `index.html` at archive root.
- Mode: synthetic `demo`, built with Vite `--mode demo`.
- Passport origin: `https://midnightpassport.com`; account network: `stagenet`.
- Relayer, contract, proof server, indexer and CICO API URLs explicitly empty;
  referendum configuration `[]`.
- Production build and `npm run verify:showcase` passed.

The archive is a private local build output, not a committed source file.
It contains the frontend only. No Hostinger upload, DNS change, service restart
or production cutover occurred. Website inventory returned HTTP 500 twice;
retry that read before deploying to the previously recorded synthetic site.
See [the handoff](../UI-RELEASE-HANDOFF-2026-09-15.md) for verification and rollback.
