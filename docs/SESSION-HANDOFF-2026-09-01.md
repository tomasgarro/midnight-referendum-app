# Session handoff — 1 September 2026

Pick-up document for the next session. It records what landed, what was
actually verified rather than reported, what is open, and the few facts that
cost real time to establish so nobody re-derives them.

Supersedes [`SESSION-HANDOFF-2026-08-31.md`](SESSION-HANDOFF-2026-08-31.md) for
current state. That file stays as the record of the 31 August session.

---

## 1. Headline

**The wallet was funded the whole time.** Two previous sessions concluded the
Preview relayer had no DUST and treated it as the blocker. It was not: the
wallet holds one NIGHT coin, already registered for DUST generation, and 9.7
DUST. Every timeout in the repository was shorter than the indexer replay, so a
partial sync reported zero and was read as an empty wallet.

The deployment still did not land. It ran, reached its first submission, and
was rejected with error 170 because the relayer and the deploy script were
sharing that single DUST coin. A dedicated operator wallet is now configured and
needs one faucet request — §5 has the address. **Nothing is deployed to
Preview**, and no document in this repository says otherwise.

Beyond that, the Verify action became a real document journey, light is the
default tone again, French joined the product, and Activity now answers the
questions people actually arrive with.

## 2. Branch and PR state

