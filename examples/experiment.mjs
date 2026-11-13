#!/usr/bin/env node
// One offline experiment, three fixed application actions. No service calls.
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compilePanel, normalizePanel } from '../src/browser.mjs';
import { comparisonPanel, createComparison, scenarios } from '../playground/comparison.mjs';
import { invalidArguments } from '../playground/experiment-model.mjs';

const outcomes = { signin: ['signedIn', true], payment: ['invoicePaid', true], settings: ['marketingEmails', false] };

export async function runExperiment(id) {
  const app = createComparison(id);
  const panel = normalizePanel(comparisonPanel());
  const port = panel.ports.find(item => item.id === scenarios[id].portId);
  const params = structuredClone(scenarios[id].params);
  const before = app.snapshot();
  const blocked = [];
  async function mustReject(reason, input, pattern) {
    let failure;
    try { await app.run(input); } catch (error) { failure = error; }
    assert.ok(failure, `${id}: ${reason} unexpectedly executed`);
    assert.match(failure.message, pattern);
    assert.deepEqual(app.snapshot(), before, `${id}: rejected request changed state`);
    assert.equal(app.log().length, 0);
    blocked.push({ reason, message: failure.message, stateUnchanged: true });
  }
  await mustReject('invalid input', { params: invalidArguments[id] }, /hardwire_params_invalid/);
  if (port.confirmation !== 'none') {
    await mustReject('missing approval', { params }, /Approve this exact/);
    await mustReject('forged approval', { params, approval: {} }, /Approve this exact/);
  }
  // This script simulates the explicit local approval step. It is not a human
  // approval ceremony and must not be connected to a real provider as written.
  const approval = port.confirmation === 'none' ? undefined : app.approve({ level: port.confirmation, params });
  const after = await app.run({ params, approval });
  const [field, value] = outcomes[id];
  assert.equal(after[field], value);
  assert.deepEqual(app.snapshot(), after);
  await assert.rejects(app.run({ params, approval }), /already ran/);
  assert.equal(app.log().length, 1);
  return {
    scenario: id, port: port.id, confirmation: port.confirmation,
    before, blocked, after, duplicateRejected: true,
    record: app.log()[0], tool: compilePanel(panel).find(item => item.name === port.id.replaceAll('-', '_')),
  };
}

async function main(argv) {
  const json = argv.includes('--json');
  const positional = argv.filter(arg => arg !== '--json');
  if (argv.filter(arg => arg === '--json').length > 1 || positional.length > 1 ||
      (positional.length && !Object.hasOwn(scenarios, positional[0]))) {
    throw new Error('Usage: node examples/experiment.mjs [signin|payment|settings] [--json]');
  }
  const ids = positional.length ? positional : Object.keys(scenarios);
  const results = [];
  for (const id of ids) results.push(await runExperiment(id));
  if (json) console.log(JSON.stringify({ localOnly: true, results }, null, 2));
  else {
    console.log('Hardwire: three actions, one experiment.\nLocal fixtures only. No accounts connected or money moved.\n');
    for (const result of results) {
      const [field] = outcomes[result.scenario];
      console.log(`${result.scenario}: ${field} ${result.before[field]} → ${result.after[field]}`);
      console.log(`  Rejected: ${result.blocked.map(item => item.reason).join(', ')}; duplicate call.`);
      console.log(`  Required confirmation: ${result.confirmation}. Executed once. Readback matches.\n`);
    }
    console.log('Next: https://automatron-workflows.github.io/hardwire/experiment.html to change an input.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = error.message.startsWith('Usage:') ? 2 : 1;
  });
}
