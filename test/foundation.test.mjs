import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePanel, validateParams, panelDigest } from '../src/panel.mjs';
import { canonicalJson } from '../src/canonical.mjs';
import { buildTrace, verifyTrace } from '../src/trace.mjs';
import { compilePanel, findPort } from '../src/mcp.mjs';
import { inferFromHtml, toPanelDraft } from '../src/infer.mjs';
import { assertPublicOrigin, fetchPage } from '../src/probe.mjs';
import { comparePanels, passes } from '../src/score.mjs';
import { scoreCorpus } from '../src/corpus.mjs';

const raw = (port = {}) => ({ panel: 'hardwire.panel/1', origin: 'https://example.com', ports: [{ id: 'search', kind: 'read', summary: 'Search.', ...port }] });
const infer = (html) => inferFromHtml(html, { origin: 'https://example.com' });

test('malformed origins and endpoints cannot be silently reinterpreted', () => {
  for (const origin of ['ftp://localhost', 'file://localhost', 'https:example.com', 'https://user:secret@example.com', 'https://example.com/path', 'https://example.com?', 'https://example.com#', 'https://example.com\\']) {
    assert.throws(() => normalizePanel({ ...raw(), origin }), { code: 'hardwire_origin_invalid' });
    assert.throws(() => assertPublicOrigin(origin), { code: 'hardwire_origin_invalid' });
  }
  for (const endpoint of ['//evil.com/x', '/\\evil.com/x', 'https:evil.com', '/x#secret']) {
    assert.throws(() => normalizePanel(raw({ endpoint })), { code: 'hardwire_port_invalid' });
  }
});

test('unknown contract fields and non-boolean policy values fail closed', () => {
  assert.throws(() => normalizePanel({ ...raw(), autorun: true }), { code: 'hardwire_panel_invalid' });
  assert.throws(() => normalizePanel(raw({ confirmaton: 'owner' })), { code: 'hardwire_port_invalid' });
  assert.throws(() => normalizePanel(raw({ reversible: 'true' })), { code: 'hardwire_port_invalid' });
  assert.throws(() => normalizePanel(raw({ confirmation: null })), { code: 'hardwire_port_invalid' });
  assert.throws(() => normalizePanel({ ...raw(), auth: { password: 'secret' } }), { code: 'hardwire_schema_invalid' });
});

test('enums must be satisfiable, finite, unique scalar values', () => {
  for (const schema of [{ type: 'integer', enum: ['1'] }, { type: 'number', enum: [Infinity] }, { type: 'string', enum: ['a', 'a'] }, { type: 'object', enum: [null] }]) {
    assert.throws(() => normalizePanel(raw({ parameters: { properties: { value: schema } } })), { code: 'hardwire_schema_invalid' });
  }
});

test('MCP schemas close nested objects exactly as the argument validator does', () => {
  const panel = raw({ parameters: { properties: { settings: { type: 'object', properties: { color: { type: 'string' } } } } } });
  const [tool] = compilePanel(panel);
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.equal(tool.inputSchema.properties.settings.additionalProperties, false);
  assert.throws(() => validateParams(normalizePanel(panel).ports[0], { settings: { extra: true } }), { code: 'hardwire_params_invalid' });
  assert.equal(findPort(panel, 'search').port.parameters.type, 'object');
  const guardedRead = compilePanel(raw({ confirmation: 'owner' }))[0];
  assert.match(guardedRead.description, /requires owner/);
  assert.equal(compilePanel(raw({ kind: 'payment' }))[0].annotations.destructiveHint, true);
});

test('prototype-sensitive schema and argument keys are never copied into prototypes', () => {
  const properties = JSON.parse('{"__proto__":{"type":"string"}}');
  assert.throws(() => normalizePanel(raw({ parameters: { properties } })), { code: 'hardwire_schema_invalid' });
  const port = normalizePanel(raw({ parameters: { additionalProperties: true } })).ports[0];
  assert.throws(() => validateParams(port, JSON.parse('{"__proto__":{"admin":true}}')), { code: 'hardwire_params_invalid' });
  assert.equal({}.admin, undefined);
});

