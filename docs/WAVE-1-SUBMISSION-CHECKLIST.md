# Wave 1 evidence checklist

This checklist is a release worksheet, not a claim that the current review
checkout has completed these gates. Runtime evidence for Undeployed v2 is
**in progress and unverified**. The active status summary is the four-row table
in the [root README](../README.md). Historical v1 Preview values are preserved
separately in [LEGACY-V1-PREVIEW-EVIDENCE.md](LEGACY-V1-PREVIEW-EVIDENCE.md).

## Evidence record

Leave fields blank until the run is complete and independently reviewed. Never
record secrets, voter material, raw provider data, document images, or ballot
choices.

| Field | Value |
| --- | --- |
| Review checkout / branch | `feat/undeployed-v2-evidence-release` |
| Release SHA | not assigned |
| Sanitized manifest path | not present |
| Sanitized transcript path | not present |
| Runtime environment | not verified |
| Reviewer | |
| Review date | |

## Required gates

### Source and privacy boundaries

- [ ] README and this checklist distinguish historical v1, synthetic demo,
      current Undeployed v2, and Passport/Preview/NFC gates.
- [ ] No current document claims a transaction hash, deployed address, release
      SHA, CI status, test total, hosted URL, video, Passport origin approval,
      Preview deployment, or physical NFC evidence without a committed source.
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

### Undeployed v2 runtime evidence

- [ ] Run `npm run evidence:undeployed:v2` on Linux/WSL2 with Docker and the
      pinned toolchain.
- [ ] Confirm the runner fails closed when local genesis funding is absent.
- [ ] Confirm node, indexer, proof server, PostgreSQL, issuer, and relayer
      services are the expected local components.
- [ ] Confirm the lifecycle covers registry deploy, issue, freeze, referendum
      deploy, cast, replay rejection, close, reveal, and finalize.
- [ ] Confirm relay jobs are capability-gated, idempotent, DUST-safe across
      concurrency/restart, and pending until indexer confirmation.
- [ ] Confirm the generated manifest contains only reviewed public evidence and
      no secret or private browser material.
- [ ] Review the manifest/transcript, then deliberately stage it if it is safe;
      generated evidence is ignored by default until this review.
- [ ] Record only public transaction identifiers and indexer observations from
      the reviewed manifest; do not copy them into active docs by hand.

### Passport, Preview, and physical evidence

- [ ] Verify the real Passport profile/session from the final approved origin.
- [ ] Verify any account/network response against the selected environment.
- [ ] Confirm CICO registration/approval in the relevant Passport directory.
- [ ] Verify a real provider/credential issuer path; fixture evidence cannot
      satisfy this gate.
- [ ] Complete a physical-device/NFC transcript and retention/deletion review.
- [ ] Run a fresh Preview issue/vote/close/reveal/finalize transcript only after
      the local v2 gates and independent review are complete.
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
