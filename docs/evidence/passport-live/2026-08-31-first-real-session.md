# First real Midnight Passport session

**Date** 31 August 2026
**Result** Success. A live third-party consent handshake with the deployed
Midnight Passport, returning a real approved profile.

## What was run

A `showcase` build served at `http://localhost:5200`
(`vite --mode showcase`, which forces `AppMode = showcase` regardless of
`ui/.env`). The header badge read **PASSPORT EN VIVO**, and the connect screen
offered only *Continuar con Passport* -- no demo shortcut. `VITE_PASSPORT_ORIGIN`
was not overridden, so the bridge targeted `https://midnightpassport.com`.

The `demo` build cannot produce this evidence: `connectPassport()` short-circuits
to a hardcoded local session and makes no network call (`ui/src/App.tsx`).

## What Passport did

Popup opened at:

```
https://midnightpassport.com/?passportRequestId=<uuid>&passportNonce=<hex>&passportNetwork=preview
```

Passport rendered its own consent sheet, headed **"Share your public profile?"**,
naming the requester as `http://localhost:5200` and listing exactly one field:

- Passport display name

It also stated: *"Private state, passkey references, recovery data, and IndexedDB
records are never shared."*

On approval it showed **"Profile shared."** with *"Approved fields were returned
only to http://localhost:5200."*, and the app advanced to the consent-return
screen showing *Sesión aprobada · Midnight Passport* and *Aprobado por vos ·
Sesión Passport y nombre visible*.

## What this proves

1. `org.midnight.passport.profile/v1` is real and the deployed Passport speaks it.
2. **No origin allowlisting is required.** `http://localhost:5200` -- not HTTPS,
   not registered anywhere -- completed a full handshake. The approval is the
   person's, on Passport's consent sheet. This contradicts the earlier claim in
   `USER-ACTION-MATRIX.md`, which has been corrected.
3. Only the requested field is returned. The app asks for `displayName` and
   Passport disclosed `displayName`.
4. `passportNetwork=preview` is ignored rather than rejected. It is not part of
   the real protocol, so the app's network assertions are inert here.

## What it does not prove

The journey then reached, correctly, **"La credencial todavía no está
conectada"** -- showcase has no evidence provider, and the app declines to
invent a nationality. That is the honest ending, not a failure.

Still unproven, and blocked on Midnight rather than on us:

- **No Preview address.** The deployed Passport runs on stagenet/ledger-9; this
  app targets Preview/ledger-v8. Widening `profileFields` to `passportContract`
  would be rejected as `wrong_network`; `midnightAddresses` would return a
  stagenet address that `parseProfile` does not network-check.
- **No holder binding.** The protocol carries no such message type, and the
  session port correctly reports `unsupported` rather than manufacturing one.
- **No physical NFC read**, and no real proof generation.
