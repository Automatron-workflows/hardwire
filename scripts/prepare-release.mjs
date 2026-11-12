// Package an owner-reviewable release candidate; does not publish or grant rights.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'output/release');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run npm run release:prepare');
await mkdir(output, { recursive: true });
const [packed] = JSON.parse(execFileSync(process.execPath,
  [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', output],
  { cwd: root, encoding: 'utf8', timeout: 60000 }));
const bytes = await readFile(join(output, packed.filename));
const checksum = createHash('sha256').update(bytes).digest('hex');
await writeFile(join(output, 'SHA256SUMS'), `${checksum}  ${packed.filename}\n`);
console.log(`Prepared ${packed.filename} and SHA256SUMS in output/release. Nothing published.`);
