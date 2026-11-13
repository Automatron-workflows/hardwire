import { catalogue, searchCatalogue } from '../examples/catalogue.mjs';
import { samples } from './samples.mjs';

const $ = id => document.getElementById(id);
let contract = null;
let active = null;
let generation = 0;
const sections = ['browse', 'contract', 'call'];
const titles = ['Find a lamp.', 'Now the agent knows how.', 'Call it. Without the clicks.'];
const status = message => { $('status').textContent = message; };
function cancel() { generation += 1; active?.cancel(); }
function run(operation, input) {
  active?.cancel();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
    const finish = () => { clearTimeout(timer); worker.terminate(); if (active === job) active = null; };
    const job = { cancel: () => { finish(); resolve({ cancelled: true }); } };
    const timer = setTimeout(() => { finish(); reject(new Error('That took too long. Please try again.')); }, 5000);
    active = job;
    worker.onmessage = ({ data }) => {
      finish();
      if (data.error) reject(new Error(data.error.message)); else resolve(data.result);
    };
    worker.onerror = event => { event.preventDefault(); finish(); reject(new Error('Could not load Hardwire. Reload to try again.')); };
    worker.postMessage({ operation, input });
  });
}
function go(index) {
  cancel(); status('');
  sections.forEach((id, position) => { $(id).hidden = position !== index; });
  for (let i = 1; i <= 3; i++) {
    if (i === index + 1) $(`step-${i}`).setAttribute('aria-current', 'step');
    else $(`step-${i}`).removeAttribute('aria-current');
  }
  $('title').textContent = titles[index];
  $('title').focus({ preventScroll: true });
}
function productIcon(id) {
  const icon = document.createElement('span'); icon.className = 'object'; icon.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', id === 'lamp-1' ? 'M13 7h14l5 15H8L13 7ZM20 22v11M12 34h16' : 'M10 21V9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v12M8 21h24v6H8v-6ZM11 27v8M29 27v8');
  path.setAttribute('fill', id === 'lamp-1' ? '#d6dfbd' : 'none');
  path.setAttribute('stroke', '#526d48'); path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linejoin', 'round'); path.setAttribute('stroke-linecap', 'round');
  svg.append(path); icon.append(svg); return icon;
}
function products(target, items) {
  target.replaceChildren();
  if (!items.length) { const text = document.createElement('p'); text.className = 'result-note'; text.textContent = 'No matches. Try lamp or chair.'; target.append(text); return; }
  for (const item of items) {
    const row = document.createElement('div'); row.className = 'product';
    const text = document.createElement('div'); const name = document.createElement('p'); name.textContent = item.name;
    const note = document.createElement('small'); note.textContent = 'Sample product';
    text.append(name, note); row.append(productIcon(item.id), text); target.append(row);
  }
}
function search() {
  cancel(); contract = null; status(''); $('describe').disabled = false;
  products($('catalogue'), searchCatalogue({ query: $('search').value }));
  $('describe').hidden = false; $('browse-hint').hidden = true;
}
async function describe() {
  cancel(); const captured = generation;
  $('describe').disabled = true; status('');
  try {
    const result = await run('inspect', samples.search);
    if (result.cancelled || captured !== generation) return;
    contract = result;
    const port = result.panel.ports[0];
    $('action-name').textContent = result.tools[0].name;
    $('call-name').textContent = result.tools[0].name.toUpperCase();
    $('input-type').textContent = `query · ${port.parameters.properties.query.type}`;
    $('effect').textContent = port.kind; $('approval').textContent = port.confirmation;
    go(1);
  } catch (error) { if (captured === generation) status(error.message); }
  finally { $('describe').disabled = false; }
}
function clearResult() {
  cancel(); $('run').disabled = false; $('result').hidden = true; $('result').replaceChildren(); status('');
  $('title').textContent = titles[2];
}
function setArguments(query, selected) {
  clearResult();
  $('arguments').value = JSON.stringify({ query }, null, 2);
  for (const id of ['lamp', 'chair', 'wrong']) $(id).setAttribute('aria-pressed', String(id === selected));
}
async function call() {
  clearResult(); const captured = generation;
  $('run').disabled = true;
  try {
    const result = await run('demo', { panel: contract.panel, params: $('arguments').value });
    if (result.cancelled || captured !== generation) return;
    $('title').textContent = 'One action. A direct result.';
    const label = document.createElement('p'); label.className = 'result-label'; label.textContent = '✓ Input checked. Demo search completed.';
    const list = document.createElement('div'); products(list, result.products);
    $('result').replaceChildren(label, list); $('result').hidden = false;
  } catch (error) {
    if (captured !== generation) return;
    $('title').textContent = 'Bad input stops here.';
    const message = document.createElement('p'); message.className = 'result-error';
    message.textContent = `Input rejected: ${error.message}`;
    const note = document.createElement('p'); note.className = 'result-note'; note.textContent = 'The search was not called.';
    $('result').replaceChildren(message, note); $('result').hidden = false;
  } finally { if (captured === generation) $('run').disabled = false; }
}
function restart() {
  contract = null; $('search').value = 'lamp'; products($('catalogue'), catalogue);
  $('describe').hidden = true; $('browse-hint').hidden = false; go(0);
}
$('search-button').addEventListener('click', search);
$('search').addEventListener('keydown', event => { if (event.key === 'Enter') search(); });
$('search').addEventListener('input', () => { cancel(); contract = null; $('describe').hidden = true; $('browse-hint').hidden = false; });
$('describe').addEventListener('click', describe);
$('back-browse').addEventListener('click', () => go(0));
$('try-action').addEventListener('click', () => { go(2); setArguments($('search').value, $('search').value === 'chair' ? 'chair' : 'lamp'); });
$('arguments').addEventListener('input', () => { clearResult(); for (const id of ['lamp', 'chair', 'wrong']) $(id).setAttribute('aria-pressed', 'false'); });
$('run').addEventListener('click', call);
for (const [id, query] of [['lamp', 'lamp'], ['chair', 'chair'], ['wrong', 42]]) {
  $(id).addEventListener('click', () => { setArguments(query, id); call(); });
}
$('restart').addEventListener('click', restart);
$('download').addEventListener('click', () => {
  if (!contract?.panel) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(contract.panel, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'hardwire.panel.json';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('pagehide', cancel);
products($('catalogue'), catalogue);
