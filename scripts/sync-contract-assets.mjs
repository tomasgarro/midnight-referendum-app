import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contracts = [
  {
    name: 'referendum',
    managed: path.join(root, 'contracts', 'referendum', 'managed', 'referendum'),
  },
  {
    name: 'credential-registry-v1',
    managed: path.join(
      root,
      'contracts',
      'credential-registry-v1',
      'managed',
      'credential-registry-v1',
    ),
  },
  {
    name: 'referendum-v2',
    managed: path.join(root, 'contracts', 'referendum-v2', 'managed', 'referendum-v2'),
  },
];

for (const contract of contracts) {
  await synchronizeContract(contract);
}

console.log(
  `Synchronized ${contracts.map((contract) => contract.name).join(', ')} runtime and ZK assets.`,
);

async function synchronizeContract({ name, managed }) {
  const apiGenerated = path.join(root, 'api', 'src', 'generated', name);
  const apiDistGenerated = path.join(root, 'api', 'dist', 'generated', name);
  const uiManaged = path.join(root, 'ui', 'public', 'managed', name);

  await mkdir(apiGenerated, { recursive: true });
  await mkdir(apiDistGenerated, { recursive: true });
  await mkdir(uiManaged, { recursive: true });

  for (const file of ['index.js', 'index.d.ts', 'index.js.map']) {
    await cp(path.join(managed, 'contract', file), path.join(apiGenerated, file));
    await cp(path.join(managed, 'contract', file), path.join(apiDistGenerated, file));
  }

  await rm(path.join(uiManaged, 'keys'), { recursive: true, force: true });
  await rm(path.join(uiManaged, 'zkir'), { recursive: true, force: true });
  await cp(path.join(managed, 'keys'), path.join(uiManaged, 'keys'), { recursive: true });
  await cp(path.join(managed, 'zkir'), path.join(uiManaged, 'zkir'), { recursive: true });
}
