import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as browser from '../src/browser.mjs';
import * as node from '../src/index.mjs';
import { inspect, checkArguments } from '../playground/model.mjs';
import { samples } from '../playground/samples.mjs';

test('browser and Node APIs produce identical panels, tools and digests across the corpus', async () => {
  for (const name of ['shop', 'blog', 'legacy']) {
    const panel = JSON.parse(await readFile(new URL(`../examples/corpus/${name}/expected.json`, import.meta.url), 'utf8'));
    assert.deepEqual(browser.normalizePanel(panel), node.normalizePanel(panel));
    assert.deepEqual(browser.compilePanel(panel), node.compilePanel(panel));
    assert.equal(await browser.panelDigestAsync(panel), node.panelDigest(panel));
    const html = await readFile(new URL(`../examples/corpus/${name}/page.html`, import.meta.url), 'utf8');
    assert.deepEqual(browser.inferFromHtml(html, { origin: panel.origin }), node.inferFromHtml(html, { origin: panel.origin }));
  }
});

test('browser entry graph contains only relative portable modules', async () => {
  const seen = new Set();
  async function visit(url) {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const source = await readFile(url, 'utf8');
    assert.doesNotMatch(source, /\b(?:Buffer|process)\s*\.|\b(?:require|fetch)\s*\(|node:/, url.pathname);
    for (const match of source.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
      assert.ok(match[1].startsWith('./'), match[1]);
      await visit(new URL(match[1], url));
    }
  }
  await visit(new URL('../src/browser.mjs', import.meta.url));
  assert.equal(seen.size, 6);
});

test('playground completes inference, argument rejection, approval review and MCP export', async () => {
  const search = await inspect(samples.search);
  assert.equal(search.panel.ports[0].id, 'search');
  assert.equal(search.tools[0].name, 'search');
  assert.equal(search.tools[0].inputSchema.properties.query.type, 'string');
  assert.deepEqual(checkArguments({ panel: search.panel, portId: 'search', params: '{"query":"lamp"}' }),
    { valid: true, executed: false, confirmation: 'none', kind: 'read' });
  assert.throws(() => checkArguments({ panel: search.panel, portId: 'search', params: '{"query":42}' }), /expected a string/);
  assert.throws(() => checkArguments({ panel: search.panel, portId: 'missing', params: '{}' }), /hardwire_port_unknown/);
  const signup = await inspect(samples.signup);
  assert.equal(signup.panel.ports[0].confirmation, 'user');
  const contract = await inspect(samples.contract);
  assert.equal(checkArguments({ panel: contract.panel, portId: 'delete-account', params: '{"accountId":"fake"}' }).confirmation, 'owner');
  const downgraded = JSON.parse(samples.contract.source);
  downgraded.ports[1].confirmation = 'none';
  await assert.rejects(inspect({ mode: 'panel', source: JSON.stringify(downgraded) }), /confirmation/);
});

test('playground handles empty captures, malicious markup, invalid JSON and oversized input', async () => {
  assert.equal((await inspect(samples.empty)).panel, null);
  const injected = await inspect({ ...samples.search, source: `<script>throw new Error('must not run');</script><!-- <form id="fake"></form> -->${samples.search.source}` });
  assert.equal(injected.panel.ports.length, 1);
  await assert.rejects(inspect({ mode: 'panel', source: '{broken' }), /bounded JSON/);
  await assert.rejects(inspect({ ...samples.search, source: 'é'.repeat(262145) }), /512 KiB/);
  await assert.rejects(inspect({ mode: 'panel', source: ' '.repeat(262145) }), /256 KiB/);
  await assert.rejects(inspect({ ...samples.search, origin: 'https://user:secret@example.com' }), /credentials/);
});

test('static build includes the runnable portable graph and only allowlisted files', async () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/build-playground.mjs', import.meta.url))]);
  const output = new URL('../output/playground/', import.meta.url);
  assert.deepEqual((await readdir(output)).sort(), ['.nojekyll', 'LICENSE', 'experiment.html', 'index.html', 'playground', 'src']);
  const html = await readFile(new URL('index.html', output), 'utf8');
  assert.match(html, /\.\/playground\/app\.mjs/);
  const built = await import(new URL('playground/model.mjs', output));
  assert.equal((await built.inspect(samples.search)).digest, (await inspect(samples.search)).digest);
  const { createComparison } = await import(new URL('playground/comparison.mjs', output));
  assert.equal((await createComparison('settings').run({ params: { marketingEmails: false } })).marketingEmails, false);
  const experiment = await readFile(new URL('experiment.html', output), 'utf8');
  assert.match(experiment, /\.\/playground\/experiment\.mjs/);
  const { createExperiment } = await import(new URL('playground/experiment-model.mjs', output));
  const payment = createExperiment('payment');
  const params = { invoiceId: 'demo001', amount: 2400, currency: 'EUR' };
  assert.equal((await payment.submit(params)).status, 'approval');
  assert.equal((await payment.confirm(params)).result.invoicePaid, true);
});
