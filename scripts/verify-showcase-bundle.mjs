import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.UI_DIST_DIR?.trim() || path.join(root, 'ui', 'dist'));
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.svg', '.txt']);
const forbiddenPatterns = [
  { label: 'relayer seed identifier', pattern: /\bRELAYER_SEED\b/iu },
  { label: 'issuer wallet seed identifier', pattern: /\bCICO_ISSUER_WALLET_SEED\b/iu },
  { label: 'issuer role secret identifier', pattern: /\bCICO_ISSUER_ROLE_SECRET\b/iu },
  { label: 'organizer secret identifier', pattern: /\bORGANIZER_SECRET\b/iu },
  { label: 'callback secret identifier', pattern: /\bCALLBACK_SECRET\b/iu },
  { label: 'voter secret identifier', pattern: /\bVOTER_SECRET\b/iu },
  {
    label: 'private loopback runtime URL',
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1):(?:6300|8088|8790)\b/iu,
  },
];

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTextFiles(entryPath)));
      continue;
    }
    if (textExtensions.has(path.extname(entry.name).toLowerCase())) files.push(entryPath);
  }
  return files;
}

try {
  const files = await collectTextFiles(dist);
  if (!files.some((file) => path.basename(file) === 'index.html')) {
    throw new Error(`Missing showcase entrypoint: ${path.join(dist, 'index.html')}`);
  }

  const findings = [];
  for (const file of files) {
    const contents = await readFile(file, 'utf8');
    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(contents)) findings.push(`${label}: ${path.relative(root, file)}`);
    }
  }

  if (findings.length > 0) {
    throw new Error(`Showcase bundle privacy gate failed:\n- ${findings.join('\n- ')}`);
  }

  console.log(`Showcase bundle privacy gate passed (${files.length} text assets scanned).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
