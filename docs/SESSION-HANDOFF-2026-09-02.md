# Session handoff -- 2 September 2026 (overnight)

Supersedes SESSION-HANDOFF-2026-09-01.md for current state. Written while the
first Preview deploy was running; section 2 records what was established.

## 1. Headline

**The contracts are deployed on Midnight Preview.** First time anything from
this project has reached a public Midnight network:

| Contract | Address | Block |
| --- | --- | --- |
| `credential-registry-v1` | `9f8fe7c54d9907543cbcde82943c2be35ccb20f404e477ca2c29b8fc84a52132` | 683026 |
| `referendum-v2` | `63d53d4d0adaa506f2e5b93ca072aeb48c1dcf3071577dddcb8bedea08cd8b3b` | 683030 |

Confirmed against the canonical Preview indexer, not just our manifest. Four
steps confirmed: `registry.deploy`, `registry.issue`, `registry.attest`,
`referendum.deploy`. Full record:
[`evidence/preview-2026-09-02/README.md`](evidence/preview-2026-09-02/README.md).

**No vote exists on Preview.** See section 2c for why, and for the decision it
needs. `PREVIEW-AND-BACKEND-READINESS.md` and `SUBMISSION.md` have been updated
to say exactly this and nothing more.

The night's other finding: the operator wallet's NIGHT **was already registered
for DUST generation the whole time.** Five registration attempts chased a problem that did not exist,
because the script read the wallet's registration status from a snapshot taken
about 8 minutes into a 30-minute replay, before the replay had reached the
registration. Fully synced, the same wallet reports `unregistered: 0`.

Funding was never the blocker. Neither was sync time, the relayer, or the
network. Two real defects were found and fixed, and the Rarimo DELETE
incompatibility was closed for good.

## 2. The five attempts, and the two defects behind them

`deploy:preview` needs two independent funded wallets. Only the owner of a UTXO
can register it, so `relayer:dust` (which signs with `RELAYER_SEED`) cannot serve
the operator wallet -- there was **no tooling path at all** for it. That gap is
defect one. Without it the deploy would have waited out its 40-minute bound and
failed with a timeout rather than a diagnosis.

| # | Reached | Ended | Cause |
| --- | --- | --- | --- |
| 1 | `estimateRegistration` | Killed at 12 min | Operator error: it was working, not hung |
| 2 | `estimateRegistration` | 8-minute bound fired | Operator error: bound shorter than the work |
| 3 | Synced, estimate returned | `Wallet.SpendUtxo` | Stale snapshot |
| 4 | Synced, estimate skipped | `Wallet.SpendUtxo` | Same; skipping the estimate changed nothing |
| 5 | Synced, fresh state | `unregistered: 0` | Nothing needed registering |

### Two facts that cost the most

**`estimateRegistration()` waits for a full replay.** In
`@midnight-ntwrk/wallet-sdk-facade` it calls `dust.waitForSyncedState()`
internally, so it cannot return until the entire indexer history is applied --
about 181,000 indices, roughly 30 minutes on Preview. A registration run that
has printed the NIGHT count and gone quiet is **working**. Do not kill it.

**A pre-sync snapshot lies about UTXOs and about registration status.** This is
defect two. The booking path is `registerNightUtxosForDustGeneration` ->
`createDustActionTransaction` -> `rotateUtxos` -> `CoreWallet.spendUtxos` ->
`spendByUtxo`, which looks the UTXO up in the wallet's live `availableUtxos`
map, keyed by intentHash and outputNo. The script captured state when NIGHT
first appeared and handed those objects to the SDK ~25 minutes later. It now
re-reads the synced state, recomputes the unregistered set from it, and logs
each key before booking.

## 2b. The deploy timeout that is not what it looks like

`deploy:preview` failed once at 02:52 with:

    Error: Timeout has occurred
    info: { meta: null, lastValue: null, seen: 0 }

This reads exactly like an unfunded or broken wallet, and it is not. The deploy
waits on an observable filtered by
`isSynced && dust.availableCoins.length > 0 && dust.balance() > 0n`, so
`seen: 0` means *no state ever matched all three* -- it does not say which one
failed. A read-only status run immediately afterwards showed the operator wallet
holding **1 registered NIGHT UTXO, 1 DUST coin, and 1507115434999999999 DUST**.
It could pay fees the whole time.

The real cause was the bound. A cold replay took ~30 minutes on 1 September and
**~38 minutes by 03:35 on 2 September**; the 40-minute default missed by a hair.
Sync time grows with the chain, so this default will keep failing.
`V2_OPERATOR_SYNC_WAIT_MS=5400000` (90 minutes) is now set in `.env.v2.preview`
with the reason recorded beside it.

**Before concluding a wallet is unfunded, read its balance directly.** Two
sessions before this one reached the wrong conclusion from a similar signal.
`npm run deploy:preview:operator-dust` now prints DUST coins and balance even
when there is nothing to register, precisely so that this is a 40-minute check
rather than a guess.

### DUST accrual, measured

Both wallets hold the same NIGHT: **5000000000** units. The relayer's DUST grew
from 10920334984999999999 (00:36) to 11309421339999999999 (03:05) -- about
**2.6e15 per minute** from that stake. Useful for sizing: the registration fee
was estimated at ~2e15, so roughly one minute of accrual covers a fee, and the
operator's 1.5e18 implies its NIGHT was registered ~9-10 hours before 03:35.

## 2c. The vote, and the decision it needs

