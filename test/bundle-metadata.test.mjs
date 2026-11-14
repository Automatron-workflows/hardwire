import assert from 'node:assert/strict';
import test from 'node:test';
import { bundleManifest, registryMetadata, sha256 } from '../scripts/bundle-metadata.mjs';

test('bundle declares the actual inspection tools without requesting credentials', () => {
  const manifest = bundleManifest('0.9.0');
  assert.equal(manifest.tools.length, 5);
  assert.ok(manifest.tools.every(tool => tool.name.startsWith('hardwire_')));
  assert.deepEqual(manifest.server.mcp_config, { command: 'node', args: ['${__dirname}/src/mcp-server.mjs'] });
  assert.equal(manifest.user_config, undefined);
  assert.equal(manifest.compatibility.runtimes.node, '>=22.0.0');
  assert.throws(() => bundleManifest('../other'), /release version/);
});

test('registry metadata binds the owned release URL to exact bundle bytes', () => {
  const bytes = Buffer.from('bundle');
  const metadata = registryMetadata('0.9.0', bytes);
  assert.equal(metadata.name, 'io.github.Automatron-workflows/hardwire');
  assert.equal(metadata.packages[0].identifier, 'https://github.com/Automatron-workflows/hardwire/releases/download/v0.9.0/hardwire-0.9.0.mcpb');
  assert.equal(metadata.packages[0].fileSha256, sha256(bytes));
  assert.notEqual(metadata.packages[0].fileSha256, sha256(Buffer.from('changed')));
});
