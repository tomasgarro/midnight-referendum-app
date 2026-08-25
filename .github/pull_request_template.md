## Passport-first Midnight Preview MVP

### Summary

<!-- What changed, why, and which release stage it belongs to. Link an ADR when changing a trust boundary. -->

### Scope

- [ ] Synthetic public UI preview only (`VITE_APP_MODE=demo`).
- [ ] Separately approved Passport/Rarimo enrollment change with evidence.
- [ ] Separately approved real Midnight Preview vote with reproducible transcript.
- [ ] Does not deploy, fund, or expose the current legacy relayer.
- [ ] Does not expose raw proof/callback, holder opening, witness, voter secret, or ballot choice.

### Verification

- [ ] `npm ci`
- [ ] `npm run quality`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `CI=true npm run test:e2e`
- [ ] `npm audit --omit=dev`
- [ ] `git diff --check`
- [ ] Browser network/CSP smoke has no private or raw-proof origin.

### Environment and privacy

- [ ] Every `VITE_*` value is treated as public and contains no secret.
- [ ] Contract, CICO, relayer, and remote proof-server values are empty for the synthetic preview.
- [ ] Issuer, organizer, relay, verifier, database, and service-role secrets remain private.
- [ ] Synthetic copy cannot be mistaken for a credential or confirmed vote.

### Deployment and rollback

- [ ] `docs/FIRST-PUBLIC-DEPLOYMENT.md` inputs are complete.
- [ ] CSP is reviewed against exact build-time origins; no guessed or wildcard hosts.
- [ ] SHA, CI links, Preview URL, response headers, and network-smoke evidence are attached.
- [ ] Known-good Vercel deployment, DNS rollback owner, and incident contact are recorded.

### Reviewer focus

<!-- Identify changed trust boundaries, origins, secrets, generated assets, or pilot gates. -->
