// Exercise the tarball a consumer would receive, not imports from the source tree.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this check with npm run test:package');
// Release checks may supply the exact downloaded artifact instead of repacking.
const suppliedPackage = process.argv[2] ? resolve(process.argv[2]) : null;
if (process.argv.length > 3) throw new Error('Usage: npm run test:package -- [package.tgz]');
const temp = await mkdtemp(join(tmpdir(), 'hardwire-package-'));
// A fresh consumer also needs fresh registry metadata. npm ci's cache only
// guarantees tarballs, so test the actual online installation path in isolation.
const env = { ...process.env, npm_config_cache: join(temp, 'cache') };
const runNpm = (args, cwd) => execFileSync(process.execPath, [npm, ...args], { cwd, env, encoding: 'utf8', timeout: 60000 });
try {
  const artifact = suppliedPackage ?? join(temp, JSON.parse(runNpm(
    ['pack', '--json', '--ignore-scripts', '--pack-destination', temp], root))[0].filename);
  const consumer = join(temp, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'hardwire-package-check', private: true, type: 'module' }));
  runNpm(['install', artifact, '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], consumer);
  const imported = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import {normalizePanel,compilePanel} from ${JSON.stringify(metadata.name)}; console.log(compilePanel(normalizePanel({panel:'hardwire.panel/1',origin:'https://example.com',ports:[{id:'read-status',kind:'read',summary:'Read status.'}]}))[0].name);`],
  { cwd: consumer, encoding: 'utf8', timeout: 10000 });
  assert.equal(imported.trim(), 'read_status');
  const portable = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import {panelDigestAsync} from '${metadata.name}/browser'; console.log(await panelDigestAsync({panel:'hardwire.panel/1',origin:'https://example.com',ports:[{id:'read-status',kind:'read',summary:'Read status.'}]}));`],
  { cwd: consumer, encoding: 'utf8', timeout: 10000 });
  assert.match(portable.trim(), /^sha256:[a-f0-9]{64}$/);
  const installed = join(consumer, 'node_modules', ...metadata.name.split('/'));
  const installedMetadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(installedMetadata.version, metadata.version);
  assert.match(await readFile(join(installed, 'playground/index.html'), 'utf8'), /Hardwire \| Try it/);
  const demo = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import {createDemoServer} from './node_modules/${metadata.name}/examples/demo/server.mjs'; const server = await createDemoServer(); server.close(); console.log('assets loaded');`],
  { cwd: consumer, encoding: 'utf8', timeout: 10000 });
  assert.equal(demo.trim(), 'assets loaded');
  assert.equal(installedMetadata.license, 'MIT');
  assert.match(await readFile(join(installed, 'LICENSE'), 'utf8'), /Permission is hereby granted, free of charge/);
  const version = runNpm(['exec', '--offline', '--', 'hardwire', '--version'], consumer);
  assert.equal(version.trim(), metadata.version);
  execFileSync(process.execPath, [join(installed, 'examples/consumer.mjs')], { cwd: consumer, stdio: 'pipe', timeout: 10000 });
  assert.equal(runNpm(['exec', '--offline', '--', 'hardwire-mcp', '--version'], consumer).trim(), metadata.version);
  execFileSync(process.execPath, [join(root, 'scripts/check-mcp.mjs'), join(consumer, 'node_modules/.bin/hardwire-mcp')],
    { cwd: consumer, stdio: 'pipe', timeout: 40000 });
  console.log(`Package smoke check passed: ${metadata.name}@${metadata.version}; installed ESM, CLI, consumer and MCP server.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
