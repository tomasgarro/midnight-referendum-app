# RariMe and Freedom Tool reference UX

Status: reviewed reference material, 31 August 2026. This is product research,
not evidence of a working Passport session, genuine NFC verification, or a
Midnight Preview transaction.

## Material reviewed

The local `rarimo information` folder contains four portrait phone recordings
and seven screenshots supplied for product comparison:

| Recording | Duration | Observed surface |
| --- | ---: | --- |
| `screen-20260830-171307.mp4` | 32.0 s | RariMe widgets, passport/QR scan, wallet, recovery, authentication, theme, and profile |
| `screen-20260830-171513.mp4` | 24.9 s | Freedom Tool widget, create/scan actions, and entry into passport verification |
| `screen-20260830-171609.mp4` | 28.3 s | Freedomtool.org deployments, how-it-works explanation, audited components, and public verification positioning |
| `screen-20260830-172111.mp4` | 21.1 s | Passport framing/manual fallback, expiry input, case-removal guidance, and NFC reader placement |

The screenshots add the RariMe welcome/privacy/identity onboarding, widget
discovery, an explicit proof-request sheet, the passport framing step, and the
error shown when recovery is attempted before scanning a passport.

These files remain outside the repository. Their ownership, redistribution
rights, captured account/device state, and accessibility treatment are not
documented, so they must not be copied into the public build.

## What the references do well

1. **Explain before requesting proof.** RariMe introduces privacy and identity
   management before a document action.
2. **Show the proof request.** The request sheet identifies criteria,
   requestor, and revealed data before the user generates anything.
3. **Keep the phone task concrete.** Passport framing, removing a thick case,
   and NFC placement are shown as separate steps.
4. **Offer recovery from permission failure.** A denied camera can lead to an
   explicit provider fallback instead of a dead end.
5. **Keep public verification visible.** Freedom Tool places deployments,
   audited components, public ballot verification, and contribution paths near
   the voting product rather than hiding them in technical documentation.

## Risks we do not inherit

- Wallet, recovery, biometrics, themes, and ETH balance are not required for
  the Passport-to-Preview release and would distract from voting.
- The greeting `Hi Stranger` and broad identity-vault language can imply a
  persistent identity product. This release instead explains a scoped session
  and one civic credential.
- `Data never leaves this device` is too absolute for our architecture. The
  restricted CICO adapter transiently validates provider proof signals in
  memory. Raw evidence is not logged, persisted, or returned to the browser,
  but the verification is not purely on-device.
- A manual document entry must never be presented as equivalent to an NFC-backed
  credential. It is only a provider recovery step before successful evidence
  verification.
- The reference proof sheet includes uniqueness and several revealed fields.
  This release does not claim human uniqueness and requests only the minimal
  policy-bound country/adult/document-assurance result.

## Decisions applied to the current release

| Reference lesson | Current implementation decision |
| --- | --- |
| Explain the cross-device task | The handoff includes an optional, text-first walkthrough before the provider link. |
| Reveal scope before action | The handoff names requested claims, data that is not requested, the CICO/Rarimo requestor, retention behavior, and expiry. |
| Make QR optional on mobile | The same one-time URL is available as QR, direct link, copy action, and backup text. |
| Handle a long-running phone task | Preview polls every five seconds and exposes last check, expiry, retry, cancellation, and restart states. |
| Teach passport and NFC placement | The accessible transcript covers photo-page framing, camera fallback, case removal, NFC placement, and return-to-browser behavior. |
| Keep voting central | Credential success returns to the voting dashboard; wallet/recovery/ETH surfaces remain outside the release. |
| Preserve public verifiability | Documentation distinguishes relay acknowledgement from canonical indexer confirmation and preserves exact historical evidence separately. |

## Media publication gate

Before a tutorial video can ship, record its owner and license, inspect every
frame for personal/device/account data, produce captions and a transcript,
remove third-party branding unless permitted, compress it for mobile delivery,
and verify a poster plus reduced-motion behavior. Until then, the product uses
the reviewed text transcript and no video autoplay or external media request.
