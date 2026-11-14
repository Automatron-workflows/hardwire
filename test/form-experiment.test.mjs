import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectForm } from '../examples/form.mjs';

const html = readFileSync(new URL('../examples/forms/settings.html', import.meta.url), 'utf8');
const input = { html, origin: 'https://example.com', valid: { marketingEmails: false }, invalid: { marketingEmails: 'false' } };

test('saved settings form produces a reviewable contract, rejection and MCP description', () => {
  const result = inspectForm(input);
  assert.equal(result.executed, false);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.port, 'preferences');
  assert.deepEqual(result.accepted, { marketingEmails: false });
  assert.match(result.rejected.reason, /expected a boolean/);
  assert.equal(result.tool.inputSchema.properties.marketingEmails.type, 'boolean');
  // Inference cannot infer the reversible handler demonstrated by the visual fixture.
  assert.equal(result.draft.ports[0].confirmation, 'user');
  assert.equal(result.draft.ports[0].reversible, false);
});

test('a form experiment cannot claim success if its negative sample passes', () => {
  assert.throws(() => inspectForm({ ...input, invalid: { marketingEmails: true } }), /invalid sample passed/);
  assert.throws(() => inspectForm({ ...input, valid: { marketingEmails: 'false' } }), /hardwire_params_invalid/);
});

test('multiple forms require an explicit port and executable markup is ignored', () => {
  assert.throws(() => inspectForm({ ...input, html: html + html }), /Select one/);
  assert.equal(inspectForm({ ...input, html: html + html, portId: 'preferences-2' }).port, 'preferences-2');
  assert.throws(() => inspectForm({ ...input, portId: 'missing' }), /does not exist/);
  assert.equal(inspectForm({ ...input, html: '<script>throw new Error("must not run")</script>' + html }).executed, false);
});

test('form command has useful output and refuses incomplete or duplicate arguments', () => {
  const script = fileURLToPath(new URL('../examples/form.mjs', import.meta.url));
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  const result = run(['--json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).tool.name, 'preferences');
  for (const args of [['--html', 'a.html'], ['--json', '--json'], ['--execute'], ['--port']]) {
    assert.equal(run(args).status, 2, JSON.stringify(args));
  }
  const capture = fileURLToPath(new URL('../examples/forms/settings.html', import.meta.url));
  const custom = run(['--html', capture, '--origin', 'https://example.com', '--valid', '{"marketingEmails":false}', '--invalid', '{"marketingEmails":"false"}']);
  assert.equal(custom.status, 0, custom.stderr);
  assert.match(custom.stdout, /No endpoint was called/);
});