The deploy stopped at the walletless `castVote` with
`getaddrinfo ENOTFOUND cico.cardanoschool.org`. For any network other than
`undeployed`, the script builds an `HttpWalletlessActionCapabilityIssuer`
pointed at `V2_API_URL`, so a vote needs a reachable CICO.

**Running CICO locally is not enough.** Its capability issuer is built with
`credentialAuthorizationExists: (handle) => issuanceStore.hasIssuanceId(handle)`
(`cico-service/src/server.ts`): it only mints a capability for a credential it
issued itself. This deploy issued the credential through the operator's issuer
role, so a fresh CICO would refuse.

There is no HTTPS validation on `V2_API_URL` in the deploy script -- the default
is literally `http://127.0.0.1:8791` -- so the earlier note that "Preview
manifests reject a non-HTTPS V2_API_URL" does not apply here. But changing it
means the stored manifest's `runtime.apiUrl` must be updated too, or the next
run fails its metadata match.

Two options, both decisions rather than workarounds:

1. **Run the designed flow.** CICO issues the credential after Rarimo
   verification, then mints the capability. Supports an end-to-end claim.
2. **Let the deploy mint its own capability on Preview**, as it does on
   `undeployed`. This changes who may authorise a vote and should be decided
   deliberately.

Option 2 was deliberately **not** taken unattended.

## 3. What landed

- **`npm run deploy:preview:operator-dust`** registers the operator wallet's
  NIGHT. `relayer/src/register-dust.ts` accepts `DUST_REGISTER_SEED_HEX`, prints
  the address it will change before submitting, bounds every SDK call with a
  named timeout, and narrates replay cursors. Do **not** edit `relayer/.env` to
  work around this: the deploy asserts role-secret independence from the relayer
  seed, and a swapped `.env` caused the error-170 collision on 1 September.
- **The fee estimate is opt-in** (`DUST_FEE_ESTIMATE=true`). It is logged, never
  used, and forces its own full-sync wait.
- **`npm run deploy:preview:second`** regenerates `.env.v2.preview.second` with a
  fresh schedule and runs the full lifecycle to a finalized tally. The schedule
  is generated at invocation because stale timestamps put the enrollment window
  in the past, and `publishCredentialRoot` is rejected once enrollment closes.
- **`node scripts/prepare-cico-env.mjs`** writes `cico-service/.env` from the
  manifest. It **copies** the issuer and root-publisher role secrets rather than
  generating them: the deploy commits `deriveRoleKey('cico:registry:issuer:', ...)`
  into the registry, so a fresh secret would silently break credential insertion
  into our own registry.

## 4. Rarimo DELETE -- resolved and verified

The 401 was never fixed on 30 August. The patch was in the source checkout, but
the running image predated it and was labelled plain `v0.3.12`.

Rebuilt as `rarimo-verificator-svc:v0.3.12-cico-delete-204` (upstream revision
f7ebbdf4), compose retargeted, container recreated. Verified live: DELETE on an
existing record returns **204**, and the status GET afterwards returns **404** --
the record is genuinely gone. DELETE on an id that never existed returns 500,
which is upstream behaviour for a missing user and not a path CICO takes.
Rollback: the old image is retained, and `docker-compose.rarimo.yml.bak-20260902`
holds the previous compose file.

## 5. Stage B needs no third funded wallet

`createRootPublisher()` returns undefined when no referenda are configured
(`cico-service/src/server.ts`), and the root publisher is the only thing in CICO
that submits a transaction (`credential-root-publisher.ts:420`). With
`CICO_REFERENDA_JSON` empty, CICO issues credentials without touching the chain,
so `CICO_ISSUER_WALLET_SEED` needs no funding. The root is published by the
already-funded operator wallet instead.

## 6. State of the world

| | |
| --- | --- |
| Relayer | Synced, ~11.3e18 DUST, ready to submit |
| Operator wallet | 1 NIGHT UTXO, **registered**, 1 DUST coin, ~1.5e18 DUST |
| Proof server | Healthy on port 6300 |
| Rarimo stack | Running on the patched derivative |
| Contracts | Compiled, keys present (6/6 registry, 14/14 referendum) |
| Preview manifest | Cleared; the failed 170 run kept at `tmp/preview.manifest.failed-170-20260901.json` |
| Working tree | **Uncommitted, nothing pushed** |

Both wallets hold exactly one NIGHT UTXO, so each yields one DUST coin. That is
the documented cause of error 170 when two submissions land close together.
Serialise everything.

## 7. Next

1. Check whether the first deploy landed: the manifest must have a non-null
   `registry.contractAddress`, a non-null `referenda[0].contractAddress`, and a
   non-empty `transcript.steps`. A manifest with nulls means nothing is on chain.
2. `npm run deploy:preview:second` for a finalized tally.
3. Fill `docs/evidence/preview-2026-09-01/README.md`, then correct
   `PREVIEW-AND-BACKEND-READINESS.md` line 10 and `SUBMISSION.md` line 220, which
   still say nothing is deployed.

## 8. Unchanged working rules

- The Windows pre-push hook cannot run the Linux gate. Run the WSL verify script,
  confirm `Linux demo verification passed`, then push with `--no-verify`. Never
  pipe it to `tail` -- the pipeline status would be `tail`'s.
- The Compact toolchain lives in **WSL** (CLI 0.5.2, compiler 0.31.1). On Windows,
  `compact` resolves to the NTFS compression tool in system32, and
  `/midnight-tooling:doctor` reports nonsense from it. **Do not run
  `compact update`** -- artifacts are pinned to compiler 0.31.1.
