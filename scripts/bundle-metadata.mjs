import { createHash } from 'node:crypto';
import { TOOLKIT_TOOLS } from '../src/toolkit.mjs';

export const repository = 'https://github.com/Automatron-workflows/hardwire';
export const registryName = 'io.github.Automatron-workflows/hardwire';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function bundleManifest(version) {
  if (!/^0\.\d+\.\d+$/.test(version)) throw new Error('Expected an experimental release version.');
  return {
    manifest_version: '0.3', name: 'hardwire', display_name: 'Hardwire', version,
    description: 'Infer and validate action contracts before connecting an AI agent.',
    long_description: 'Inspect supplied HTML and JSON locally. Five tools infer draft contracts, validate inputs, compile tool descriptions and check traces. No website access, file browsing, account connections or payment execution. Inferred contracts require review.',
    author: { name: 'Automatron', url: 'https://github.com/Automatron-workflows' },
    repository: { type: 'git', url: `${repository}.git` },
    homepage: 'https://automatron-workflows.github.io/hardwire/',
    documentation: `${repository}/blob/v${version}/docs/MCP.md`,
    support: `${repository}/issues`, license: 'MIT',
    server: { type: 'node', entry_point: 'src/mcp-server.mjs',
      mcp_config: { command: 'node', args: ['${__dirname}/src/mcp-server.mjs'] } },
    compatibility: { runtimes: { node: '>=22.0.0' } },
    tools: TOOLKIT_TOOLS.map(({ name, description }) => ({ name, description })),
  };
}

export function registryMetadata(version, bytes) {
  bundleManifest(version);
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
    name: registryName, title: 'Hardwire', version,
    description: 'Infer and validate action contracts from supplied HTML and JSON. Local inspection only.',
    repository: { url: repository, source: 'github' },
    websiteUrl: 'https://automatron-workflows.github.io/hardwire/',
    packages: [{ registryType: 'mcpb',
      identifier: `${repository}/releases/download/v${version}/hardwire-${version}.mcpb`,
      fileSha256: sha256(bytes), transport: { type: 'stdio' } }],
  };
}