test('open objects and untyped arrays still require bounded JSON arguments', () => {
  const port = normalizePanel(raw({ parameters: { additionalProperties: true } })).ports[0];
  for (const extra of [undefined, Infinity, new Date(), [undefined], new Map()]) {
    assert.throws(() => validateParams(port, { extra }), { code: 'hardwire_params_invalid' });
  }
  const params = { extra: { colors: ['blue'] } };
  const copy = validateParams(port, params);
  params.extra.colors.push('red');
  assert.deepEqual(copy, { extra: { colors: ['blue'] } });
});

test('canonical limits count UTF-8 bytes and include scalar roots', () => {
  assert.throws(() => canonicalJson('éé', { maxOutputLength: 5 }), /too_large/);
  assert.throws(() => canonicalJson({ key: 'éé' }, { maxOutputLength: 12 }), /too_large/);
  assert.throws(() => canonicalJson({ get secret() { throw new Error('getter ran'); } }), /accessors/);
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
});

test('raw and normalized panels have the same digest', () => {
  assert.equal(panelDigest(raw()), panelDigest(normalizePanel(raw())));
});

test('traces redact write-only strings inside arrays and bind to reviewed panels', () => {
  const panel = raw({ parameters: { properties: { secrets: { type: 'array', items: { type: 'string', writeOnly: true } } } } });
  const trace = buildTrace({ panel, port: 'search', params: { secrets: ['do-not-log'] } });
  assert.deepEqual(trace.params.secrets, ['[redacted]']);
  assert.equal(JSON.stringify(trace).includes('do-not-log'), false);
  assert.equal(verifyTrace(trace, { panel }), true);
  assert.equal(verifyTrace(trace, { panel: { ...panel, revision: 'changed' } }), false);
});

test('trace creation rejects impossible dates and malformed outcome digests', () => {
  for (const at of ['2026-02-30T10:00:00Z', '2026-99-99T99:99:99Z']) {
    assert.throws(() => buildTrace({ panel: raw(), port: 'search', at }), { code: 'hardwire_trace_invalid' });
  }
  assert.throws(() => buildTrace({ panel: raw(), port: 'search', outcome: null }), { code: 'hardwire_trace_invalid' });
  assert.throws(() => buildTrace({ panel: raw(), port: 'search', outcome: { status: 'succeeded', resultDigest: 'sha256:abc' } }), { code: 'hardwire_trace_invalid' });
});

test('inferred passwords stay write-only through draft and trace', () => {
  const panel = toPanelDraft(infer('<form id="login" method="post" action="/login"><input type="password" name="password" required></form>'));
  const trace = buildTrace({ panel, port: 'login', params: { password: 'do-not-log' } });
  assert.equal(trace.params.password, '[redacted]');
});

test('non-search JSON-LD actions never become read tools', () => {
  for (const type of ['BuyAction', 'DeleteAction', 'PayAction', 'UpdateAction', 'UnknownAction']) {
    assert.equal(infer(`<script type="application/ld+json">{"@type":"${type}","target":"/do-it"}</script>`).candidates.length, 0);
  }
});

test('inference handles colliding IDs and ignores forms in comments and scripts', () => {
  const report = infer('<!-- <form id="fake"></form> --><script>"<form id="fake"></form>"</script><form id="a"></form><form id="a"></form><form id="a-2"></form>');
  const panel = toPanelDraft(report);
  assert.equal(new Set(panel.ports.map((port) => port.id)).size, 3);
  assert.ok(!panel.ports.some((port) => port.id === 'fake'));
});

test('inference omits unsafe endpoints while keeping reviewable candidates', () => {
  for (const action of ['javascript:alert(1)', '//evil.com/action', 'https://evil.com/action']) {
    const panel = toPanelDraft(infer(`<form id="submit" method="post" action="${action}"></form>`));
    assert.equal(panel.ports[0].endpoint, undefined);
    assert.equal(panel.ports[0].confirmation, 'user');
  }
});

