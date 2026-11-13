import assert from "node:assert/strict";
import test from "node:test";

import { startDemo } from "../../examples/demo/server.mjs";
import { inferFromUrl, toPanelDraft } from "../../src/infer.mjs";
import { normalizePanel } from "../../src/panel.mjs";
import { probeOrigin } from "../../src/probe.mjs";

test("the demo origin publishes a valid panel and inferable forms", async (t) => {
  const { server, origin } = await startDemo({ port: 0 });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const report = await probeOrigin(origin, { allowPrivate: true });
  const panel = report.probes.find((probe) => probe.id === "hardwire")?.panel;

  assert.equal(panel.valid, true);
  assert.equal(panel.ports, 3);
  assert.equal(panel.origin, origin);
  assert.equal(report.score, 35, "panel (30) + llms.txt (5)");
  assert.deepEqual(report.signals, ["hardwire", "llms"]);

  const inference = await inferFromUrl(origin, { allowPrivate: true });
  assert.deepEqual(inference.candidates.map((candidate) => candidate.id), ["search", "subscribe", "sign-in"]);
  assert.deepEqual(inference.candidates.map((candidate) => candidate.kind), ["read", "write", "write"]);

  const draft = normalizePanel(toPanelDraft(inference));
  assert.equal(draft.ports.length, 3);
  assert.equal(draft.ports.find((port) => port.id === "sign-in").confirmation, "user");
});

test("the demo refuses to pretend it executed a write", async (t) => {
  const { server, origin } = await startDemo({ port: 0 });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`${origin}/subscribe`, { method: "POST" });
  assert.equal(response.status, 405);
  assert.match(await response.text(), /does not execute/);
});

test('the demo search returns a real response without an agent or UI', async (t) => {
  const { server, origin } = await startDemo({ port: 0 });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(`${origin}/search?q=lamp`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { demo: true, query: 'lamp' });
});

test('documented local probe and inference commands succeed against the demo', async (t) => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { fileURLToPath } = await import('node:url');
  const exec = promisify(execFile);
  const cli = fileURLToPath(new URL('../../src/cli.mjs', import.meta.url));
  const { server, origin } = await startDemo({ port: 0 });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const probed = await exec(process.execPath, [cli, 'probe', origin, '--allow-private', '--fail-under', '30', '--json']);
  assert.equal(JSON.parse(probed.stdout).score, 35);
  const inferred = await exec(process.execPath, [cli, 'infer', origin, '--allow-private', '--draft']);
  assert.equal(JSON.parse(inferred.stdout).ports.length, 3);
});

test('local playground serves its module graph and does not expose arbitrary repository files', async (t) => {
  const { server, origin } = await startDemo({ port: 0 });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const page = await fetch(`${origin}/playground/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Hardwire \| Try it/);
  for (const path of ['/playground/app.mjs', '/playground/comparison.mjs', '/playground/worker.mjs', '/playground/model.mjs', '/src/browser.mjs', '/src/panel-schema.mjs']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/javascript/);
    await response.body.cancel();
  }
  for (const path of ['/package.json', '/src/probe.mjs', '/playground/../package.json']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404);
    await response.body.cancel();
  }
  const head = await fetch(`${origin}/playground/`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});
