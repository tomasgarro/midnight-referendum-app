// Vercel and other immutable CI checkouts intentionally set HUSKY=0. The
// lifecycle hook still runs during npm ci, so do not require the development
// only Husky binary just to discover that hooks are disabled.
if (process.env.HUSKY === '0') {
  console.log('Skipping Husky install because HUSKY=0.');
  process.exit(0);
}

const { default: husky } = await import('husky');
process.stdout.write(husky());
