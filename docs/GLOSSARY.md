# Plain-language glossary

[Documentation home](README.md) · [How it works](HOW-IT-WORKS.md)

| Term | Meaning in this project |
| --- | --- |
| Consultation | A public question with an audience, response options and schedule. This prototype is non-binding. |
| Midnight Passport | Consent, account-session and display-profile entrance. Connection does not establish eligibility. |
| Eligibility | Meeting a consultation's published participation rule. Rules may differ between consultations. |
| Credential | Issuer-backed claims bound to holder material. A demo credential is synthetic. |
| Holder secret | Private material demonstrating control of a credential; not a Passport name. |
| NFC | The short-range connection used to read a supported document chip. Reading alone is not verification. |
| Zero-knowledge proof | Evidence of a defined statement without exposing its private inputs. Public policy and outputs still disclose information. |
| Witness | Private proof inputs, such as a credential opening or membership path. |
| Commitment | A value binding private data to an opening. Ballots bind event, choice and salt. |
| Salt / blind | Private randomness that helps conceal a committed value. Losing it can prevent later use or reveal. |
| Merkle root | A compact summary of a credential set. A proof can demonstrate membership without listing the set. |
| Nullifier | A repeat-use marker, preventing the same bound secret voting twice in one referendum. |
| CICO | The repository's credential-issuance service (`cico-service/`), separating verification and issuance from ballots. |
| Relay / relayer | A service submitting an authorized transaction. Acceptance is not yet chain confirmation. |
| Indexer | A service for reading observed chain activity and reconciling receipts. |
| Commit–reveal | First bind a hidden choice, then disclose its opening so it can be counted. Here the reveal is public. |
| Canonical receipt | A receipt reconciled against the intended network and contract state, unlike a demo receipt. |
| Undeployed | Local Midnight network mode, separate from public Preview. |
| Preview | A public test environment. An old transaction does not prove a newer revision was deployed. |
| Acceptance gate | A concrete check required before making a stronger release claim. |
| ADR | Architecture Decision Record: why a consequential choice was made and its tradeoffs. |
