# Session handoff — state, verification status, and next work

Written 2026-08-30. This is the pick-up document for the next session. It
records what landed, what was actually verified versus merely reported, what is
still open, and the working rules that keep the next session from re-deriving
them.

---

## 1. Where the branches are

| Branch | Contents | State |
| --- | --- | --- |
| `feat/open-enrollment` | Open enrollment, root publisher, evidence fixes, UI restructure, plain-language onboarding | Committed through `2049a33` |
| `feat/capybara-mascot` | Capybara mascot component, six illustrations, design QA | Committed at `d475e0a`, **not yet pushed** — see §5 |

Commits on `feat/open-enrollment`, newest first:

- `2049a33` feat: three tabs and plain-language onboarding
- `46de084` feat: publish new credential roots so late enrollees can vote
- `d505f6f` fix: anchor the evidence schedule at deployment, not startup
- `76700e1` fix: surface sanitized output when an evidence step fails
- `46818bc` feat: keep enrollment open while a referendum runs

`d475e0a` sits on top of `2049a33` on its own branch.

---

## 2. What landed

### 2.1 Referendum zk config separation (cico-service)

The service reused `runtime.providers` when constructing a referendum executor.
Those providers are rooted at `CICO_ZK_CONFIG_PATH`, which points at the
**credential-registry-v1** managed directory — it holds `addCredential`,
`freeze`, and `attestCurrentRoot` only. The referendum-v2 circuits
(`publishCredentialRoot`, `castVote`, …) are compiled into a separate managed
directory. `NodeZkConfigProvider` resolves circuit files directly under its
fixed directory with no per-contract awareness, so the root publisher would have
failed at its first publish, looking for `publishCredentialRoot.prover` under
the registry's keys.

Landed in `46de084`:

- `CICO_REFERENDUM_ZK_CONFIG_PATH` in `cico-service/src/config.ts`, required
  only when referenda are configured, resolved to an absolute path.
- A startup existence check in `server.ts` — a missing key directory fails at
  boot rather than at the first publish, because a silent failure there means
  enrolled voters are never admitted.
- A dedicated `NodeZkConfigProvider` **and** a dedicated
  `httpClientProofProvider` for the referendum, both swapped into the executor's
  providers.

**The proof provider is the part worth remembering.**
`httpClientProofProvider(url, zkConfigProvider)` takes the zk config provider as
its second argument and closes over it — it fetches each circuit's prover key
and zkir *through* that provider. Swapping only `zkConfigProvider` looks correct
and still fails at runtime. Any future code that reuses one contract's providers
for another contract must swap **both**.

Registry-side wiring is untouched. `.env.example` now documents the whole
root-publisher block, which was previously undocumented.

### 2.2 UI restructure and plain-language onboarding (`2049a33`)

Three tabs: Explore · Vote · Profile. Verify was not deleted — its receipt
lookup and explanation moved into Profile, where personal receipts already
live, and every route that pointed at Verify now points at Profile.

Onboarding leads with the problem rather than the mechanism. Jargon removed
from user-facing copy: zero-knowledge, Merkle, nullifier, registry, circuit,
witness, root, epoch, and "Midnight". "Fixture" became "test". Seven stages,
handlers, and focus management were left untouched; the honest "this is
simulated" disclosures survived in plainer words.

Profile carries an explicit privacy line, without which a personal vote history
reads as though the system records who voted what.

The nav lane also caught a real bug: `.bottom-nav` was still
`repeat(4, 1fr)` after dropping to three tabs, which would have left a dead
empty column at 320px.

Public results were not just asserted to stay public — the lane traced the code
path and added a test that loads Explore with no Passport session and no
credential and confirms results render.

### 2.3 Capybara mascot (`d475e0a`, unpushed)

`ui/src/components/mascot/CapybaraMascot.tsx` — one component, six variants
(`waving`, `reading`, `thinking`, `achievement`, `climbing`, `waiting`), backed
by six 1024×1024 PNGs under `ui/src/assets/mascot/`. Wired into the onboarding
welcome and both credential-success stages, replacing the reserved slot that
held a 🦫 — a beaver, not a capybara, and exactly the detail a judge notices.

Alt text is treated as a decision: decorative where nearby copy already carries
the state, localized where it does not. `design-qa.md` and `qa/*.png` record the
comparison against the source sticker.

### 2.4 Documentation

`docs/MASCOT-AND-AVATARS.md` holds the art brief: style reference from the
physical sticker, six variants mapped to onboarding moments, and a reusable
generation prompt. Two cautions are recorded there rather than left implicit:

- **Do not call them NFTs.** They are locally generated images; the word invites
  minting and ownership questions a privacy product does not want.
- **Never derive an avatar seed from credential material.** An avatar keyed to a
  credential becomes a correlation handle across consultations — the exact
  linkage the protocol exists to prevent.

---

## 3. Verified vs. reported

Be precise about this; it matters for what the next session can trust.

**Verified in-session, by running the command:**

