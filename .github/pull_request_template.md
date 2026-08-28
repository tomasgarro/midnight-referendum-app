## Passport-first Midnight Preview MVP

### Summary

<!-- What changed, why, and which release stage it belongs to. Link an ADR when changing a trust boundary. -->

### Scope

- [ ] Synthetic public UI preview only (`VITE_APP_MODE=demo`).
- [ ] Real local v2 slice (`VITE_APP_MODE=undeployed`) with manifest/transcript evidence.
- [ ] Separately approved Passport/Rarimo enrollment change with evidence.
- [ ] Separately approved real Midnight Preview vote with reproducible transcript.
- [ ] Legacy `/balance` and `/submit` are not exposed as the v2 action path.
- [ ] V2 relay accepts only proved, capability-authorized, allowlisted work and confirms through the indexer.
- [ ] Does not expose raw proof/callback, holder opening, witness, voter secret, or ballot choice.

### Verification

- [ ] `npm ci`
- [ ] `npm run quality`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run verify:undeployed` (when runtime/operator code changes)
- [ ] `CI=true npm run test:e2e`
- [ ] `npm audit --omit=dev`
- [ ] `git diff --check`
- [ ] Browser network/CSP smoke has no private or raw-proof origin.

### Environment and privacy

- [ ] Every `VITE_*` value is treated as public and contains no secret.
- [ ] Contract, CICO, relayer, and remote proof-server values are empty for the synthetic demo.
- [ ] Demo, undeployed, and Preview evidence are reported separately.
- [ ] Issuer, organizer, relay, verifier, database, and service-role secrets remain private.
- [ ] Synthetic copy cannot be mistaken for a credential or confirmed vote.

### Deployment and rollback

- [ ] `docs/FIRST-PUBLIC-DEPLOYMENT.md` inputs are complete.
- [ ] CSP is reviewed against exact build-time origins; no guessed or wildcard hosts.
- [ ] SHA, CI links, Preview URL, response headers, and network-smoke evidence are attached.
- [ ] Known-good Vercel deployment, DNS rollback owner, and incident contact are recorded.

### Reviewer focus

<!-- Identify changed trust boundaries, origins, secrets, generated assets, or pilot gates. -->
