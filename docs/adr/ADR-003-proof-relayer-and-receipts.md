# ADR-003: Proof, relayer, and canonical receipt trust

- Status: Accepted for Preview v2
- Date: 2026-08-24

## Context

The current HTTP proof provider sends private proving witnesses to its configured endpoint. The current relayer exposes separate balance and submit operations, so serialization is not atomic across the complete DUST lifecycle. Cleartext local receipts are not independent proof of canonical success.

## Decision

Preview proving is limited to loopback or an explicitly approved Passport proving provider. The UI must disclose any provider that can see private witnesses.

Replace separate balance and submit requests with one serialized relayer job:

```text
validate -> balance -> finalize -> submit -> indexer confirm
         -> DUST change confirm -> respond
```

The relayer allowlists network, contract address, and citizen circuits. It rejects deployments, issuer/admin circuits, and arbitrary proven transactions. Jobs require idempotency, rate limits, persisted short-lived status, sanitized logging, and canonical confirmation.

A receipt is created only after indexer confirmation and contains no Passport profile identifier or vote choice. Receipt records are stored in encrypted IndexedDB and scoped by network and transaction ID.

## Consequences

- The product cannot describe an arbitrary remote HTTP proof endpoint as local proving.
- Relayer concurrency tests must cover DUST reuse and restart recovery.
- Relayer wallet, issuer key, and organizer key are separate.
- Indexer lag is a pending state, not a confirmed receipt.

## Stop-ship conditions

1. Private witnesses reach an unapproved remote provider.
2. The relayer funds a non-allowlisted contract or circuit.
3. Two jobs spend the same DUST input.
4. A failed or unconfirmed transaction produces a confirmed receipt.
5. Logs contain voter secrets, witnesses, claims, choices, or raw proven transactions.