| Check | Result |
| --- | --- |
| `npx tsc --noEmit -p cico-service/tsconfig.json` | Clean |
| `npm run test --workspace midnight-referendum-cico-service` | 56/56 pass |
| `npx tsc --noEmit -p ui/tsconfig.json` | Clean |
| `npm run test --workspace midnight-referendum-ui` | 143/143 pass, 23 files |
| `npx biome check` on all changed files | Clean |

**Reported by the parallel lanes, not independently re-run here:** the full
331-test workspace run and the production build after the UI restructure. Both
lanes initially reported failures they attributed to each other running
concurrently; the six real failures were stale assertions on copy the copy lane
had deliberately changed, in test files neither lane owned. The assertions were
updated to the new copy rather than reverting the copy.

**Not verified at all:**

- `npm run verify:linux` — the pre-push gate. It could not run at all until the
  WSL toolchain was fixed mid-session; see §5.
- Playwright E2E (`npm run test:e2e`).
- Anything on Preview: no live deployment, no live Passport session, no
  operator-verified root publish against a real referendum.

**Two known-clean-but-noisy signals:** the repo-wide biome hook reports 17
pre-existing warnings (`useConst` in
`cico-service/src/credential-root-publisher.test.ts` among them). They predate
this work and were left alone.

---

## 4. Open items, in the order they should be picked up

1. **Push `feat/capybara-mascot` and open its PR.** See §5 for the gate.
2. **Enrollment states + schedule countdown.** The functional gap: a 15-minute
   wait currently looks like a failure. This is the highest-value remaining
   work — it is the difference between "the demo broke" and "the system is
   working, here is when it finishes".
3. **Midnight tone pass on copy.** Their register is quiet confidence about
   necessity rather than hype — declarative, problem-first, privacy framed as
   infrastructure rather than a feature. Representative line from their blog:
   "Public blockchains make digital activity auditable, but they also make that
   activity visible." The planned adjustment is to lead with the problem the way
   they do rather than the mechanism — e.g. "Voting online means handing over
   who you are. It doesn't have to." — then the promise. Do this **after**
   enrollment states, since both touch copy and splitting them by file ownership
   is what produced the stale-assertion failures last time.
4. **Preview deployment.**
5. **Housekeeping, cheap:** `t.mascotPlaceholder` in
   `UnifiedPassportOnboarding.tsx` (both locales) is now dead, and
   `.mascot-reserved-slot` in `ui/src/index.css:1939` is likely dead with it.
   Confirm before deleting.
6. **Worth a decision, not urgent:** the six mascot PNGs are ~1 MB each, ~6 MB
   total, shipped into a mobile-first bundle. They are lazy-loaded except the
   welcome variant, but WebP or a resize would cut this by roughly an order of
   magnitude.

