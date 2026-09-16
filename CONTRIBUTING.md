# Contributing

Start with the [product specification](docs/specs/PRODUCT-SPEC.md), [architecture](docs/ARCHITECTURE.md) and [quick start](docs/QUICKSTART.md).

## Specify the change before implementing it

1. Describe the participant or operator problem in ordinary language.
2. Identify affected requirement IDs. For new behaviour, use the [change template](docs/specs/CHANGE-TEMPLATE.md).
3. Write observable success, rejection and recovery scenarios.
4. Explain changes to disclosure, storage, authority or provider trust. Record an [ADR](docs/adr/) when the decision outlives the feature.
5. Implement and verify. Update requirements and evidence in the same PR.

The initial specification was extracted from existing behaviour on 16 September 2026. It starts this process; it does not claim all earlier code was developed spec-first.

## Describe evidence precisely

| Label | Use it when |
| --- | --- |
| Working demo | A person can exercise the simulated behaviour. |
| Source-tested | Identified source or generated artifacts passed identified checks. |
| Historical | The result belongs to an older revision or environment. |
| Planned | Acceptance has not been demonstrated. |

Record source revision, environment, procedure, result and artifact. Distinguish existing-artifact execution from fresh compilation, local checks from CI, and both from deployment. Never include secrets, document images, holder openings or raw provider evidence.

## Verify the changed behaviour

Use [CI](.github/workflows/test.yml) as the reference environment. Select checks appropriate to the change:

- Documentation: relative links, referenced files and commands, diagrams, consistent status and `git diff --check`.
- UI: affected unit tests, type/build checks and relevant browser journeys.
- Contracts: regenerate artifacts, test success and rejection boundaries, then obtain integration evidence.
- Services: authorization, replay, retries, timeouts, restart behaviour and disclosure checks.

Wait for observable asynchronous results rather than adding fixed delays. Keep unrelated failures visible with their known cause; do not label the entire candidate green.

## Prepare a reviewable pull request

Lead with the problem and resulting behaviour. Include requirement IDs, verification results, limitations and release impact. For documentation-only changes, identify that scope explicitly. Keep presentations, local research outputs and private environment files out of the commit.
