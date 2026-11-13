import { compilePanel } from '../src/browser.mjs';
import { comparisonPanel, scenarios } from './comparison.mjs';
import { createExperiment, invalidArguments } from './experiment-model.mjs';

const $ = selector => document.querySelector(selector);
const svg = content => `<svg viewBox="0 0 104 96" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
const art = {
  signin: svg('<circle cx="52" cy="32" r="15"/><path d="M22 81a30 30 0 0 1 60 0"/><circle cx="52" cy="48" r="45" stroke-opacity=".2"/>'),
  payment: svg('<path d="M24 5h56v86l-7-5-7 5-7-5-7 5-7-5-7 5-7-5-7 5Z"/><path d="M36 23h32M36 34h20"/><text x="52" y="65" fill="currentColor" stroke="none" text-anchor="middle" font-size="23">€24</text>'),
  settings: on => svg(`<rect x="10" y="27" width="84" height="42" rx="21" fill="${on ? '#6b8352' : '#293322'}"/><circle cx="${on ? 73 : 31}" cy="48" r="14" fill="currentColor"/>`),
};
const configs = {
  signin: { title: 'Demo account', detail: 'Google session fixture', field: 'signedIn', before: 'Signed out', after: 'Signed in',
    fields: '<label for="account">Account</label><input id="account" name="account" value="demo" autocomplete="off" spellcheck="false"><p class="hint">Only the sample account “demo” is allowed.</p>',
    params: () => ({ provider: 'google', account: $('#account').value }),
    approval: 'Start a local session for the demo account?', approve: 'Approve demo sign in' },
  payment: { title: 'Invoice demo001', detail: '€24.00 to Demo studio', field: 'invoicePaid', before: 'Unpaid', after: 'Paid locally',
    fields: '<label for="amount">Amount in EUR</label><input id="amount" name="amount" type="number" value="24.00" step="0.01" inputmode="decimal"><p class="hint">Invoice demo001 is fixed at €24.00.</p>',
    params: () => ({ invoiceId: 'demo001', amount: $('#amount').value === '' ? null : Number($('#amount').value) * 100, currency: 'EUR' }),
    approval: 'Approve €24.00 to Demo studio for invoice demo001? Local owner approval only.', approve: 'Approve €24.00 locally' },
  settings: { title: 'Marketing emails', detail: 'Demo account preferences', field: 'marketingEmails', before: 'On', after: 'Off',
    fields: '<label class="checkbox" for="marketing">Enable marketing emails<input id="marketing" name="marketing" type="checkbox"></label><p class="hint">This reversible fixture needs no approval.</p>',
    params: () => ({ marketingEmails: $('#marketing').checked }) },
};
let selected;
let experiment;
let awaiting = false;
let complete = false;
let generation = 0;
let lastRequest;

function showFeedback(message, error = false) {
  $('#feedback').textContent = message;
  $('#feedback').dataset.error = String(error);
}
function inspect() {
  const json = value => JSON.stringify(value, null, 2);
  $('#request').textContent = json(lastRequest);
  $('#readback').textContent = json(experiment.snapshot());
  $('#record').textContent = experiment.log().length ? json(experiment.log()[0]) : 'No action executed.';
  $('#panel').textContent = json(comparisonPanel());
  $('#tool').textContent = json(compilePanel(comparisonPanel()).find(tool => tool.name === scenarios[selected].portId.replaceAll('-', '_')));
}
function updateObject() {
  const state = experiment.snapshot(), config = configs[selected];
  $('#object').dataset.complete = String(complete);
  $('#object-art').innerHTML = selected === 'settings' ? art.settings(state.marketingEmails) : art[selected];
  $('#object-title').textContent = config.title;
  $('#object-detail').textContent = config.detail;
  $('#state').textContent = selected === 'settings' ? (state.marketingEmails ? 'On' : 'Off') : (state[config.field] ? config.after : config.before);
}
function choose(id) {
  if (!Object.hasOwn(scenarios, id)) id = 'signin';
  generation++;
  selected = id;
  experiment = createExperiment(id);
  awaiting = false; complete = false;
  $('#fields').innerHTML = configs[id].fields;
  $('#run').disabled = false; $('#invalid').disabled = false;
  $('#run').textContent = 'Run action';
  showFeedback('');
  for (const button of document.querySelectorAll('[data-scenario]')) button.setAttribute('aria-pressed', String(button.dataset.scenario === id));
  lastRequest = configs[id].params();
  updateObject(); inspect();
}
async function run(params, invalid = false) {
  const current = generation, active = experiment;
  lastRequest = structuredClone(params);
  $('#run').disabled = true; $('#invalid').disabled = true;
  for (const input of $('#fields').querySelectorAll('input')) input.disabled = true;
  try {
    const result = awaiting && !invalid ? await active.confirm(params) : await active.submit(params);
    if (current !== generation) return;
    awaiting = result.status === 'approval';
    complete = result.status === 'complete';
    showFeedback(awaiting ? configs[selected].approval : 'Executed once. Local state updated.');
    $('#run').textContent = awaiting ? configs[selected].approve : 'Completed';
  } catch (error) {
    if (current !== generation) return;
    awaiting = false;
    showFeedback(`Blocked. ${error.message} Local state unchanged.`, true);
    $('#run').textContent = 'Run action';
  } finally {
    if (current === generation) {
      $('#run').disabled = complete; $('#invalid').disabled = complete;
      for (const input of $('#fields').querySelectorAll('input')) input.disabled = complete;
      updateObject(); inspect();
    }
  }
}
$('#action-form').addEventListener('submit', event => { event.preventDefault(); run(configs[selected].params()); });
$('#fields').addEventListener('input', () => {
  experiment.cancel(); awaiting = false;
  $('#run').textContent = 'Run action';
  showFeedback(''); lastRequest = configs[selected].params(); inspect();
});
$('#invalid').addEventListener('click', () => run(invalidArguments[selected], true));
$('#reset').addEventListener('click', () => choose(selected));
for (const button of document.querySelectorAll('[data-scenario]')) button.addEventListener('click', () => {
  choose(button.dataset.scenario); history.replaceState(null, '', `#${selected}`);
});
window.addEventListener('hashchange', () => choose(location.hash.slice(1)));
choose(location.hash.slice(1));
