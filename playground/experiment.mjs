import { compilePanel } from '../src/browser.mjs';
import { comparisonPanel, scenarios } from './comparison.mjs';
import { createExperiment, invalidArguments } from './experiment-model.mjs';
import { svg, icons, google, person, credit, sliders, toggle, lock, check } from './art.mjs';

const $ = selector => document.querySelector(selector);
const configs = {
  signin: { title: 'Demo account', detail: 'Google session · local only', field: 'signedIn', before: 'Signed out', after: 'Signed in',
    fields: '<label for="account">Account</label><input id="account" name="account" value="demo" autocomplete="off" spellcheck="false">',
    params: () => ({ provider: 'google', account: $('#account').value }),
    approval: 'Your consent is required.', approve: 'Allow demo sign in', invalid: 'Only the sample account “demo” can sign in.' },
  payment: { title: '€24.00', detail: 'Demo studio · Invoice demo001', field: 'invoicePaid', before: 'Unpaid', after: 'Paid locally',
    fields: '<label for="amount">Amount in EUR</label><input id="amount" name="amount" type="number" value="24.00" step="0.01" inputmode="decimal">',
    params: () => ({ invoiceId: 'demo001', amount: $('#amount').value === '' ? null : Number($('#amount').value) * 100, currency: 'EUR' }),
    approval: 'Owner approval required. No money moves.', approve: 'Approve €24.00 locally', invalid: 'Blocked. This invoice is exactly €24.00.' },
  settings: { title: 'Marketing emails', detail: 'Demo account', field: 'marketingEmails', before: 'On', after: 'Off',
    fields: '<label class="checkbox" for="marketing">Enable marketing emails<input id="marketing" name="marketing" type="checkbox"></label>',
    params: () => ({ marketingEmails: $('#marketing').checked }), invalid: 'Blocked. Use a boolean, not the text “false”.' },
};
let selected, experiment, lastRequest;
let awaiting = false, complete = false, busy = false, generation = 0, lastError = null;
const dialog = $('#developer');
$('#close').innerHTML = svg('<path d="m6 6 12 12M18 6 6 18"/>');
$('#reset').innerHTML = icons.replay;

function scene(id) {
  const source = id === 'signin' ? google(134,100,1.1) : id === 'payment' ? credit(134,100,1) : sliders(134,100);
  const result = id === 'signin' ? person(626,100,1.2) : id === 'payment'
    ? '<g transform="translate(626 100)"><path class="receipt" d="M-25-36h50v72l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-8 4Z"/><path class="hairline" d="M-12-20h24M-12-10h15M-12 5h24"/></g>'
    : `<g class="live-toggle">${toggle(626,100,true)}</g>`;
  return `<svg viewBox="0 0 760 200" aria-hidden="true"><path class="route-base" d="M185 100h390"/><path class="route-progress" d="M185 100h374"/>
    <circle class="source" cx="134" cy="100" r="50"/>${source}
    <g class="route-gate"><circle class="gate-bg" cx="372" cy="100" r="23"/><g class="gate-lock">${lock(372,98)}</g><path class="gate-cross" d="m365 93 14 14m0-14-14 14"/></g>
    <circle class="scene-destination" cx="626" cy="100" r="62"/><g class="result-art">${result}</g>
    <g class="result-check"><circle class="success-dot" cx="669" cy="145" r="13"/>${check(669,145,.8)}</g></svg>`;
}
function showFeedback(message, error = false) {
  $('#feedback').textContent = message;
  $('#feedback').dataset.error = String(error);
}
function inspect() {
  const json = value => JSON.stringify(value, null, 2);
  $('#request').textContent = json(lastRequest);
  $('#readback').textContent = json(experiment.snapshot());
  $('#record').textContent = experiment.log().length ? json(experiment.log()[0]) : 'No action executed.';
  $('#error').hidden = !lastError;
  $('#error').textContent = lastError || '';
  $('#panel').textContent = json(comparisonPanel());
  $('#tool').textContent = json(compilePanel(comparisonPanel()).find(tool => tool.name === scenarios[selected].portId.replaceAll('-', '_')));
}
function currentState() {
  const state = experiment.snapshot(), config = configs[selected];
  return selected === 'settings' ? (state.marketingEmails ? 'On' : 'Off') : (state[config.field] ? config.after : config.before);
}
function update() {
  $('#stage').dataset.phase = lastError ? 'error' : complete ? 'complete' : awaiting ? 'review' : 'idle';
  $('#stage').dataset.enabled = String(experiment.snapshot().marketingEmails);
  $('#run').textContent = complete ? (selected === 'settings' ? 'Replay' : 'Next example →') : awaiting ? configs[selected].approve : 'Run action';
  $('#run').disabled = busy;
  $('#invalid').disabled = busy || complete;
  $('#use-inputs').disabled = busy || complete;
  for (const input of $('#fields').querySelectorAll('input')) input.disabled = busy || complete;
  inspect();
}
function choose(id) {
  if (!Object.hasOwn(scenarios, id)) id = 'signin';
  generation++; selected = id; experiment = createExperiment(id);
  awaiting = false; complete = false; busy = false; lastError = null;
  $('#fields').innerHTML = configs[id].fields;
  $('#scene').innerHTML = scene(id);
  $('#stage').dataset.scenario = id;
  $('#object-title').textContent = configs[id].title;
  $('#object-detail').textContent = configs[id].detail;
  for (const button of document.querySelectorAll('[data-scenario]')) button.setAttribute('aria-pressed', String(button.dataset.scenario === id));
  lastRequest = configs[id].params();
  showFeedback(currentState()); update();
}
async function run(params, invalid = false) {
  if (busy || complete) return;
  const current = generation, active = experiment;
  lastRequest = structuredClone(params); lastError = null; busy = true; update();
  try {
    const result = awaiting && !invalid ? await active.confirm(params) : await active.submit(params);
    if (current !== generation) return;
    awaiting = result.status === 'approval'; complete = result.status === 'complete';
    showFeedback(awaiting ? configs[selected].approval : currentState());
  } catch (error) {
    if (current !== generation) return;
    awaiting = false; lastError = error.message;
    showFeedback(error.code === 'hardwire_params_invalid' || error.message.includes('hardwire_params_invalid') ? configs[selected].invalid : 'Blocked. Check the request in Inputs & code.', true);
  } finally {
    if (current === generation) { busy = false; update(); }
  }
}
$('#action-form').addEventListener('submit', event => {
  event.preventDefault();
  if (complete) {
    const ids = Object.keys(scenarios), next = ids[(ids.indexOf(selected) + 1) % ids.length];
    choose(next); history.replaceState(null, '', `#${next}`);
  } else run(configs[selected].params());
});
$('#fields').addEventListener('input', () => {
  experiment.cancel(); awaiting = false; lastError = null;
  lastRequest = configs[selected].params(); showFeedback(currentState()); update();
});
$('#inspect').addEventListener('click', () => dialog.showModal());
$('#close').addEventListener('click', () => dialog.close());
$('#use-inputs').addEventListener('click', () => { dialog.close(); $('#run').focus(); });
$('#invalid').addEventListener('click', () => run(invalidArguments[selected], true));
$('#reset').addEventListener('click', () => choose(selected));
for (const button of document.querySelectorAll('[data-scenario]')) button.addEventListener('click', () => {
  choose(button.dataset.scenario); history.replaceState(null, '', `#${selected}`);
});
window.addEventListener('hashchange', () => { dialog.close(); choose(location.hash.slice(1)); });
choose(location.hash.slice(1));
