# Change specification template

Copy this into a new specification and replace the prompts. Keep small changes small; the purpose is reviewable behaviour and evidence.

## Status and owner

Proposed / accepted / implemented / verified. Name the owner, source baseline and affected requirement IDs.

## Problem and outcome

Who encounters the problem? What can they not do today? What observable result should change?

## Scope

List the behaviours delivered and related behaviours left for later.

## Acceptance scenarios

| ID | Given | When | Then | Verification |
| --- | --- | --- | --- | --- |
| Requirement | Initial state | Concrete action | Observable outcome | Test or recorded procedure |
| Rejection | Invalid or unauthorized input | Attempted action | Explicit failure without side effects | Negative test |
| Recovery | Timeout or interruption | Retry or resume | Defined idempotent outcome | Recovery test |

## Data and authority

What crosses each component boundary? Who authorizes the action? What becomes public? What is stored, for how long, and how is it deleted? Does an ADR need to change?

## Failure and compatibility

Specify pending, rejected and unavailable states. Describe migration or rollback when stored data, interfaces or contract state changes.

## Evidence required to ship

Identify environment, source revision, artifacts, checks and the claim they would justify. Leave results empty until the checks exist.

## Open decisions

List unresolved choices and their owners. An unresolved authority or security decision is not an implemented guarantee.
