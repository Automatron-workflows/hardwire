import assert from 'node:assert/strict';
import test from 'node:test';
import { callToolkit, toolkitResult, TOOLKIT_TOOLS } from '../src/toolkit.mjs';
import { buildTrace } from '../src/index.mjs';
import { cataloguePanel } from '../examples/consumer.mjs';

const panel_json = JSON.stringify(cataloguePanel);
test('the toolkit exposes only five fixed offline operations', () => {
  assert.equal(TOOLKIT_TOOLS.length, 5);
  assert.ok(TOOLKIT_TOOLS.every(t => t.annotations.readOnlyHint && !t.annotations.openWorldHint));
  assert.throws(() => callToolkit('search_catalogue', { query: 'lamp' }), { code: 'hardwire_tool_unknown' });
  assert.equal(callToolkit('hardwire_inspect_panel', { panel_json }).audit.readable, 1);
  const compiled = callToolkit('hardwire_compile_panel', { panel_json });
  assert.equal(compiled.tools[0].name, 'search_catalogue');
  assert.equal(compiled.executable, false);
});
test('HTML inference returns reviewable data, including empty and mutating captures', () => {
  const empty = callToolkit('hardwire_infer_html', { origin: 'https://example.com', html: '<h1>Hello</h1>' });
  assert.equal(empty.draft, null);
  const result = callToolkit('hardwire_infer_html', { origin: 'https://example.com', html: '<form action="/save" method="post"><input name="title"></form>' });
  assert.equal(result.reviewRequired, true);
  assert.equal(result.draft.ports[0].confirmation, 'user');
});
test('arguments are checked without echoing credentials, even on errors', () => {
  const p = structuredClone(cataloguePanel);
  p.ports[0].parameters.properties.query.writeOnly = true;
  const args = { panel_json: JSON.stringify(p), port_id: 'search-catalogue', params_json: '{"query":"top-secret"}' };
  const response = toolkitResult('hardwire_validate_params', args);
  assert.equal(response.structuredContent.valid, true);
  assert.ok(!JSON.stringify(response).includes('top-secret'));
  args.params_json = '{"query":42,"top-secret":true}';
  const failed = toolkitResult('hardwire_validate_params', args);
  assert.equal(failed.isError, true);
  assert.ok(!JSON.stringify(failed).includes('top-secret'));
});
test('trace verification binds arguments and panel and rejects tampering', () => {
  const trace = buildTrace({ panel: cataloguePanel, port: 'search-catalogue', params: { query: 'lamp' } });
  assert.equal(callToolkit('hardwire_verify_trace', { panel_json, trace_json: JSON.stringify(trace) }).valid, true);
  trace.params.query = 'chair';
  assert.equal(callToolkit('hardwire_verify_trace', { panel_json, trace_json: JSON.stringify(trace) }).valid, false);
});
test('invalid, oversized and unknown inputs are rejected without echoing source', () => {
  for (const args of [{}, { panel_json, url: 'https://example.com' }, { panel_json: '{secret' }, { panel_json: 'x'.repeat(262145) }]) {
    const response = toolkitResult('hardwire_inspect_panel', args);
    assert.equal(response.isError, true);
    assert.ok(!JSON.stringify(response).includes('secret'));
  }
  assert.equal(toolkitResult('hardwire_infer_html', { origin: 'https://example.com', html: 'é'.repeat(300000) }).isError, true);
});
