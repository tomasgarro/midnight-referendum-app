# Try the demo and inspect the implementation

[Documentation home](README.md) · [How it works](HOW-IT-WORKS.md)

The demo lets you explore the participant experience using **synthetic eligibility and local receipts**. It does not submit a network vote or verify a physical document.

## Build from a clean checkout

Use Linux or WSL with the Linux Node version in [`.nvmrc`](../.nvmrc), npm 10 and **Midnight Compact toolchain 0.31.1**. The [compatibility matrix](COMPATIBILITY-MATRIX.md) records the pinned stack. On Windows, the built-in `compact.exe` compression utility is not the Midnight compiler.

Generated contract files are not committed. Build them before compiling the API and UI, including when the final application runs in demo mode.

```bash
git clone https://github.com/tomasgarro/midnight-referendum-app.git
cd midnight-referendum-app
nvm install
nvm use
npm ci

# Requires the Midnight Compact CLI with toolchain 0.31.1 installed.
compact compile --version
npm run validate:contract
npm run build --workspace midnight-referendum-api

# Explicit mode prevents a local environment selecting a live path.
VITE_APP_MODE=demo npm run build --workspace midnight-referendum-ui -- --mode demo
npm run preview --workspace midnight-referendum-ui -- --host localhost --port 4173 --strictPort
```

Open `http://localhost:4173`. The API build synchronizes generated assets. Preview serves the static UI build; it does not start an issuer or relayer.

For compiler installation and Linux setup, use [DEVELOPMENT.md](../DEVELOPMENT.md). These commands reflect repository scripts; this documentation-only PR does not claim a new clean-machine run.

## A three-minute walkthrough

| Step | Try this | What you should understand |
| --- | --- | --- |
| 1 | Explore Discover and change country | Browsing a country does not prove citizenship or create eligibility. |
| 2 | Open a consultation and its sources | Context supports understanding; the consultation remains a demo. |
| 3 | Choose the explicit simulated Passport/pass path | Test country and age stand in for a credential. No document is needed. |
| 4 | Choose a response and open review | You can change your response before confirming. |
| 5 | Create the simulated receipt and open Activity | The local record is simulated, not a transaction receipt. |
| 6 | Open Ask Midnight | Answers come from authored catalogue material. No generative model is connected. |
| 7 | Try or skip Civic Pulse | Reflection is optional and answers remain in component memory. |

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing generated contract files | Run `npm run validate:contract` with the pinned compiler before the API build. |
| API import or type errors in the UI | Build `midnight-referendum-api` first. |
| Unexpected wallet requirement | Confirm the UI was **built** with `VITE_APP_MODE=demo`; preview-server settings do not rewrite the bundle. |
| Port 4173 already in use | Stop your earlier preview or choose a different explicit port. |
| Receipt heading absent immediately after confirmation in a test | Confirmation is asynchronous. See the [known CI incident](releases/2026-09-16-submission-candidate.md#ci-incident). |

## Verify more than the demo

The [verification script](../scripts/verify-linux.sh) compiles contracts, builds the API and runs unit/simulator suites:

```bash
npm run verify:linux -- demo
npm run build
CI=true npm run test:e2e
```

Browser checks require Playwright browser dependencies; see [DEVELOPMENT.md](../DEVELOPMENT.md) and [CI](../.github/workflows/test.yml). Known test corrections from the 16 September investigation remain outside this documentation-only PR. Do not assume these commands are green on its base revision.

Local-chain and Preview verification are separate exercises. Their requirements are in [environment acceptance](ENVIRONMENT-ACCEPTANCE.md). A successful demo does not satisfy those gates.