| Item | State |
| --- | --- |
| Branch | `feat/jury-ready-submission` |
| Base at session start | `ed1c17d` |
| New commits | 5 (`619cba0`, `e687037`, `d59e3d6`, `de21cf5`, `47ba45d`) |
| PR | [#23](https://github.com/tomasgarro/midnight-referendum-app/pull/23), open |
| Preview deployment | **Attempted, failed on error 170. Nothing on chain.** See §5 |
| Hostinger / VPS | Untouched. No hosted resource was mutated |

## 3. The wallet fact, so nobody re-derives it

A relayer wallet keeps **no state between runs**. Every process start replays
the whole indexer history before reporting a balance. On Preview on 1 September
that was ~180,000 indices at roughly 7k/minute — **about 27 minutes**.

`relayer:status` defaulted to an 8-minute bound and
`scripts/deploy-passport-v2.mjs` hard-coded 8 minutes for its operator wallet.
Both are shorter than the work, so both reported a funded wallet as empty.

- Read-only status with a real budget:
  `RELAYER_STATUS_WAIT_MS=1740000 npm run relayer:status` (capped at 30 min).
- The deploy bound is now `V2_OPERATOR_SYNC_WAIT_MS`, default 40 minutes, and
  the script prints how long it will wait.
- **Never conclude "unfunded" from a run that ended `synced: false`.** Read
  `syncProgress`: if `shielded.appliedIndex` is well below
  `highestRelevantWalletIndex`, the balance is a partial read.
- **Do not request more tNIGHT** because a status run timed out.
- Budget the sync **per process**. Running the relayer server *and*
  `deploy:preview` means two cold wallets, ~27 minutes each, and the deploy
  refuses to start until the relayer's `/health` reports DUST.

Funded unshielded address:
`mn_addr_preview1r7lyp9rnaphxpzjhn4u39tggjwt05zl630tekhme9z275rj5p4eqr97gss`

**Still true:** the wallet holds one DUST coin, so two submissions in quick
succession can contend and return error 170, and only a relayer restart clears
it. Serialise everything.

## 4. What landed

### Light is the default tone

The cream palette was being replaced by the dark one on any device set to dark.
Absence of a stored preference now resolves to light; `system` remains available
as a deliberate choice and is persisted explicitly, so "asked for the device"
and "never asked" stay distinguishable. `ui/index.html`'s pre-paint script and
`DEFAULT_THEME` in `ui/src/integration/theme.ts` must agree — nothing tested
theme before, so this could regress silently; it is covered now.

### Verify, and the document journey

The centre action names itself (`Chrome.tsx`, `chrome.css`) and opens
`DocumentVerificationJourney` — nine screens following the Référendum Citoyen
reference the user supplied: three teaching steps with the retention warning,
a skippable video slot, camera permission, photo-page capture, chip read.

Real: `ui/src/integration/camera.ts` (secure-context, permission, no-device,
in-use guards, each with its own recovery), `ui/src/integration/mrz.ts` (TD3
parser verifying all four ICAO 9303 check digits, tested against the published
Doc 9303 specimen rather than a self-generated fixture),
`ui/src/integration/mrz-recognition.ts` (native `TextDetector` where present).

**The chip screens hand off to RariMe.** A browser cannot read a passport chip —
it needs NFC with smart-card commands the web does not expose. No simulated chip
read ships. Manual entry is offered as the weaker read and says so.

Wired into demo and showcase. **Preview and undeployed keep their existing
enrolment screen**, which already performs the real handoff and cannot be
exercised until CICO is hosted — see §6.

### French

`CicoLocale` is now `'en' | 'es' | 'fr'`. Widening the union made TypeScript
enumerate every copy table, so nothing was silently left English: 13 tables, the
language toggle, the tab title, and date formatting. `PreviewPassportJourney`
carried its copy as ~53 inline `en ? … : …` ternaries; those became
three-argument `pick(…)` calls rather than a restructure mid-submission.

### Activity

It already received the whole poll list and used it only for a title. It now
shows consultation status (via the existing `getPollAvailability`), the closing
date, the real tally where a contract exists, and says plainly that a vote
cannot be changed.

**Vote changing is not implementable.** The nullifier at
`contracts/referendum-v2/referendum-v2.compact:293-303` makes a second vote
impossible, `spentVoteNullifiers` is insert-only, there is no `changeVote`
circuit, and the receipt store deliberately never records the choice. It needs a
protocol change and a redeploy, not a UI change.

## 5. Preview deployment — the exact state

**Ran, and failed at its first submission.** The node rejected it with
`Invalid Transaction: Custom error: 170` (`InvalidDustSpendProof`). **Nothing
reached the chain** — the manifest holds no address and an empty transcript, so
there is still no Preview deployment claim.

The cause is not a code defect. The deploy needs two wallets alive at once: the
relayer service, which balances and submits, and the script's own operator
wallet. Both were pointed at the one seed proven to be funded, and that wallet
holds **one DUST coin**. Two processes cannot share it: the relayer balanced
against a coin state the operator had already moved.

**`V2_OPERATOR_FEE_SEED_HEX` now points at a dedicated operator wallet**, freshly
generated so the two can never contend again. It needs funding — this is the one
action that unblocks the deployment:

```
mn_addr_preview1z80zenqvedqjg8veyz474gufl33f5qx70deuzzyvjwaekf6m0j4sr5jnww
```

Send Preview NIGHT from the faucet, register it for DUST, then re-run
`npm run deploy:preview`. Budget ~27 minutes of cold sync per process.

The relayer's own wallet is now in the stale state error 170 leaves behind:
restart the relayer before the next attempt rather than waiting.

Everything else is cleared:

- Proof server healthy on `:6300` (container `referendum-proof-server`).
- Relayer synced, `readyToSubmit: true`, 9.7 DUST.
- `.env.v2.preview` has all 17 required keys. The 11 that were missing are
  locally generated hex/ids/dates — no external credential was ever needed.
- `V2_OPERATOR_FEE_SEED_HEX` points at a dedicated, **currently unfunded**
  wallet (address above). It was briefly set to the relayer seed, which is what
  caused the failure; do not point it back.

Three snags cost a run each, all fixed:

1. `V2_FIXTURE_VALID_FROM/UNTIL` must be whole-second ISO — no milliseconds.
2. Preview manifests reject a non-HTTPS `V2_API_URL`. It is set to
   `https://cico.cardanoschool.org`, which **is not hosted**. It is runtime
   configuration in the manifest, not a claim that anything answers there.
3. A failed run leaves an `in-progress` manifest whose metadata then blocks the
   next run. If `Existing manifest referendum metadata does not match`, check
   `deploy/passport-v2/preview.manifest.json` — if it has no addresses and an
   empty transcript, nothing is on chain and it is safe to delete.

**Next session, first thing:** fund the operator address above, restart the
relayer, and re-run. Then fill in
[`evidence/preview-2026-09-01/README.md`](evidence/preview-2026-09-01/README.md)
from the manifest's addresses, transaction ids, and tally, and update the two
places that still say nothing is deployed:
`PREVIEW-AND-BACKEND-READINESS.md:10` and `SUBMISSION.md:220`. Delete a stale
`in-progress` manifest first if one is present — if it carries no address and an
empty transcript, nothing is on chain.

## 6. Open, in priority order

1. **Fund the operator wallet and re-run the Preview deployment**, then record
   the evidence. This is the single highest-value item and it is now one faucet
   request away. Until the manifest and the explorer both confirm it, nothing
   may be described as a live Preview deployment.
2. **A second finalized referendum.** The deploy script drives the whole
   lifecycle (`castVote` → `closeVote` → `revealVote` → `finalizeVote`) and
   honours `V2_WAIT_FOR_SCHEDULE`. A second run on a ~10-minute schedule with a
   distinct `V2_REFERENDUM_ID`, `V2_EVENT_ID_HEX`, and `V2_MANIFEST_PATH` yields
   a real tally the Activity screen can read.
3. **Host CICO**, then bring the nine-screen journey in front of the Preview
   enrolment path. Both are blocked on the same thing.
4. **Record the walkthrough video.** Screen 4 ships a labelled placeholder; a
   stock clip would misrepresent our own flow.
5. **Physical NFC on real hardware.** Unevidenced, and stays labelled so.

## 7. Verification actually run

- `npm test` — every group passed (223 UI, 152 + 63 + 37 + 28 + 6 + 3 elsewhere).
- `npm run test:e2e` — 4 Chromium journeys passed, 5 skipped by design.
- `npm run quality`, `tsc -b`, and a clean `ui` production build.
- Linux/WSL gate before push.
- In-browser: light theme confirmed with cleared storage on a dark-emulated
  device; the nine screens walked end to end in Spanish; French confirmed across
  the shell; a demo vote produced an Activity card showing status, closing date,
  and the sealed-vote statement.
- **`getUserMedia` was genuinely invoked.** The Browser pane denies camera
  capture, and the app classified that real denial as `denied` and offered the
  right recovery. A live preview still needs a real device.

## 8. Four defects the work surfaced

Worth knowing, because three were invisible until something exercised them.

1. `ui/public/.htaccess` set `Permissions-Policy: camera=()` — it would have
   blocked the camera outright on the origin a juror opens.
2. `video.play()` returns `undefined` in older Safari and jsdom; `.catch` on it
   threw out of an animation frame where nothing could recover it.
3. The camera preview was closed in the tick it opened: an effect cleanup fired
   on the transition *into* the capture step. Two effects now.
4. Discovery and Activity disagreed about the same consultation's closing date,
   and a deployed referendum would have read as permanently open because
   `toRuntimePolls` ignored the contract's own schedule.

## 9. Working rules that still hold

- The Windows pre-push hook cannot run the Linux gate. Run
  `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash scripts/verify-linux-wsl.sh demo`,
  confirm `Linux demo verification passed`, then push with `--no-verify`. Never
  `--no-verify` without having run it.
- Midnight Passport runs stagenet/ledger-9 and cannot supply a Preview address,
  and does not implement the DApp Connector. It cannot carry the ZK attestation;
  Rarimo does. Keep `profileFields` at `displayName`.
- The active checkout is `tmp/midnight-referendum-app-review`. The WSL copy went
  stale on 30 August and is needed only for the pre-push gate.
