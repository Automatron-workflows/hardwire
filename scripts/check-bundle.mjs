// Exercise the unpacked artifact from outside the checkout, without npm install.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleManifest, registryMetadata } from './bundle-metadata.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (process.argv.length > 3) throw new Error('Usage: npm run test:bundle -- [bundle.mcpb]');
const artifact = resolve(process.argv[2] ?? join(root, `output/release/hardwire-${version}.mcpb`));
const stage = await mkdtemp(join(tmpdir(), 'hardwire-bundle-check-'));
const mcpb = join(root, 'node_modules/@anthropic-ai/mcpb/dist/cli/cli.js');
try {
  const registry = JSON.parse(await readFile(join(dirname(artifact), 'server.json'), 'utf8'));
  assert.deepEqual(registry, registryMetadata(version, await readFile(artifact)), 'Registry metadata must identify the exact release artifact');
  execFileSync(process.execPath, [mcpb, 'unpack', artifact, stage], { stdio: 'pipe', timeout: 60000 });
  const manifest = JSON.parse(await readFile(join(stage, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest, bundleManifest(version));
  execFileSync(process.execPath, [mcpb, 'validate', join(stage, 'manifest.json')], { stdio: 'pipe', timeout: 10000 });
  assert.deepEqual((await readdir(stage)).sort(), ['LICENSE', 'manifest.json', 'node_modules', 'package.json', 'src']);
  for (const dependency of ['@modelcontextprotocol/server', '@modelcontextprotocol/core', 'zod']) {
    assert.ok((await readdir(join(stage, 'node_modules', dependency))).some(name => /^licen[cs]e/i.test(name)), `${dependency} license must ship`);
  }
  const dependencies = (await readdir(join(stage, 'node_modules'))).filter(name => !name.startsWith('.')).sort();
  assert.deepEqual(dependencies, ['@modelcontextprotocol', 'zod']);
  assert.deepEqual((await readdir(join(stage, 'node_modules/@modelcontextprotocol'))).sort(), ['core', 'server']);
  const entry = join(stage, manifest.server.entry_point);
  assert.equal(execFileSync(process.execPath, [entry, '--version'], { cwd: stage, encoding: 'utf8' }).trim(), version);
  execFileSync(process.execPath, [join(root, 'scripts/check-mcp.mjs'), entry], { cwd: stage, stdio: 'pipe', timeout: 40000 });
  console.log('Bundle verified: manifest, exact digest, runtime dependencies, licenses and five actual MCP calls. No host UI compatibility claim.');
} finally { await rm(stage, { recursive: true, force: true }); }
