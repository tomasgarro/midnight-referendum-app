# Legacy v1 Midnight Preview evidence

This document preserves the original hackathon/DNI prototype history. It is
not evidence for Passport-v2, `CredentialRegistryV1`, `ReferendumV2`, the
Undeployed v2 runner, or the current browser journey. The values below are
historical records copied out of the active README so they cannot be mistaken
for current release evidence.

## Recorded v1 contract and first ballot

| Item | Historical value |
| --- | --- |
| v1 Preview contract | `71644dd931b8f862119f78c57fd1cc9d8f3601a7a1e892de414c77db24aecd38` |
| DUST registration transaction | `0034a5b1b8d5a004b49fb84d7af0bf177b8ba16ef6a741e95673fa4660a2503f3f` |
| Eligibility issuance transaction | `48fbbfa5c27ffb12f0573bce353dd172b0030e91ab860daf5243437bb3e873df` |
| v1 `castVote` transaction | `31882c56d7d7589c20abf4a832e4a9c106c648345baa24de860ea67bdfd0f440` |

The recorded v1 ballot was described as landing in block `331474` with status
`SucceedEntirely`. A repeated secret was described as rejected by the
proposal-scoped nullifier, and an unissued secret was described as rejected by
the eligibility tree. These are historical claims about the v1 transcript and
must not be presented as fresh evidence for the current branch.

## Recorded v1 end-to-end tally

The historical notes describe a second v1 Preview referendum:

`2c25fabe2d223de25b72247f365f17e5bc8370aeb6ad73826fb7cc1cb6ff757b`

| Historical step | Transaction |
| --- | --- |
| Issue voter A | `c50d8c5df1163ebe123fd7abcdae003c8e7bcfab7c5d6f9dd341e1b49505424b` |
| Issue voter B | `3bf2f52bd883e434a30aee54ed742eb269ea512cde8271e2ee953516992d2709` |
| Ballot A (YES) | `a22c248500f7ccf0b0a152a24eb4bf8fa0724c6e5eb68194995107a7711cc543` |
| Ballot B (NO) | `705321806a191b8d27a63326dad263aea6a01fe4a9fbf2d7915b8c7060251080` |
| Reveal YES | `ce04e8aef6541e9fc54ed57724555eb4e68f94311fa0ebec2bce47e7ddf044eb` |
| Reveal NO | `4b1bb5f2e7d2073df3cd11719c2ef5d0844d98b21a193cc9c6d16d1a02b1a8b1` |
| Finalize | `0c8106db033f8b4bc4fa6b313bbb63770540f6dbc76743becba3cd61b2b1bb42` |

The historical final state was recorded as `phase=FINALIZED`, `YES=1`,
`NO=1`, `ABSTAIN=0`. It was a commit–reveal demonstration on the old v1
contract and does not establish that the current v2 lifecycle has run.

## Legacy boundary notes

The old notes also recorded compatibility checks for the v1 `/health`,
`/keys`, `/balance`, and `/submit` relayer routes. Those routes are not the
active v2 citizen action API. Current v2 work uses a capability-gated action
job and only treats an independent indexer observation as a confirmed receipt.

For current status, use the [root README](../README.md) and the
[environment acceptance matrix](ENVIRONMENT-ACCEPTANCE.md).
