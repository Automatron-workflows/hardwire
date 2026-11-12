// A real official-SDK client launches the server and checks its stdio lifecycle.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { buildTrace } from '../src/index.mjs';
import { cataloguePanel } from '../examples/consumer.mjs';

const client = new Client({ name: 'hardwire-smoke', version: '0.5.0' });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [process.argv[2] ?? fileURLToPath(new URL('../src/mcp-server.mjs', import.meta.url))], stderr: 'pipe' });
const timer = setTimeout(() => { console.error('MCP check timed out'); process.exit(1); }, 30000);
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 5);
  assert.ok(tools.every(t => t.annotations.readOnlyHint && !t.annotations.openWorldHint));
  const panel_json = JSON.stringify(cataloguePanel);
  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    return JSON.parse(response.content.find(c => c.type === 'text').text);
  };
  assert.equal((await call('hardwire_inspect_panel', { panel_json })).audit.readable, 1);
  assert.equal((await call('hardwire_compile_panel', { panel_json })).tools[0].name, 'search_catalogue');
  const html = readFileSync(new URL('../examples/corpus/blog/page.html', import.meta.url), 'utf8');
  assert.ok((await call('hardwire_infer_html', { origin: 'https://blog.example.com', html })).draft.ports.length);
  assert.equal((await call('hardwire_validate_params', { panel_json, port_id: 'search-catalogue', params_json: '{"query":"lamp"}' })).valid, true);
  const trace = buildTrace({ panel: cataloguePanel, port: 'search-catalogue', params: { query: 'lamp' } });
  assert.equal((await call('hardwire_verify_trace', { panel_json, trace_json: JSON.stringify(trace) })).valid, true);
  trace.params.query = 'tampered';
  assert.equal((await call('hardwire_verify_trace', { panel_json, trace_json: JSON.stringify(trace) })).valid, false);
  for (const args of [{ panel_json: '{}' }, { panel_json, extra: true }, { panel_json: 42 }, { panel_json: 'x'.repeat(262145) }]) {
    assert.equal((await client.callTool({ name: 'hardwire_inspect_panel', arguments: args })).isError, true);
  }
  // A compiled application tool is never added to this server's executable set.
  try {
    const rejected = await client.callTool({ name: 'search_catalogue', arguments: { query: 'lamp' } });
    assert.equal(rejected.isError, true);
  } catch (error) { assert.notEqual(error.code, 'ERR_ASSERTION'); }
  await client.ping();
  assert.equal((await client.listTools()).tools.length, 5);
  console.log('MCP smoke check passed: official SDK client; five tools; inference, validation, trace and rejection checks; clean shutdown.');
} finally {
  await client.close();
  clearTimeout(timer);
}
