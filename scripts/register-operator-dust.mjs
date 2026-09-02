/**
 * Registers the *operator* wallet's NIGHT for DUST generation.
 *
 *     npm run deploy:preview:operator-dust
 *
 * `deploy:preview` needs two independent funded wallets: the relayer, which
 * balances and submits votes, and an operator wallet that deploys the
 * contracts. It refuses to start until the operator wallet reports DUST
 * (scripts/deploy-passport-v2.mjs). Funding grants NIGHT, not DUST, and NIGHT
 * generates none until its UTXOs are registered — so a freshly funded operator
 * wallet makes the deploy wait out its full sync bound and then fail with a
 * timeout rather than a diagnosis.
 *
 * `npm run relayer:dust` cannot do this: it signs with RELAYER_SEED, and only
 * the owner of the UTXOs can register them. This script is the operator's
 * equivalent. It exists as a wrapper rather than as relayer configuration so
 * that the V2_* naming stays in the deploy layer, and so that loading
 * .env.v2.preview for any other reason can never silently retarget
 * `relayer:dust` at the wrong wallet.
 */
const seed = process.env.V2_OPERATOR_FEE_SEED_HEX?.trim();
if (!seed) {
  console.error(
    'V2_OPERATOR_FEE_SEED_HEX is not set. It comes from .env.v2.preview,\n' +
      'the same file deploy:preview reads. Fill it in before running this.',
  );
  process.exit(1);
}

// Hand it over under the name the relayer script expects. Shape is validated
// there; the value must never reach a log line here either.
process.env.DUST_REGISTER_SEED_HEX = seed;

await import('../relayer/dist/register-dust.js');
