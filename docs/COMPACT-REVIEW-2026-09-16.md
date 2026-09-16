# Compact submission review — 16 September 2026

**Reviewed source:** `ac1578553629c2f0005737461474c635d3aa6a6a` (PR #31). **Scope:** the three Compact sources, their simulator tests, the V2 witness adapter, and recorded deployment evidence. This is a bounded implementation review, not an independent security audit or a production-readiness certificate. No contract was changed in this review.

## Submission conclusion

The repository contains a working, tested Compact implementation beyond the browser demo: credential issuance, credential-policy membership proofs, event-scoped replay prevention, committed ballots, reveal/tally, and lifecycle controls. The submission should distinguish those implementation results from the demo experience and from dated local-chain evidence. It should not claim current public-network deployment, physical NFC verification, permanent ballot secrecy, or trustless credential admission on this evidence.

Keep the submission in demo mode. Resolve the live-release gates below before presenting the implementation as suitable for binding elections.

## Circuit inventory

| Source | Exported circuits | Implemented boundary |
| --- | --- | --- |
| `contracts/referendum/referendum.compact` | `issue`, `castVote`, `closeVote`, `revealVote`, `finalizeVote` | Legacy reference: issuer-controlled eligibility, depth-10 trees, event nullifier, organizer-controlled transitions. |
| `contracts/credential-registry-v1/credential-registry-v1.compact` | `addCredential`, `attestCurrentRoot`, `freeze` | Issuer-authorized claim-bound credential commitments; depth-16 current-root tree; irreversible freeze. Attestation checks this registry's current root but does not enforce publication elsewhere. |
| `contracts/referendum-v2/referendum-v2.compact` | `castVote`, `publishCredentialRoot`, `revokeCredentialRoot`, `closeEnrollment`, `closeVote`, `revealVote`, `finalizeVote` | Policy checks, accepted/revoked root sets, separate publisher/organizer authority, depth-16 ballots, time-gated voting and permissionless phase transitions. |

Each source also has a constructor and private helper circuits. No reviewed contract implements a passport chip reader, issuer-document signature verification, liveness detection, AI adjudication, or proof of one natural person per credential. Those are service/integration responsibilities or future work.

## Evidence and reproducibility

| Check | Result | What it establishes |
| --- | --- | --- |
| [PR #31 CI job](https://github.com/tomasgarro/midnight-referendum-app/actions/runs/35068664679/job/104704743304), reviewed in the enclosing submission investigation | Compact 0.31.1 compiled all three contracts; legacy 3 and V2 28 simulator tests passed. The later UI test failed. | Dated CI compilation and simulator evidence for the reviewed revision; the red job is not a Compact compilation failure. |
| Local `npx.cmd vitest run contracts/referendum/referendum.test.ts contracts/passport-v2-contracts.test.ts --exclude '**/outputs/**'`, 16 September 2026 | **2 files, 31 tests passed**, 13.19 seconds | Local execution of the existing generated contract artifacts and current simulator test sources. |
| Local `npm.cmd run test:sim` and `npm.cmd run test:sim:v2:compiled` | Passed, but also discovered copied tests under `outputs/design-20260915/release-check` | Raw totals of 6 and 56 include duplicates. The scoped result above is the relevant count. |
| Fresh local Compact compile | Not performed | Native `compact.exe` resolves to the Windows compression utility, not the Midnight compiler. Existing generated artifacts were not freshly rebuilt here, so local execution alone does not certify their source provenance. |
| [Saved Undeployed transcript](evidence/undeployed-v2/abdd0a2/undeployed-v2.transcript.md) | Records local-chain deploy → issue → freeze → cast → close → reveal → finalize and replay rejection on 29 August 2026 | Historical evidence for source `abdd0a2203fbef909f70f6ddc06681ac1327f457`, not the current revision and not Midnight Preview or physical NFC evidence. |

Local simulator runs emitted missing-source sourcemap warnings; assertions passed. No fresh proof generation, ZKIR constraint analysis, device test, current public-network transaction, or concurrent transaction stress test was performed in this review. A complete independent witness-verification verdict is therefore not claimed.

The existing tests cover credential-leaf golden vectors and claim changes; issuer authorization; current versus historic registry roots; voter binding, root and policy rejection; event-bound commitments/nullifiers; replay; schedule boundaries; late enrollment; root revocation and role separation; and phase/tally consistency. Simulator witnesses and synthetic block times are not equivalent to live wallet/proof-server evidence.

## Privacy: what is actually public

At commit, V2 keeps the raw holder opening, credential claims, selected choice, vote salt, and membership path within the witness/commitment computation. It discloses the accepted root, vote nullifier, policy predicate results and public state changes. The published policy itself can reveal attributes by implication: for example, a successful proof under an exact-country policy establishes membership of that country category.

At reveal, `revealVote` explicitly discloses the **choice** as the tally map key, discloses the ballot commitment for replay protection, and increments the public tally (`referendum-v2.compact:407–425`; equivalent legacy flow at `referendum.compact:141–163`). Therefore “only aggregates are public” and “a ballot never becomes public” are inaccurate. Individual reveal transactions expose selected buckets even though the circuit does not explicitly publish a voter identity or eligibility leaf with them. Timing, transaction funding, network metadata and off-chain service correlation need a separate threat analysis; source review does not establish anonymity against those channels.

V2 credential and holder bindings use blinded `persistentCommit`; V2 ballots bind event and choice with a salt (`referendum-v2.compact:129–164`). Vote nullifiers hash the voter secret and event domain (`:293–303`). This prevents reuse of the same secret in the same event; it is not a proof that the issuer cannot create multiple credentials for one person. Event identifiers must be managed correctly across deployments.

The production-facing V2 witness adapter returns `[privateState, value]` and uses byte arrays, bigint claims and enum conversion (`api/src/passport-v2/midnight-v2.ts:116–178`). It guards missing voter material. The civic-action adapter defaults to `crypto.getRandomValues` for vote salts (`midnight-civic-action-adapter.ts:162,294–300`); fresh secure randomness and protected recovery remain operational requirements.

## Findings and live-release gates

### High — admitted root provenance is trusted, not enforced by the referendum

- **Evidence:** `referendum-v2.compact:63–90,313–334` accepts roots using publisher authority; membership is checked against that accepted set. The constructor also admits its initial root directly (`:216–217`).
- **Impact:** a compromised publisher can admit a fabricated credential tree. A successful membership proof then proves membership of the admitted tree, not necessarily the intended issuer registry. This is an explicitly acknowledged architectural limitation, not a newly discovered secret.
- **Mitigation/gate:** preserve the off-chain attestation audit and document its trust boundary. The publisher service attests in a separate transaction before publishing (`cico-service/src/credential-root-publisher.ts:153–157,330–377`). Do not describe that service discipline as an on-chain provenance guarantee. Define incident detection and redeployment procedures before live use.

### Medium — reveal deadline is a finalization eligibility time, not a strict reveal cutoff

- **Evidence:** `revealVote` has phase/closed checks but no `blockTimeLt(revealClosesAtUnix)` (`referendum-v2.compact:407–425`). Only `finalizeVote` checks the deadline (`:433–440`). Existing lifecycle tests reject reveal after finalization, not after the timestamp while still in REVEAL (`contracts/passport-v2-contracts.test.ts:518–575`).
- **Impact:** until someone finalizes, a valid reveal can still be accepted after the advertised reveal end; once finalization occurs it cannot. Ordering can affect which late reveals count. This does not permit an early finalization.
- **Fix/gate:** explicitly choose and specify strict cutoff versus minimum guaranteed reveal period. For strict cutoff, add the time guard and boundary tests, regenerate artifacts, and rerun contract/proof evidence before deployment. For this demo submission, document the current semantics without claiming a hard cutoff.

### Low — attestation comments contradict the implemented transaction sequence

- **Evidence:** registry comments at `credential-registry-v1.compact:84–93` describe SAME-transaction composition. V2 comments at `referendum-v2.compact:74–81` and the publisher service describe separate transactions with reference pairing. Registry freeze comments also refer to a historic tree although the declared registry is `MerkleTree`.
- **Impact:** reviewers can infer a stronger atomicity/provenance guarantee than the implemented service provides.
- **Fix:** align source comments and diagrams with the separately attested publication and current-root checks. Contract comments were left unchanged in this documentation-only review.

### Policy decisions that require explicit specifications

- `validityReference` is a sealed organizer-selected cutoff, not current block time (`referendum-v2.compact:234,270`). A credential can satisfy this check after its wall-clock expiry if it met the selected reference. Specify the intended reference (for example the voting deadline) and validate deployment configuration.
- `closeEnrollment` may be called early by the organizer (`:381–389`). Root revocation checks the timestamp but not `enrollmentClosed` (`:352–375`). Thus manual closure stops new admissions but does not itself lock revocations until the scheduled deadline. Document that authority or tighten the invariant before live use.
- Root revocation does not revoke an individual credential and does not undo ballots already cast. The append-only registry and retained roots require an explicit incident policy.
- A committed ballot contributes to the tally only if revealed. Define recovery, reveal responsibility, non-reveal reporting and the meaning of turnout before any binding use. No automatic full-tally guarantee follows from these circuits.
- Read/modify/write tally updates and shared root sets need contention testing under a real multi-user workload. Passing sequential simulator cases does not establish throughput or transaction fairness.

## Positive highlights

The code separates issuance, enrollment publication and organization roles; binds V2 ballot commitments to an event; constrains credential claims through the committed leaf; rejects replay across accepted roots; preserves a nonempty accepted-root set and permanent revocation; and prevents early vote closure/finalization with permissionless transitions after their gates. The test suite includes meaningful negative cases rather than only happy paths. These are concrete implementation achievements suitable for the submission, with the limits above stated alongside them.