Sol's lane — the Rarimo verificator at
`C:\Users\tomas\Desktop\Midnight\rarimo-verificator\`, deliberately outside the
repo so it cannot collide with UI edits — is being pushed separately. Note that
the mascot assets and component **already landed in this repo's working tree**
and are committed on `feat/capybara-mascot`; if Sol also pushes them, the two
will need reconciling. Check before merging both.

---

## 5. The WSL toolchain, and what was changed on this machine

`git push` runs a Husky `pre-push` hook that calls
`bash scripts/verify-linux.sh demo`. The script hard-requires Linux:

- `uname -s` must be `Linux` — it fails under Git Bash on Windows.
- Linux Node >= 22 from nvm, and it explicitly rejects a Windows Node or npm
  leaking in through `/mnt/...` on the WSL PATH.
- A working Compact compiler, because generated contract assets are not tracked.

Two things had to be fixed to make that gate runnable, and **both are persistent
machine changes, not repo changes**:

1. **Linux Node installed.** nvm was already present at `~/.nvm` in WSL Ubuntu
   but had no Node runtime, so `node` resolved to nothing and `npm` resolved to
   `/mnt/c/Program Files/nodejs/npm`, which the script rejects by design.
   `nvm install 22` installed v22.23.2 and it is now the WSL default.
   `compact` 0.31.1 was already at `~/.local/bin/compact`.

2. **Linux platform binaries added to `node_modules`.** The tree was installed
   from Windows, so it carries only win32 native binaries. Running the Linux
   gate against it failed on rollup, then esbuild, then biome — each one only
   surfacing after the previous was fixed. Four packages were extracted in
   place, alongside the existing win32 ones rather than replacing them:

   - `node_modules/@rollup/rollup-linux-x64-gnu` @ 4.62.4
   - `node_modules/esbuild-linux-64` @ 0.14.54
   - `node_modules/vite/node_modules/@esbuild/linux-x64` @ 0.28.1
     (Vite bundles its own esbuild at a different version than the root one —
     0.28.1 vs 0.14.54 — so both are needed.)
   - `node_modules/@biomejs/cli-linux-x64` @ 2.5.10, needed by the hook's
     `npm run quality` step rather than by `verify-linux.sh` itself.

   These are untracked and invisible to git. **A clean `npm install` from
   Windows will remove them and the gate will start failing again** with
   `Cannot find module @rollup/rollup-linux-x64-gnu`. When that happens, re-fetch
   with `npm pack` inside WSL and extract with `tar --strip-components=1` into
   the paths above. The versions must match what the Windows tree resolved to;
   read them from the respective `package.json` files rather than assuming.

The durable fix is a separate Linux-side `npm install`, which would mean a
second `node_modules` tree or a checkout inside the WSL filesystem rather than
on `/mnt/c`. That is also the fix for speed: the gate runs the whole suite
across the Windows mount, which is slow enough to be worth avoiding.

**The hook must run inside WSL, not Git Bash.** Installing Linux Node does not
make `git push` from Git Bash work: the hook still executes there, where
`uname -s` is `MINGW64` and the script refuses to run. The push itself has to be
issued from WSL, with the Windows credential manager supplied explicitly:

```
git -c credential.helper="/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe" push -u origin <branch>
```

**A third gotcha, and a real one:** `.husky/pre-push` and `.husky/pre-commit`
were sitting in the working tree with CRLF line endings, so `dash` — which WSL
git uses to run hooks — died with "Illegal option -", choking on the trailing
carriage return after `set -e`. The index holds LF and `.gitattributes`
already says `* text=auto eol=lf`, so this is a local working-tree
corruption from some Windows-side tool, not a repo defect;
rewriting the two files as LF fixed it and produced no diff. If the hook ever
fails under WSL with `Illegal option`, check `git ls-files --eol .husky/` before
looking anywhere else.

Running the gate by hand, rather than through the hook:

```
wsl -d Ubuntu -- bash -lc 'cd /mnt/c/Users/tomas/Desktop/Midnight/tmp/midnight-referendum-app-review && bash scripts/verify-linux.sh demo'
```

From Git Bash, prefix `wsl.exe` invocations with `MSYS_NO_PATHCONV=1` or it
rewrites `/mnt/c/...` into a Windows path and the command fails with a confusing
"No such file or directory".

The bypass (`git push --no-verify`) exists but should be a deliberate, stated
choice, not a default. The gate's unique contribution over a Windows-side
tsc + vitest run is `npm run validate:contract`, which compiles the Compact
contracts and runs the simulator tests. That reasoning has to be made
explicitly each time, and it stops being true the moment a commit touches
`contracts/`.

---

## 6. Working rules for the next session

**Contract and SDK work**

- Check `docs/COMPATIBILITY-MATRIX.md` before touching any Midnight dependency.
  The stack is deliberately pinned so the app, the generated Compact assets, and
  the three local services do not drift independently. Current line: node
  `1.0.0`, indexer `4.3.3`, proof server `8.1.0`, ledger `8.1.0`, Compact
  runtime `0.16.0`, on-chain runtime `3.0.0`, Midnight.js `4.1.1` family, DApp
  Connector `4.0.1`, Compact CLI/compiler `0.31.1` with language `0.23`.
- **Never take a Midnight package version from memory.** `npm view <pkg>
  version`. The network is under active development with frequent breaking
  changes; assume nothing is stable across versions.
- Use the Midnight skills rather than hand-rolling. For writing or fixing
  Compact: `compact-core:compact-dev`. For mechanical confirmation of any claim
  about Compact, the SDK, or a witness: `/midnight-verify:verify` (or
  `fast-verify` when source inspection suffices). For security review:
  `/compact-core:audit-compact`. For toolchain problems:
  `midnight-tooling:doctor`, `midnight-tooling:compact-cli`,
  `midnight-tooling:proof-server`.
- `compact check` and `compact self check` for compiler and dev-tool versions.
- Generated contract assets are **not tracked**. Anything that touches
  `contracts/` requires `npm run compile:v2` and a full `validate:contract`.

**UI and design work**

- Use the Appllama skill and its MCP for UI design, screens, and components.
  The skill's own prime directive is to study 20–30 real screens before drawing
  anything, which requires the live MCP — so that work belongs in a session
  where the MCP is authorized, not this one. **The Appllama MCP is currently
  unauthorized**; it needs OAuth through `claude mcp` or `/mcp` in an
  interactive session before any of its tools work. Figma and Canva are in the
  same state.
- No image generation tool is available in this session's toolset. Mascot and
  illustration assets come from Appllama, Midjourney, or Sol's side, and drop in
  as a file swap — the component reads from `ui/src/assets/mascot/` by fixed
  filename.

**Process**

- Do not split copy work and structural work across parallel lanes by file
  ownership. Tests that assert on copy live in files neither lane owns, and they
  go stale silently. That has now happened once.
- Run `npx biome check --write` on changed files before committing. The lanes
  produced import-order and line-width violations twice.
- On Windows, do not edit files with a Python script in text mode — it rewrites
  the file with CRLF endings and biome flags every line. Use binary mode, or the
  Edit tool.
- Do not use PowerShell here-string syntax (`@'…'@`) in the Bash tool. It is not
  interpreted, and a commit message written that way lands with a literal `@` as
  its subject line.
