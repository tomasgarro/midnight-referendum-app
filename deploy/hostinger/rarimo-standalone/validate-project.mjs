import { readFile } from 'node:fs/promises';

const compose = await readFile(new URL('./docker-compose.hostinger.yml', import.meta.url), 'utf8');

const checks = [
  [compose.includes('name: midnight-rarimo-nfc'), 'isolated project name is missing'],
  [compose.includes('127.0.0.1:18080:8000'), 'private verifier is not loopback-only'],
  [compose.includes('127.0.0.1:18081:8080'), 'gateway is not loopback-only'],
  [!compose.includes('"80:80"') && !compose.includes('"443:443"'), 'public ports must stay closed before DNS approval'],
  [compose.includes('method GET') && compose.includes('method POST'), 'gateway method allow-list is missing'],
  [compose.includes('/public/proof-params/*') && compose.includes('/public/callback/*'), 'gateway route allow-list is missing'],
  [!compose.includes('/private/*'), 'a private provider path is exposed by the gateway'],
  [compose.includes('POSTGRES_PASSWORD_FILE'), 'database password is not file-backed'],
  [compose.includes('/dev/urandom'), 'database password is not generated on the VPS'],
  [compose.includes('internal: true'), 'private network is not internal'],
  [compose.includes('ref=f7ebbdf4d692326dd50d2c49976dd31042b2c29a&checksum=f7ebbdf4d692326dd50d2c49976dd31042b2c29a'), 'upstream verifier context is not pinned and checksum-bound'],
  [compose.includes('additional_contexts:') && compose.includes('COPY --from=upstream . .'), 'pinned upstream is not mounted as a named build context'],
  [compose.includes('dockerfile_inline: |'), 'Hostinger build is not self-contained'],
  [compose.includes('ADD --checksum=sha256:91ab66698f70ae1456d3f54cbb2cb5e84fefa44c2b0dd55194eff3fe2ae85053'), 'reviewed cleanup patch download is not checksum-bound'],
  [compose.includes("git apply --check --include='internal/service/handlers/*'"), 'reviewed cleanup patch is not checked before application'],
  [compose.includes('go test ./internal/service/handlers'), 'cleanup tests are not executed during the build'],
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}

const unresolved = compose.match(/REPLACE_[A-Z0-9_]+/gu) ?? [];
if (unresolved.length !== 0) {
  throw new Error(`unexpected unresolved placeholders: ${unresolved.join(', ') || '(none)'}`);
}

console.log('Rarimo standalone Hostinger project validation passed.');
