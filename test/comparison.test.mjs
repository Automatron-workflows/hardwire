import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonPanel, createComparison, scenarios } from '../playground/comparison.mjs';
import { normalizePanel } from '../src/browser.mjs';

const request = id => ({ params: structuredClone(scenarios[id].params) });
const approved = (app, id, level) => {
  const input = request(id);
  return { ...input, approval: app.approve({ level, params: input.params }) };
};

test('all comparisons dispatch validated local actions and record the resulting state', async () => {
  for (const [id, field, expected] of [['signin', 'signedIn', true], ['payment', 'invoicePaid', true], ['settings', 'marketingEmails', false]]) {
    const app = createComparison(id);
    const input = id === 'settings' ? request(id) : approved(app, id, id === 'payment' ? 'owner' : 'user');
    const result = await app.run(input);
    assert.equal(result[field], expected);
    assert.deepEqual(app.snapshot(), result);
    assert.equal(app.log().length, 1);
    assert.match(app.log()[0].panelDigest, /^sha256:[0-9a-f]{64}$/);
    result[field] = !expected;
    assert.equal(app.snapshot()[field], expected);
  }
});

test('sign in and payment reject missing, forged and cross-instance approval', async () => {
  for (const id of ['signin', 'payment']) {
    const app = createComparison(id), other = createComparison(id), input = request(id);
    const initial = app.snapshot();
    await assert.rejects(app.run(input), /Approve/);
    await assert.rejects(app.run({ ...input, approval: {} }), /Approve/);
    const wrongInstance = approved(other, id, id === 'payment' ? 'owner' : 'user');
    await assert.rejects(app.run(wrongInstance), /Approve/);
    assert.deepEqual(app.snapshot(), initial);
    assert.deepEqual(app.log(), []);
  }
});

test('payment requires the owner floor and binds approval to exact fixed invoice arguments', async () => {
  const app = createComparison('payment');
  assert.throws(() => app.approve({ level: 'user', params: request('payment').params }), /level/);
  const input = approved(app, 'payment', 'owner');
  await assert.rejects(app.run({ ...input, params: { ...input.params, amount: 2500 } }));
  assert.equal(app.snapshot().invoicePaid, false);
  assert.equal((await app.run(input)).invoicePaid, true);
  await assert.rejects(app.run(input), /already ran/);
  const panel = comparisonPanel(); panel.ports[1].confirmation = 'none';
  assert.throws(() => normalizePanel(panel), /confirmation/);
});

test('unknown scenarios, malformed arguments and changed contracts never dispatch', async () => {
  assert.throws(() => createComparison('toString'), /Unknown/);
  const app = createComparison('settings'), initial = app.snapshot();
  for (const params of [{}, { marketingEmails: 'false' }, { marketingEmails: false, extra: 1 }]) await assert.rejects(app.run({ params }));
  const contract = comparisonPanel(); contract.revision = 'changed';
  await assert.rejects(app.run({ ...request('settings'), contract }), /Unrecognized/);
  assert.deepEqual(app.snapshot(), initial);
  assert.deepEqual(app.log(), []);
});

test('concurrent calls can dispatch only once', async () => {
  const app = createComparison('payment'), input = approved(app, 'payment', 'owner');
  const results = await Promise.allSettled([app.run(input), app.run(input)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(app.log().length, 1);
});

test('aborting before or during validation leaves state and approval untouched', async () => {
  for (const early of [true, false]) {
    const app = createComparison('payment'), input = approved(app, 'payment', 'owner');
    const controller = new AbortController();
    if (early) controller.abort();
    const pending = app.run({ ...input, signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(app.snapshot().invoicePaid, false);
    assert.equal((await app.run(input)).invoicePaid, true);
  }
});

test('asynchronous validation snapshots caller inputs and returns isolated logs', async () => {
  const app = createComparison('settings');
  const params = { marketingEmails: false }, contract = comparisonPanel();
  const pending = app.run({ params, contract });
  params.marketingEmails = true; contract.revision = 'tampered';
  assert.equal((await pending).marketingEmails, false);
  const log = app.log(); log[0].result.marketingEmails = true; log[0].params.marketingEmails = true;
  assert.equal(app.log()[0].result.marketingEmails, false);
  assert.equal(app.log()[0].params.marketingEmails, false);
});

test('fresh replays reset fixture state and cannot reuse prior approvals', async () => {
  const old = createComparison('payment'), input = approved(old, 'payment', 'owner');
  await old.run(input);
  const fresh = createComparison('payment');
  assert.equal(fresh.snapshot().invoicePaid, false);
  await assert.rejects(fresh.run(input), /Approve/);
  const panel = comparisonPanel(); panel.ports[0].parameters.properties.provider.enum.push('other');
  assert.deepEqual(comparisonPanel().ports[0].parameters.properties.provider.enum, ['google']);
});
