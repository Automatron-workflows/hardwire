import assert from 'node:assert/strict';
import test from 'node:test';
import { callReadTool, cataloguePanel } from '../examples/consumer.mjs';
import { verifyTrace } from '../src/index.mjs';

test('a compiled tool invokes the known read handler and records its observed result', async () => {
  const { result, trace } = await callReadTool('search_catalogue', { query: 'lamp' });
  assert.deepEqual(result, [{ id: 'lamp-1', name: 'Desk lamp' }]);
  assert.equal(trace.outcome.status, 'succeeded');
  assert.match(trace.outcome.resultDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(verifyTrace(trace, { panel: cataloguePanel }), true);
  result[0].name = 'Changed by caller';
  assert.equal((await callReadTool('search_catalogue', { query: 'lamp' })).result[0].name, 'Desk lamp');
});

test('the consumer refuses unknown tools, invalid arguments and changed panel policy', async () => {
  await assert.rejects(callReadTool('delete_catalogue', {}), /tool_not_allowed/);
  await assert.rejects(callReadTool('search_catalogue', { query: 42 }), { code: 'hardwire_params_invalid' });
  await assert.rejects(callReadTool('search_catalogue', { query: 'lamp', url: 'https://other.example' }), { code: 'hardwire_params_invalid' });
  for (const change of [
    p => { p.revision = 'unreviewed'; },
    p => { p.ports[0].confirmation = 'owner'; },
    p => { p.ports[0].endpoint = 'https://other.example/read'; },
  ]) {
    const panel = structuredClone(cataloguePanel);
    change(panel);
    await assert.rejects(callReadTool('search_catalogue', { query: 'lamp' }, { panel }), /panel_revision_not_reviewed/);
  }
});
