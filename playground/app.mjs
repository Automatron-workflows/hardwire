import { createComparison, scenarios } from './comparison.mjs';

const definitions = [
  { id: 'signin', title: 'Sign in', action: 'session.start', result: 'Signed in', approval: 'user',
    approvalTitle: 'Demo account · Google', approvalNote: 'Local simulation. No account connects.', approvalLabel: 'Allow demo sign in',
    stages: [
      { page: 'Your workspace', rows: ['Projects', 'Files', 'Sign in'], target: 2 },
      { page: 'Sign in', rows: ['Continue with Google', 'Continue with email'], target: 0 },
      { page: 'Choose an account', rows: ['Demo account', 'Use another account'], target: 0 },
      { page: 'Access approved', rows: ['Continue to workspace'], target: 0 },
    ] },
  { id: 'payment', title: 'Pay an invoice', action: 'invoice.pay', result: 'Invoice paid', approval: 'owner',
    approvalTitle: 'Demo invoice · €24.00', approvalNote: 'Local simulation. No money moves.', approvalLabel: 'Approve demo €24',
    stages: [
      { page: 'Your workspace', rows: ['Overview', 'Billing', 'Settings'], target: 1 },
      { page: 'Billing', rows: ['Payment method', 'Invoices', 'Usage'], target: 1 },
      { page: 'Invoices', rows: ['Demo invoice · €24.00', 'Previous invoices'], target: 0 },
      { page: 'Payment approved', rows: ['Pay €24.00'], target: 0 },
    ] },
  { id: 'settings', title: 'Change a setting', action: 'preferences.set', result: 'Marketing emails off',
    stages: [
      { page: 'Your workspace', rows: ['Projects', 'Team', 'Settings'], target: 2 },
      { page: 'Settings', rows: ['Profile', 'Notifications', 'Appearance'], target: 1 },
      { page: 'Notifications', rows: ['Push notifications', 'Email preferences'], target: 1 },
      { page: 'Email preferences', rows: ['Security alerts', 'Marketing emails'], target: 1, toggle: true },
      { page: 'Marketing emails off', rows: ['Save changes'], target: 0 },
    ] },
];
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
const dialog = document.querySelector('#approval');
let pending = null;
const cards = [];

