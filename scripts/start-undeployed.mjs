import { spawnSync } from 'node:child_process';

const composeFile = 'docker-compose.undeployed.yml';
const expectedProofVersion = '8.1.0';

async function proofServerIsCompatible() {
  try {
    const response = await fetch('http://127.0.0.1:6300/version', {
      signal: AbortSignal.timeout(2500),
    });
    return response.ok && (await response.text()).trim() === expectedProofVersion;
  } catch {
    return false;
  }
}

function runCompose(services) {
  const result = spawnSync('docker', ['compose', '-f', composeFile, 'up', '-d', ...services], {
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.error(`Unable to start Docker Compose: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

if (await proofServerIsCompatible()) {
  console.log(
    `Reusing compatible proof server ${expectedProofVersion} on 127.0.0.1:6300; starting node and indexer.`,
  );
  runCompose(['node', 'indexer']);
}

console.log('No compatible proof server found; starting the complete undeployed stack.');
runCompose([]);
