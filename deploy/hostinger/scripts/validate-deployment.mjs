import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compose = await readFile(path.join(root, 'docker-compose.vps.yml'), 'utf8');
const edge = await readFile(path.join(root, 'Caddyfile.example'), 'utf8');
const internal = await readFile(path.join(root, 'rarimo', 'Caddyfile.example'), 'utf8');
const examples = await Promise.all(
  ['.env.public.example', '.env.cico.example', '.env.relayer.example', '.env.rarimo.example'].map(
    (name) => readFile(path.join(root, name), 'utf8'),
  ),
);
const publicExample = examples[0];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function serviceBlock(name) {
  const match = compose.match(
    new RegExp(`^  ${name}:\\r?\\n[\\s\\S]*?(?=^  [a-z][a-z0-9-]*:\\r?$|^networks:)`, 'mu'),
  );
  assert(match, `missing Compose service ${name}`);
  return match[0];
}

const publishedPorts = [...compose.matchAll(/^\s*-\s*["']?(\d+:\d+)["']?\s*$/gmu)].map(
  (match) => match[1],
);
assert(publishedPorts.includes('80:80'), 'edge proxy must publish 80:80');
assert(publishedPorts.includes('443:443'), 'edge proxy must publish 443:443');
assert(
  publishedPorts.every((value) => value === '80:80' || value === '443:443'),
  'a non-edge service publishes a host port',
);
assert((compose.match(/ports:/g) ?? []).length === 1, 'only edge-proxy may have a ports block');
assert(compose.includes('internal: true'), 'private Docker networks must be internal');
const cicoBlock = serviceBlock('cico');
const verifierBlock = serviceBlock('rarimo-verificator');
assert(
  cicoBlock.includes('- rarimo-cico') && verifierBlock.includes('- rarimo-cico'),
  'CICO and the private verifier must share the rarimo-cico network',
);
assert(!compose.includes('/dev/tcp/'), 'proof images have no POSIX shell; probe them externally');
for (const volume of [
  'cico-state',
  'relayer-postgres-data',
  'rarimo-postgres-data',
  'caddy-data',
]) {
  assert(compose.includes(`${volume}:`), `missing persistent volume ${volume}`);
}
assert(
  compose.includes('RELAYER_LEGACY_API_ENABLED=false') === false,
  'legacy flag belongs in service env, not Compose',
);
assert(
  compose.includes('condition: service_completed_successfully'),
  'Rarimo migration must gate verifier startup',
);
for (const image of [
  'CADDY_IMAGE',
  'CICO_IMAGE',
  'RELAYER_IMAGE',
  'RARIMO_IMAGE',
  'MIDNIGHT_PROOF_IMAGE',
  'POSTGRES_IMAGE',
]) {
  assert(
    new RegExp(`^${image}=.+@sha256:`, 'mu').test(publicExample),
    `${image} must be digest-pinned`,
  );
}
assert(
  edge.includes('path /v1/*') && edge.includes('path /v2/*'),
  'public CICO and relayer paths are missing',
);
assert(
  edge.includes('/integrations/verificator-svc/public/proof-params/*'),
  'public proof-params route is missing',
);
assert(
  edge.includes('/integrations/verificator-svc/public/callback/*'),
  'public callback route is missing',
);
assert(!edge.includes('/private/'), 'public edge config must not contain a Rarimo private route');
assert(!internal.includes('/private/'), 'internal Rarimo gateway must not publish a private route');
for (const example of examples) {
  assert(
    !/\b(?:RELAYER_SEED|CICO_ISSUER_WALLET_SEED)\s*=\s*[0-9a-f]{64}\b/iu.test(example),
    'secret value found in an env template',
  );
  assert(!example.includes('https://example.com'), 'a concrete example domain must not be shipped');
  assert(
    !/\b(?:CICO_ALLOWED_ORIGINS|RELAYER_ALLOWED_ORIGINS)=\*/u.test(example),
    'wildcard browser origin is not allowed',
  );
}

console.log(
  'Deployment static checks passed: edge-only ports, private networks, public route allow-list, and placeholder-only env templates.',
);