function makeCard(definition, index) {
  const card = node('article', 'comparison');
  card.setAttribute('aria-label', definition.title);
  const head = node('div', 'card-head');
  const title = node('h2', '', definition.title);
  const play = node('button', 'play', 'Play');
  const controlName = () => `${play.textContent} ${definition.title.toLowerCase()} comparison`;
  play.type = 'button'; play.setAttribute('aria-label', controlName());
  head.append(node('span', 'number', String(index + 1).padStart(2, '0')), title, play);
  const before = node('section', 'route before');
  before.append(node('div', 'route-label', 'Before'));
  const window = node('div', 'mock-window');
  const page = node('div', 'mock-title');
  const rows = node('div', 'mock-rows');
  window.append(page, rows);
  const beforeStatus = node('p', 'route-status', 'Cursor navigation');
  before.append(window, beforeStatus);
  const after = node('section', 'route after');
  after.append(node('div', 'route-label', 'With Hardwire'));
  const direct = node('div', 'direct');
  const call = node('code', 'call', definition.action + '()');
  const arrow = node('span', 'wire', '→'); arrow.setAttribute('aria-hidden', 'true');
  const endpoint = node('span', 'endpoint', '↵'); endpoint.setAttribute('aria-hidden', 'true');
  direct.append(call, arrow, endpoint);
  const afterStatus = node('p', 'route-status', 'Direct action');
  afterStatus.setAttribute('role', 'status');
  after.append(direct, afterStatus);
  card.append(head, before, after);
  document.querySelector('#comparisons').append(card);
  let controller = null;
  let phase = 'ready';
  let beforeApp, afterApp;
  function stage(step, moving = false) {
    page.textContent = step.page;
    rows.replaceChildren();
    step.rows.forEach((text, i) => {
      const row = node('div', `mock-row${i === step.target ? ' target' : ''}`, text);
      if (step.toggle && i === step.target) row.append(node('span', 'toggle'));
      if (moving && i === step.target && !reducedMotion.matches) {
        const cursor = node('span', 'cursor'); cursor.setAttribute('aria-hidden', 'true');
        cursor.innerHTML = '<svg viewBox="0 0 24 28"><path d="M3 2v22l6-6 4 8 4-2-4-8h9Z"/></svg>';
        row.append(cursor);
      }
      rows.append(row);
    });
  }
  function reset() {
    controller?.abort(); controller = null; phase = 'ready';
    beforeApp = createComparison(definition.id); afterApp = createComparison(definition.id);
    card.classList.remove('running', 'complete'); after.classList.remove('finished'); before.classList.remove('finished');
    stage(definition.stages[0]); beforeStatus.textContent = 'Cursor navigation'; afterStatus.textContent = 'Direct action';
    endpoint.textContent = '↵'; play.textContent = 'Play'; play.setAttribute('aria-label', controlName());
  }
  async function run(approved = false) {
    reset();
    controller = new AbortController(); const current = controller; const { signal } = current;
    const params = scenarios[definition.id].params;
    const grant = app => approved ? app.approve({ level: definition.approval, params }) : undefined;
    const beforeApproval = grant(beforeApp), afterApproval = grant(afterApp);
    phase = 'running'; card.classList.add('running'); play.textContent = 'Reset'; play.setAttribute('aria-label', controlName());
    const cursorRoute = async () => {
      for (let i = 0; i < definition.stages.length; i++) {
        stage(definition.stages[i], true);
        beforeStatus.textContent = `${i + 1} of ${definition.stages.length} UI steps`;
        // Deliberately paced illustration, never reported as a measured benchmark.
        await pause(reducedMotion.matches ? 0 : 1100, signal);
      }
      const result = await beforeApp.run({ params, approval: beforeApproval, signal });
      showResult(result, before, beforeStatus);
      stage({ page: definition.result, rows: ['Complete'], target: -1 });
    };
    const directRoute = async () => {
      afterStatus.textContent = 'Validating action…';
      const result = await afterApp.run({ params, approval: afterApproval, signal });
      showResult(result, after, afterStatus); endpoint.textContent = '✓';
    };
    try {
      await Promise.all([cursorRoute(), directRoute()]);
      if (controller !== current) return;
      phase = 'complete'; card.classList.remove('running'); card.classList.add('complete');
      play.textContent = 'Replay'; play.setAttribute('aria-label', controlName());
    } catch (error) {
      if (controller !== current || signal.aborted) return;
      current.abort(); reset(); afterStatus.textContent = error.message;
    }
  }
  function showResult(result, route, status) {
    const success = definition.id === 'signin' ? result.signedIn : definition.id === 'payment' ? result.invoicePaid : result.marketingEmails === false;
    if (!success) throw new Error('The demo action did not complete.');
    route.classList.add('finished'); status.textContent = definition.result;
  }
  play.addEventListener('click', () => {
    if (phase === 'running') { reset(); return; }
    if (definition.approval) {
      pending = { run, play };
      document.querySelector('#approval-title').textContent = definition.approvalTitle;
      document.querySelector('#approval-note').textContent = definition.approvalNote;
      document.querySelector('#approve').textContent = definition.approvalLabel;
      dialog.showModal();
      document.querySelector('#deny').focus();
    } else void run();
  });
  reset();
  cards.push({ reset });
}
definitions.forEach(makeCard);
document.querySelector('#approve').addEventListener('click', () => {
  const request = pending; pending = null; dialog.close();
  if (request) { request.play.focus(); void request.run(true); }
});
document.querySelector('#deny').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { pending?.play.focus(); pending = null; });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dialog.open && !pending) cards.forEach(card => card.reset());
});
