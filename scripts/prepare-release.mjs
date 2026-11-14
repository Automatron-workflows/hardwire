// Package an owner-reviewable release candidate; does not publish or grant rights.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { sha256 } from './bundle-metadata.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'output/release');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run npm run release:prepare');
await mkdir(output, { recursive: true });
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const [packed] = JSON.parse(execFileSync(process.execPath,
  [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', output],
  { cwd: root, encoding: 'utf8', timeout: 60000 }));
// Build and verify together so a stale bundle can never enter a release.
execFileSync(process.execPath, [join(root, 'scripts/build-bundle.mjs')], { cwd: root, stdio: 'inherit', timeout: 180000 });
execFileSync(process.execPath, [join(root, 'scripts/check-bundle.mjs')], { cwd: root, stdio: 'inherit', timeout: 60000 });
const files = [packed.filename, `hardwire-${version}.mcpb`, 'server.json'];
const sums = await Promise.all(files.map(async name => `${sha256(await readFile(join(output, name)))}  ${name}\n`));
await writeFile(join(output, 'SHA256SUMS'), sums.join(''));
console.log(`Prepared package, bundle, registry metadata and SHA256SUMS in output/release. Nothing published.`);
