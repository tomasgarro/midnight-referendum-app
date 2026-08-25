# ADR-001: Passport-first product boundaries

- Status: Accepted for Preview v2
- Date: 2026-08-24

## Context

CICO must make Midnight Passport the durable user-facing identity and authorization layer while the required passport-credential and Compact-execution capabilities are still emerging. Rarimo can provide temporary passport evidence, but must not become a permanent domain dependency.

The current Passport profile bridge supports session/profile consent. It is not an authority for nationality, age, private voting witnesses, or arbitrary Compact execution. As of 24 August 2026, the official `midnight-passport-sdk` repository describes the SDK as planning/spec work with a reduced beta defined; its planned packages include a thin DApp connector, but it is not yet a production passport-evidence API that CICO can integrate for nationality or age.

The v2 CICO browser adapter can prepare the private witness and call the Midnight contract through wallet-derived providers. That local implementation and its tests are not a live Preview transaction transcript. The existing legacy relayer also is not an approved sponsored path for Passport v2 because it exposes separate balance and submit operations.

## Decision

The application depends on three provider-neutral ports:

- `PassportSessionPort` for session, consent, and capability negotiation;
- `CivicCredentialPort` for passport-backed credential enrollment and local summaries; and
- `CivicActionPort` for voting, cohort actions, and canonical receipts.

Current adapters are the Passport profile bridge, Rarimo plus the CICO issuer, the encrypted browser vault, wallet-derived Midnight providers, and a browser-owned civic action adapter. The sponsored Passport-v2 relay remains a separate pending workstream. Official Passport-native adapters may replace components independently as capabilities ship.

Passport account, alias, address, and session identifiers are display/session data only. They never enter a credential commitment, Merkle membership leaf, voter secret, ballot commitment, or nullifier derivation.

The UI and use-case layer may not import Rarimo payloads, issuer transport types, relayer transport types, proof-server types, or Compact witness types.

## Consequences

- CICO can launch a Preview vertical slice without fabricating Passport capabilities.
- Rarimo is removable without changing referendum use cases or Compact policy semantics.
- Passport remains visible and central to onboarding while ballot identity stays cryptographically separate.
- Capability-gated adapters and conformance tests are required.
- Product copy must distinguish Passport session consent from passport verification and vote authorization.

## Passport capability migration

| Product responsibility | Preview implementation | Passport-native replacement trigger |
| --- | --- | --- |
| Session, visible profile and consent | Public Passport profile bridge through `PassportSessionPort` | An official connector exposes the equivalent scoped session grant |
| Passport NFC evidence and derived nationality/age | Rarimo verificator behind `CivicCredentialPort` | An official Passport capability provides verified, request-bound claims with documented privacy semantics |
| Holder secret, credential opening and ballot witness | Browser-owned encrypted private state | Passport exposes a private-state or proving capability whose disclosure and recovery model is explicitly approved |
| Contract proving/submission | Wallet-derived Midnight providers through `CivicActionPort` | Passport exposes a reviewed action grant that preserves browser-owned choice and canonical indexer confirmation |

Every migration is adapter-by-adapter. It must pass the existing port conformance suite and may not change the credential leaf, referendum policy, vote nullifier, or ballot commitment without a new cryptographic version and migration ADR.

## Evidence basis

- Official Passport SDK status and planned packages: <https://github.com/midnightntwrk/midnight-passport-sdk/blob/main/README.md>
- Current CICO profile bridge contract: `ui/src/integration/passport.ts`
- Provider-neutral session adapter: `ui/src/integration/passport-session-port.ts`
- Browser-owned Passport-v2 action: `api/src/passport-v2/midnight-civic-action-adapter.ts`

## Invariants

1. No Passport profile value is an eligibility or nullifier input.
2. No adapter claims an unsupported Passport capability.
3. The indexer is the authority for canonical transaction receipts.
4. Future Passport migrations preserve the application port contracts.
5. A planned Passport capability is never represented as an available production capability.
