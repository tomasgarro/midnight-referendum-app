# Referendum.earth premium UX pattern specification

Research date: 2026-08-31  
AppLlama board: `referendum.earth` (`6dbc4d67-872f-48ff-a110-07b72d91e281`)  
Pass: 30 keyword + 30 semantic results for Discover, consultation detail, Verify, Credentials, Activity, Passport, and onboarding. Full journeys were walked for Vivino (43 screens), Visited (47), Scanner Pro (24), Authenticator (31), and Payout (39).

The local files in `references/` are research evidence only. They retain the AppLlama provenance mark and must never ship in the product.

## Product hierarchy

The interface presents three objects, in this order:

1. **Midnight Passport** — the citizen's account for this Preview experience.
2. **Physical passport** — a document used during a separate eligibility check.
3. **Eligibility pass** — the small reusable result shown in Credentials and used to unlock a vote.

The product must not suggest that this application, or the current Passport SDK, stores the physical passport. Unsupported recovery, biometric, cloud-sync, DID, and credential-custody claims are omitted.

## Cross-app pattern decisions

| Surface | References studied | Pattern adopted | Pattern rejected |
| --- | --- | --- | --- |
| Discover | Visited `846983349/oth_gf4bk`, `oth_3gbk1`, `oth_bj2k4`; Payout `6748968935/oth_q60ya`; Vivino `414461255/oth_ndphm`; WHOOP `933944389/onb_97eb2` | Scope is one visible place trigger that opens a searchable sheet: Global and published consultation countries lead, while the complete catalogue remains discoverable by search. Map/list changes only presentation; cards carry status, place, deadline, and one clear action. | Three hard-coded country buttons; treating browsing as proof of nationality; mixing country items into Global. |
| Consultation | Payout `6748968935/oth_ixje8`; Vivino `414461255/oth_4ehap`, `oth_rhmnt` | Clear title and status, short evidence summary, supporting/critical arguments, sources, then one sticky action. | Dense technical privacy copy before the actual proposal. |
| Verify | Scanner Pro `333710667/oth_jdxnh`, `oth_ajda6`, `oth_5jp0r`; Vivino onboarding scan video `414461255/onb_t5jzg` | One elevated entry, explicit physical-document language, capture → review → NFC → eligibility result, honest state/retry. | Generic QR language, fake percentage progress, celebratory motion before a verified result. |
| Credentials | Vivino `414461255/oth_bm0py`, `oth_d2f3f`; Authenticator `1602061522/oth_9s5pa` | A reusable collection with one active pass, issuer/status/expiry/assurance, one contextual add-or-verify action, and a useful empty CTA. | Presenting the document as an item stored inside Midnight Passport. |
| Activity | Fasting activity history `6470460463/oth_hp9pd`; Vivino cellar history `414461255/oth_r00mk` | Pending and confirmed/simulated receipts in a chronological list with copy and explorer actions. | Mixing receipts into account settings or claiming confirmations are anonymous beyond the evidence. |
| Passport | Authenticator `1602061522/oth_mffc9`; Visited `846983349/oth_rjqc7`; Vivino `414461255/oth_wk7aq` | Identity header, real account/address when returned, Preview status, grouped preferences, separate Lock and Remove local data actions. | A permanent wallet row in the public demo; unverified cloud recovery or biometric controls. |
| Onboarding | Authenticator `1602061522/onb_2qiqb`, `onb_1dk4i`; Payout `6748968935/onb_nk61g`; Scanner Pro `333710667/onb_bnb10` | Three plain-language objects, short segmented progress, consent at the moment it matters, one action per step. | Gradients, floating security clichés, or claims copied from unrelated authenticator apps. |

## Shell and motion

- Five positions: Discover, Credentials, elevated Verify, Activity, Passport.
- Verify is an action, not a persistent page state. Tabs switch without sliding.
- Press feedback is 120ms. Sheets use a short ease-out transition. Success celebration is reserved for eligibility or a vote receipt.
- `prefers-reduced-motion` removes transform-based movement.
- Every interactive target is at least 44px and uses one Phosphor icon family.

## Visual system

- Accent: flat indigo `#5b5bd6` only for actions, selection, and progress.
- Neutral family: warm cream/white/charcoal from semantic tokens.
- Shape lock: pill actions, 20px cards, 12px fields.
- Dark mode is generated through the same semantic tokens; no screen-specific colour fork.
- Map artwork is an application-owned abstract locator, not copied reference imagery.

## Saturation note

The later AppLlama pages repeated the same structural decisions: segmented scope, grouped settings rows, single primary action, collection empty state, and review-before-save. Additional references were no longer changing this specification, so implementation began at that point rather than spending credits on duplicates.
