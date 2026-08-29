# Vercel setup for the Passport showcase

This guide explains the `husky: command not found` failure and the exact place
for the deployment credentials. It is a target procedure: no Vercel deployment
URL or Passport-origin approval is asserted by the current review checkout.

## Why the build failed

The repository's root `prepare` lifecycle hook used to execute `husky` directly.
Vercel runs `npm ci`, then runs lifecycle hooks. The deployment checkout did not
contain the development-only Husky binary, so npm failed before the actual
Vite build began.

The repository now runs `node scripts/prepare.mjs`. That script exits cleanly
when `HUSKY=0` and still installs Husky during a normal local install. The
checked-in Vercel command remains:

```text
HUSKY=0 npm ci --include=dev
```

The warnings about deprecated packages are not the cause of the failure.

## Create or link the Vercel project

In Vercel:

1. Import `tomasgarro/midnight-referendum-app`.
2. Name the project `midnight-referendum-preview`.
3. Keep the project root at `/`.
4. Use Node 22, as declared by `.nvmrc` and `package.json`.
5. Leave the repository's automatic Git deployment setting disabled. The
   checked-in workflow owns the pinned Compact build and prebuilt deployment.

Do not add issuer keys, relayer seeds, proof-server secrets, or database
credentials as `VITE_*` variables. The public showcase intentionally leaves
credential, contract, relayer, proof, CICO, and indexer URLs empty.

## Create the three deployment values

### `VERCEL_TOKEN`

In Vercel, open your account settings, open **Tokens**, create a token for this
deployment, and copy it once. Treat it like a password. Do not paste it into
chat, commit it, or put it in a browser environment variable.

### `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

The least ambiguous way to obtain both IDs is to link the local checkout:

```text
npx vercel@59.5.0 login
npx vercel@59.5.0 link
```

Choose the existing team and the `midnight-referendum-preview` project. Vercel
will create a local `.vercel/project.json` containing values like:

```json
{
  "orgId": "team_...",
  "projectId": "prj_..."
}
```

Use `orgId` as `VERCEL_ORG_ID` and `projectId` as `VERCEL_PROJECT_ID`. The
`.vercel` directory is local configuration and must not be committed.

## Put them in the correct place

These are GitHub Actions secrets, not Vercel runtime variables:

1. Open the GitHub repository.
2. Go to **Settings → Environments**.
3. Create or open the environment named `public-preview`.
4. Under **Environment secrets**, choose **New environment secret**.
5. Add the three names exactly:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
6. Optionally add a required reviewer to the environment before deployment.

The workflow declares `environment: public-preview`, so secrets stored only as
ordinary local variables or only in Vercel will not satisfy the workflow.

## Run the deployment

In GitHub:

1. Open **Actions**.
2. Select **Deploy Passport-first Vercel showcase**.
3. Choose **Run workflow** on `main`.
4. Wait for the Compact install, quality checks, prebuilt deployment, header
   smoke test, and deployed Playwright journeys.

The first successful run produces a Vercel preview URL. Review it before
assigning a permanent domain.

## Add the custom domain later

Keep the approved Passport site records unchanged. Add only the CICO subdomain
selected by the release owner to the Vercel project, then add the exact CNAME
record Vercel displays in the Hostinger DNS editor. Do not replace apex or
`www` records.

The current workflow creates a preview deployment. A permanent domain should
only be attached after a gated production deploy or promotion step has been
added and tested.

## If it still fails

- `husky: command not found`: confirm the commit includes `scripts/prepare.mjs`
  and the `prepare` script points to it.
- Missing Vercel credentials: confirm they are environment secrets under the
  exact `public-preview` environment.
- CSP gate failure: inspect `vercel.json`; the workflow refuses to deploy
  without the reviewed `Content-Security-Policy` header.
- Browser journey failure: keep the generated URL private until the network
  log confirms the showcase did not contact CICO, Rarimo, the relayer, proof
  server, indexer, or a real contract.