test('private host screening handles IPv6, mapped IPv4 and public prefix near-misses', () => {
  for (const host of ['[::1]', '[::]', '[::ffff:127.0.0.1]', '[::ffff:192.168.1.1]', '[fd00::1]', '[fe90::1]', 'localhost.', '100.64.0.1']) {
    assert.throws(() => assertPublicOrigin(`https://${host}`), { code: 'hardwire_origin_private' });
  }
  for (const host of ['fc.example.com', 'fd.example.com', '10.example.com', '[2606:4700:4700::1111]']) {
    assert.equal(assertPublicOrigin(`https://${host}`), `https://${host}`);
  }
});

test('oversize responses are refused instead of parsed from a truncated prefix', async () => {
  const page = await fetchPage('https://example.com', { fetchImpl: async () => new Response('x'.repeat(512 * 1024 + 1), { headers: { 'content-type': 'text/html' } }) });
  assert.equal(page.error, 'body_too_large');
  assert.equal(page.body, '');
});

test('redirect and non-text response streams are cancelled without following them', async () => {
  for (const [status, type] of [[302, 'text/html'], [200, 'application/octet-stream']]) {
    let cancelled = false;
    let calls = 0;
    const result = await fetchPage('https://example.com', { fetchImpl: async (_url, options) => {
      calls++;
      assert.equal(options.redirect, 'manual');
      return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status, headers: { 'content-type': type, location: 'http://127.0.0.1' } });
    } });
    assert.equal(result.body, '');
    assert.equal(cancelled, true);
    assert.equal(calls, 1);
  }
});

test('mismatched origins and downgraded effects fail regardless of numeric score', () => {
  const expected = raw({ kind: 'payment' });
  const downgraded = comparePanels(expected, raw());
  assert.equal(passes(downgraded, 0), false);
  assert.equal(downgraded.unsafeDifferences.length, 1);
  assert.equal(passes(comparePanels(raw(), { ...raw(), origin: 'https://other.com' }), 0), false);
  assert.equal(passes(comparePanels(raw({ confirmation: 'owner' }), raw()), 0), false);
});

test('a parameter literally named description participates in scoring', () => {
  const expected = raw({ parameters: { properties: { description: { type: 'string' } } } });
  const actual = raw({ parameters: { properties: { description: { type: 'boolean' } } } });
  assert.equal(comparePanels(expected, actual).ports[0].differences[0].field, 'parameters');
});

test('invalid ground truth is rejected even when the captured page is empty', () => {
  assert.throws(() => scoreCorpus([{ name: 'bad', expected: { ports: [] }, html: '' }]), { code: 'hardwire_version_unsupported' });
  assert.throws(() => scoreCorpus([{ name: 'bad', expected: raw(), html: '' }], { threshold: NaN }), { code: 'hardwire_corpus_invalid' });
  const report = scoreCorpus([{ name: 'empty', expected: raw(), html: '' }], { threshold: 0 });
  assert.equal(report.passed, 0);
});

test('malformed structured targets are ignored rather than crashing inference', () => {
  assert.equal(infer('<script type="application/ld+json">{"@type":"SearchAction","target":{"urlTemplate":42}}</script>').candidates.length, 0);
});

test('SPA fallback HTML and binary bodies do not score as discovery documents', async () => {
  const { probeOrigin } = await import('../src/probe.mjs');
  for (const type of ['text/html', 'application/octet-stream']) {
    const report = await probeOrigin('https://example.com', { fetchImpl: async () => new Response('<html>fallback</html>', { headers: { 'content-type': type } }) });
    assert.equal(report.score, 0);
  }
});

test('wildcard robots groups can share rules with another user agent', async () => {
  const { probeOrigin } = await import('../src/probe.mjs');
  const report = await probeOrigin('https://example.com', { fetchImpl: async (url) => new Response(new URL(url).pathname === '/robots.txt' ? 'User-agent: *\nUser-agent: AnotherBot\nDisallow: /' : '', { headers: { 'content-type': 'text/plain' } }) });
  assert.equal(report.blockedByRobots, true);
});
