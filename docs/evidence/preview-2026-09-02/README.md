# Midnight Preview deployment -- 2 September 2026

The first deployment of this project's contracts to a public Midnight network.
Every value below is observed, and every gap is named.

## Status

**Deployed, not yet voted.** The registry and a referendum are live on Midnight
Preview and independently confirmed against the canonical Preview indexer. **No
vote, receipt, or tally exists on Preview**, and none may be claimed.

## Contracts

| Contract | Address | Block | Indexer type | Block time (UTC) |
| --- | --- | --- | --- | --- |
| `credential-registry-v1` | `9f8fe7c54d9907543cbcde82943c2be35ccb20f404e477ca2c29b8fc84a52132` | 683026 | ContractCall | 2026-09-02T02:16:30Z |
| `referendum-v2` | `63d53d4d0adaa506f2e5b93ca072aeb48c1dcf3071577dddcb8bedea08cd8b3b` | 683030 | ContractDeploy | 2026-09-02T02:16:54Z |

Confirmed by querying `contractAction(address:)` on
`https://indexer.preview.midnight.network/api/v4/graphql` -- the canonical
indexer, not our own manifest. The referendum's deploy transaction hash as the
indexer reports it is `302d658d5ec154c34d44ab4e439e3b8516747160c161b938fe26c753c94f1177`.

## Transcript

| Step | Status | Manifest txId |
| --- | --- | --- |
| `registry.deploy` | confirmed | `-` |
| `registry.issue` | confirmed | `-` |
| `registry.attest` | confirmed | `-` |
| `referendum.deploy` | confirmed | `-` |

Source commit `f8e7602c784276131d4a90bca47ca8163f7f13a2`.
Relayer DUST before the run: `11367166334999999999`.

## Why there is no vote

The run stopped at the walletless `castVote` step with
`getaddrinfo ENOTFOUND cico.cardanoschool.org`. For any network other than
`undeployed`, `scripts/deploy-passport-v2.mjs` builds an
`HttpWalletlessActionCapabilityIssuer` pointed at `V2_API_URL`, so casting a
vote needs a reachable CICO service.

Standing CICO up locally is **not sufficient on its own**. Its capability issuer
is constructed with
`credentialAuthorizationExists: (handle) => issuanceStore.hasIssuanceId(handle)`
(`cico-service/src/server.ts`), so it only mints a capability for a credential
**it issued**. This deploy issued the credential directly through the operator's
issuer role, so a fresh CICO would refuse.

Two honest options, both requiring a decision rather than a workaround:

1. Run the real flow -- CICO issues the credential (after Rarimo verification),
   then mints the capability. This is the designed path and the one that
   supports an end-to-end claim.
2. Let the deploy mint its own capability on Preview, as it already does on
   `undeployed`. This is a change to who may authorise a vote, and should be a
   deliberate trust-model decision, not a convenience.

## What this evidence does and does not support

- **Supports:** contracts compiled, deployed and confirmed on a public Midnight
  network; a credential issued and attested on Preview; the relayer balancing
  real transactions with real DUST.
- **Does not support:** any claim of a Preview vote, receipt, tally, or
  end-to-end citizen journey. No NFC or ePassport read has been observed on
  hardware.
