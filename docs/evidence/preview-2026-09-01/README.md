# Midnight Preview deployment — 1 September 2026

The first deployment of this project's contracts to a public Midnight network.
Everything below is either an observed value or an explicitly named gap. Where a
run is still in progress at the time of writing, this file says so rather than
predicting its outcome.

## Status

> **Not deployed.** The wallet gate cleared and the deployment ran to its first
> submission, which the node rejected with `Invalid Transaction: Custom error:
> 170` (`InvalidDustSpendProof`). Nothing reached the chain: the manifest holds
> no contract address and an empty transcript. **This project still has no
> Preview deployment claim**, and the hosted UI stays labelled a synthetic demo.
>
> The cause is understood and is not a code defect — see *Why it failed* below.
> One funding action unblocks it.

## The wallet gate, and what it cost

The blocker was never funding. It was sync time, and a timeout that was shorter
than the work.

A relayer wallet holds no state between runs: every start replays the whole
indexer history before it can report a balance. On Preview on 1 September that
was about **180,000 indices, taking roughly 27 minutes**. Two earlier sessions
had concluded the wallet was unfunded, because the read-only status tool gave up
after its 8-minute bound and reported `dustBalance: 0` — a partial read, not an
empty wallet.

Run with a longer budget, the same wallet reported:

```json
{
  "synced": true,
  "nightCoins": 1,
  "registeredNightCoins": 1,
  "unregisteredNightCoins": 0,
  "dustCoins": 1,
  "dustBalance": "9644695549999999999",
  "readyToRegister": false,
  "readyToSubmit": true
}
```

Observed at 16:02 UTC-2 via `RELAYER_STATUS_WAIT_MS=1740000 npm run relayer:status`,
which submits nothing. Unshielded address:
`mn_addr_preview1r7lyp9rnaphxpzjhn4u39tggjwt05zl630tekhme9z275rj5p4eqr97gss`.

Two consequences worth carrying forward:

- **No DUST registration was needed.** The single NIGHT coin was already
  registered for DUST generation, so the write-capable `relayer:dust` command
  was correctly never run.
- **`scripts/deploy-passport-v2.mjs` hard-coded an 8-minute operator sync
  bound**, which would have failed this funded wallet for lack of time. It is
  now `V2_OPERATOR_SYNC_WAIT_MS`, defaulting to 40 minutes, and the script
  prints how long it will wait.

## Known operational limit

The wallet holds **one DUST coin**. Two submissions in quick succession can
contend and return error 170, and waiting does not clear the stale reservation —
the relayer has to be restarted. Every submission in this deployment is
therefore serialised, and any multi-user demonstration needs either more coins
or a queue in front of it.

## Why it failed, and what unblocks it

The deploy needs two wallets alive at once: the relayer service, which balances
and submits, and the script's own operator wallet. Both were pointed at the same
seed, because that was the wallet proven to be funded — and that wallet holds
**one DUST coin**.

Two independent processes cannot share one coin. The relayer balanced a
transaction (`dustSpends=1`) against a coin state the operator process had
already moved, and the node rejected the spend proof. This is the same error 170
recorded against this project before; it does not clear by waiting, and only a
relayer restart re-derives the coins.

`V2_OPERATOR_FEE_SEED_HEX` now points at a **dedicated operator wallet**, freshly
generated for this purpose, so the two processes can never contend again. It
needs NIGHT:

```
mn_addr_preview1z80zenqvedqjg8veyz474gufl33f5qx70deuzzyvjwaekf6m0j4sr5jnww
```

Fund it from the [Preview faucet](https://midnight-tmnight-preview.nethermind.dev/),
then register the coin for DUST generation (`npm run relayer:dust` with that
seed) and re-run `npm run deploy:preview`. Budget roughly 27 minutes of cold
sync per process before either reports a balance.

## Contracts

| Item | Value |
| --- | --- |
| Network | `preview` |
| Credential registry address | _pending manifest_ |
| Referendum address | _pending manifest_ |
| Registry deploy transaction | _pending manifest_ |
| Referendum deploy transaction | _pending manifest_ |
| Manifest | `deploy/passport-v2/preview.manifest.json` |
| Source commit | see `git log` for the commit that produced the manifest |

## Lifecycle transactions

The deploy script drives the whole lifecycle, so each of these is a real
transaction on Preview rather than a simulated step.

| Step | Circuit | Transaction | Status |
| --- | --- | --- | --- |
| Publish credential root | `publishCredentialRoot` | _pending_ | _pending_ |
| Cast the fixture vote | `castVote` | _pending_ | _pending_ |
| Close voting | `closeVote` | _pending_ | _pending_ |
| Reveal | `revealVote` | _pending_ | _pending_ |
| Finalize | `finalizeVote` | _pending_ | _pending_ |

The `V2_FIXTURE_*` values driving the self-check vote are deploy-time material,
generated locally for this run. They are not a real voter's secret and must
never be reused as one.

## What this evidence does and does not establish

**Establishes**, once the tables above are populated: that the Compact contracts
compile, deploy, and execute their full lifecycle on a public Midnight network;
that a vote is bound to a nullifier the contract rejects on replay; and that a
tally can be read back from the chain rather than from a fixture.

**Does not establish:**

- Any hosted service. `V2_API_URL` records
  `https://cico.cardanoschool.org` as the endpoint the deployed UI will call.
  **That service is not deployed.** The value is runtime configuration in the
  manifest, not a claim that anything answers there.
- Any Rarimo verification, physical NFC read, or ePassport chip read.
- Any citizen-cast vote from a browser. The vote in this run is the script's own
  fixture self-check.
- Anything about Midnight Passport, which runs on stagenet and cannot supply a
  Preview address.
