# Wave 1 evidence checklist

This checklist is a release worksheet. A historical Undeployed v2 lifecycle has
an operator-verified local run, and its sanitized manifest/transcript are
preserved at [docs/evidence/undeployed-v2/abdd0a2/](evidence/undeployed-v2/abdd0a2/).
That SHA-specific record uses the older frozen-enrollment model; this checklist
must not be read as a current-branch or final Preview release record.
The active status summary is the four-row table in the [root
README](../README.md). Historical v1 Preview values are preserved separately in
[LEGACY-V1-PREVIEW-EVIDENCE.md](LEGACY-V1-PREVIEW-EVIDENCE.md).

## Evidence record

Leave release identity, reviewer, and date fields blank until the evidence is
deliberately attached to the release record. Never record secrets, voter
material, raw provider data, document images, or ballot choices.

| Field | Value |
| --- | --- |
| Review checkout / branch | Record the actual checked-out branch at release time |
| Release SHA | not assigned |
| Evidence source SHA | `abdd0a2203fbef909f70f6ddc06681ac1327f457` (tree `9d1319aa3540a0943f760631ec3ac9c9e5b40b36`) |
| Manifest digest | `d2cb84585d41f76dace23fed49c780e451cc4883efc7b7b5314a9e6d2544e21d` |
| Sanitized manifest path | `docs/evidence/undeployed-v2/abdd0a2/undeployed.manifest.json` |
| Sanitized transcript path | `docs/evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.json` (human-readable form at `undeployed-v2.transcript.md`) |
| Runtime environment | Current source target; historical Undeployed v2 run preserved separately |
| Reviewer | |
| Review date | |

## Required gates

### Source and privacy boundaries

- [ ] README and this checklist distinguish historical v1, synthetic demo,
      current open-enrollment source, historical Undeployed v2 evidence, and
      Passport/Preview/NFC gates.
- [ ] No current document claims a Preview transaction, deployed address,
      release SHA, CI status, test total, hosted URL, video, Passport origin
      approval, Preview deployment, or physical NFC evidence without a
      committed source; the committed local Undeployed v2 identifiers stay
      scoped to that lifecycle and are not restated as Preview evidence.
- [ ] Browser profile/session fields remain separate from credential and ballot
      material.
- [ ] Voter secret, credential opening, witness, choice, salt, raw MRZ/NFC data,
      and provider proof do not enter logs, public assets, or the relay API.
- [ ] A receipt is called confirmed only after independent indexer observation.

### Synthetic demo

- [ ] Start the UI with `npm run dev -- --host localhost --port 4173
      --strictPort`.
- [ ] Confirm synthetic credential and simulated vote labels remain visible.
- [ ] Confirm no demo state is described as a real credential, Passport
      approval, NFC verification, deployed contract, or canonical receipt.

### Historical Undeployed v2 runtime evidence

- The preserved SHA-specific record reports that the pinned services and the
  registry deploy/issue/freeze, referendum deploy/cast/replay rejection/close/
  reveal/finalize lifecycle completed; the local indexer confirmed the action;
  and the capability-gated relay passed DUST, concurrency, and restart checks.
  This is historical frozen-model evidence, not a current-branch run.
- [ ] Confirm the runner fails closed when local genesis funding is absent.
- [x] Sanitize and review the generated manifest/transcript; the reviewed
      evidence is committed at `docs/evidence/undeployed-v2/abdd0a2/`.
- [x] Deliberately stage and commit only the reviewed public manifest/transcript;
      keep private env files, keys, voter material, witnesses, raw provider
      data, and local database state ignored.
- [ ] Record only public transaction identifiers and indexer observations from
      the committed manifest; do not copy them into active docs by hand.

### Passport, Preview, and physical evidence

- [ ] Verify the real Passport profile/session from the final approved origin.
- [ ] Verify any account/network response against the selected environment.
- [ ] Confirm CICO registration/approval in the relevant Passport directory.
- [ ] Verify a real provider/credential issuer path; fixture evidence cannot
      satisfy this gate.
- [ ] Complete a physical-device/NFC transcript and retention/deletion review.
- [ ] Run a fresh Preview issue/vote/close/reveal/finalize transcript only after
      the local v2 gates and independent review are complete; the verified local
      run does not satisfy this gate.
- [ ] Record hosted URL, release SHA, CI links, and walkthrough video only when
      they actually exist and are attached to the release record.

## Handoff

Every completed run must report exactly:

1. changed files;
2. commands and their observed outcomes;
3. evidence files and reviewer;
4. privacy/security invariants checked; and
5. unresolved risks and the next dependency.

The operator must not infer evidence from source code, test names, screenshots,
or an unreviewed generated file. See [ENVIRONMENT-ACCEPTANCE.md](ENVIRONMENT-ACCEPTANCE.md),
[DEPLOYMENT.md](DEPLOYMENT.md), and [ROADMAP.md](ROADMAP.md) for the detailed
acceptance model.
