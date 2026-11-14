// Stage only the server and locked production dependencies. No publish step.
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleManifest, registryMetadata } from './bundle-metadata.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run npm run build:bundle');
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const stage = await mkdtemp(join(tmpdir(), 'hardwire-bundle-build-'));
const output = join(root, 'output/release');
const artifact = join(output, `hardwire-${metadata.version}.mcpb`);
const mcpb = join(root, 'node_modules/@anthropic-ai/mcpb/dist/cli/cli.js');
try {
  for (const name of ['src', 'package.json', 'package-lock.json', 'LICENSE']) {
    await cp(join(root, name), join(stage, name), { recursive: true });
  }
  execFileSync(process.execPath, [npm, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: stage, stdio: 'pipe', timeout: 120000 });
  // Keep runtime metadata; never advertise missing CLI files or build commands.
  await writeFile(join(stage, 'package.json'), JSON.stringify({ name: metadata.name,
    version: metadata.version, type: 'module', private: true, license: metadata.license,
    engines: metadata.engines, dependencies: metadata.dependencies }, null, 2) + '\n');
  await rm(join(stage, 'package-lock.json'));
  await writeFile(join(stage, 'manifest.json'), JSON.stringify(bundleManifest(metadata.version), null, 2) + '\n');
  await mkdir(output, { recursive: true });
  execFileSync(process.execPath, [mcpb, 'pack', stage, artifact], { stdio: 'pipe', timeout: 60000 });
  await writeFile(join(output, 'server.json'), JSON.stringify(registryMetadata(metadata.version, await readFile(artifact)), null, 2) + '\n');
  console.log(`Built hardwire-${metadata.version}.mcpb with locked runtime dependencies and matching registry metadata.`);
} finally { await rm(stage, { recursive: true, force: true }); }
