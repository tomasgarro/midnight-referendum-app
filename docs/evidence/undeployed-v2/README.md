# Undeployed v2 evidence archive

This directory preserves local v2 evidence from an earlier implementation.
The nested [`abdd0a2/`](abdd0a2/) record is historical and SHA-specific; it is
not a current-branch release record and it is not Midnight Preview evidence.

## `abdd0a2`

The record was generated from source commit
`abdd0a2203fbef909f70f6ddc06681ac1327f457` (tree
`9d1319aa3540a0943f760631ec3ac9c9e5b40b36`) with manifest digest
`d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d`.
It covers an Undeployed node/indexer/proof-server/relay lifecycle and the
older frozen-before-deploy registry model. Later source changed the default to
open enrollment, so the record must not be presented as evidence for the
current branch head.

The files are intentionally preserved byte-for-byte as an audit trail:

- [`undeployed.manifest.json`](abdd0a2/undeployed.manifest.json)
- [`undeployed-v2.transcript.json`](abdd0a2/undeployed-v2.transcript.json)
- [`undeployed-v2.transcript.md`](abdd0a2/undeployed-v2.transcript.md)

The record contains only the public addresses, transaction identifiers, state,
and digests selected by its original sanitization procedure. It does not prove
Passport approval, physical NFC, a hosted issuer/relay, or a Preview release.

Any new run must use a new evidence directory and bind its manifest and
transcript to the exact source SHA that was executed. Do not overwrite this
archive or copy its values into current status without the historical label.
