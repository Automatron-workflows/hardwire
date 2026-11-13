import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runExperiment } from '../examples/experiment.mjs';
import { createExperiment, invalidArguments } from '../playground/experiment-model.mjs';
import { scenarios } from '../playground/comparison.mjs';

test('the concrete experiment proves all three outcomes and rejection without state changes', async () => {
  for (const id of Object.keys(scenarios)) {
    const result = await runExperiment(id);
    assert.ok(result.blocked.every(item => item.stateUnchanged));
    assert.equal(result.blocked.length, id === 'settings' ? 1 : 3);
    assert.equal(result.duplicateRejected, true);
    assert.equal(result.record.port, scenarios[id].portId);
    assert.deepEqual(result.record.result, result.after);
    assert.notDeepEqual(result.before, result.after);
  }
});

test('browser experiment requires an explicit review before local consent and payment approval', async () => {
  for (const id of ['signin', 'payment']) {
    const model = createExperiment(id), before = model.snapshot(), params = scenarios[id].params;
    await assert.rejects(model.confirm(params), /Run and review/);
    const prepared = await model.submit(params);
    assert.equal(prepared.status, 'approval');
    assert.equal(prepared.level, id === 'payment' ? 'owner' : 'user');
    assert.deepEqual(model.snapshot(), before);
    assert.deepEqual(model.log(), []);
    assert.equal((await model.confirm(params)).status, 'complete');
    assert.equal(model.log().length, 1);
    await assert.rejects(model.confirm(params), /Reset/);
  }
});

test('invalid requests and changed or cancelled approval requests cannot dispatch', async () => {
  for (const id of ['signin', 'payment']) {
    const model = createExperiment(id), params = scenarios[id].params, before = model.snapshot();
    await model.submit(params);
    await assert.rejects(model.confirm(invalidArguments[id]), /request changed/);
    await assert.rejects(model.confirm(params), /Run and review/);
    await model.submit(params);
    model.cancel();
    await assert.rejects(model.confirm(params), /Run and review/);
    await model.submit(params);
    await assert.rejects(model.submit(invalidArguments[id]), /hardwire_params_invalid/);
    await assert.rejects(model.confirm(params), /Run and review/);
    assert.deepEqual(model.snapshot(), before);
    assert.deepEqual(model.log(), []);
  }
});

test('prepared input is isolated from caller changes and simultaneous confirmation dispatches once', async () => {
  const model = createExperiment('payment'), params = structuredClone(scenarios.payment.params);
  const result = await model.submit(params);
  params.amount = 2500; result.params.amount = 2600;
  const calls = await Promise.allSettled([model.confirm(scenarios.payment.params), model.confirm(scenarios.payment.params)]);
  assert.equal(calls.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(model.log().length, 1);
  assert.equal(model.log()[0].params.amount, 2400);
});

test('settings checks types, runs without approval and preserves unrelated fixture state', async () => {
  const model = createExperiment('settings');
  await assert.rejects(model.submit(invalidArguments.settings), /expected a boolean/);
  assert.deepEqual(model.snapshot(), { signedIn: false, invoicePaid: false, marketingEmails: true });
  const result = await model.submit(scenarios.settings.params);
  assert.deepEqual(result.result, { signedIn: false, invoicePaid: false, marketingEmails: false });
  await assert.rejects(model.submit(scenarios.settings.params), /Reset/);
});

test('documented CLI emits machine readable results and rejects unknown options', () => {
  const script = fileURLToPath(new URL('../examples/experiment.mjs', import.meta.url));
  const output = JSON.parse(execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' }));
  assert.equal(output.localOnly, true);
  assert.deepEqual(output.results.map(result => result.scenario), ['signin', 'payment', 'settings']);
  const single = JSON.parse(execFileSync(process.execPath, [script, 'payment', '--json'], { encoding: 'utf8' }));
  assert.equal(single.results.length, 1);
  for (const args of [['unknown'], ['--json', '--json'], ['signin', 'payment'], ['--execute']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
  }
});
