// Offline tour of the public API. No network, credentials, model or server.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizePanel, panelDigest, compilePanel, findPort, validateParams,
  buildTrace, verifyTrace, inferFromHtml, toPanelDraft, comparePanels, passes,
} from '../src/index.mjs';

const panel = normalizePanel(JSON.parse(await readFile(new URL('./example-panel.json', import.meta.url), 'utf8')));
console.log(`1. Validated ${panel.ports.length} ports for ${panel.origin}`);
console.log(`   ${panelDigest(panel)}`);

const tools = compilePanel(panel);
const { port } = findPort(panel, 'search_catalogue');
const params = validateParams(port, { query: 'lamp', limit: 5 });
console.log(`2. Compiled ${tools.length} MCP tool descriptions; validated search arguments`);

const trace = buildTrace({ panel, port: port.id, params, outcome: { status: 'unknown' } });
assert.equal(verifyTrace(trace, { panel }), true);
assert.equal(verifyTrace({ ...trace, actor: 'changed' }, { panel }), false);
console.log('3. Created and verified a trace; changing its contents invalidated its digest');

const login = buildTrace({ panel, port: 'sign-in', params: { email: 'demo@example.com', password: 'fake-demo-password' } });
assert.equal(login.params.password, '[redacted]');
console.log('4. Confirmed a fake password is redacted before the trace is hashed');

const html = await readFile(new URL('./corpus/blog/page.html', import.meta.url), 'utf8');
const expected = JSON.parse(await readFile(new URL('./corpus/blog/expected.json', import.meta.url), 'utf8'));
const draft = toPanelDraft(inferFromHtml(html, { origin: expected.origin }));
const score = comparePanels(expected, draft);
assert.equal(passes(score), true);
console.log(`5. Inferred ${draft.ports.length} candidate port(s) from the blog fixture: ${score.score}/100`);
console.log('\nWalkthrough passed. No operation was executed; traces describe caller assertions.');
