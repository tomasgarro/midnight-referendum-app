# Device flow and service readiness — 16 September 2026

## Camera versus verification

The camera preview is implemented. Recognition uses the optional browser `TextDetector`, which is not a reliable default on ordinary mobile browsers. Where available, TD3 MRZ parsing checks check digits and dates and reduces the result to country/adult status. Manual entry is a fallback, not cryptographic document authentication. The demo does not supply a chip handoff, so neither path issues a real verified credential. Camera frames and entered document fields are not uploaded or saved by this component.

The permission screen now explains both recognition availability and the inactive demo NFC/proof path before asking for camera access. Document Back is a circular arrow alongside the forward action, not a full-width control above the question. Selecting Demo uses a neutral simulation label; returning to the Passport step offers an explicit switch back to a real account.

## Fresh VPS observation

Read-only Hostinger inspection of `midnight-rarimo-nfc` on VPS 1684196 found CICO and PostgreSQL healthy; the Rarimo verifier, Midnight proof-server 8.1.0 and Caddy edge are running. Initializer and migration containers exited successfully. These are infrastructure observations, not an end-to-end passport proof result.

The actual edge configuration names `cico.cardanoschool.org` and `rarimo.cardanoschool.org`. TLS works on these names; `/health` returns the gateway's 404 because public paths are allowlisted. The corresponding `*.midnight.vote` names currently fail TLS. No server configuration was changed in this investigation.

Remaining acceptance work: reconcile exact deployed service configuration with current source; verify allowlisted session/callback/proof-parameter routes; test real RariMe NFC and proof generation on a physical phone; verify authenticated callback reduction and deletion; then verify CICO issuance, accepted roots and the Midnight participant lifecycle. The Rarimo mobile proof and the Midnight proof-server are different components. The public demo remains disconnected from this real issuance chain.

Primary references: [Chrome text-detection availability](https://developer.chrome.com/docs/capabilities/shape-detection), [Rarimo off-chain verification flow](https://docs.rarimo.com/zk-passport/guide-off-chain-verification/).

## Civic Pulse

Answers remain in page memory unless the visitor explicitly selects **Save on this device** after reviewing/completing the reflection. The snapshot contains only allowlisted choices, a schema version and save time. It can be restored, reviewed, overwritten or deleted; browser-storage failure is reported. No server submission or cross-device sync is introduced. Anyone with the same browser profile can read local storage, which is explained beside Save.

An explicit action carries the reflection into the existing catalogue guide as visible context. This is not a connected LLM and does not generate personalized voting advice. A separate copy action prepares a neutral discussion prompt for an AI service the visitor chooses, with an explicit sharing explanation. Nothing is automatically transmitted to an AI provider.
