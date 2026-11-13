import { themePanel } from './theme-contract.mjs';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let route = 'browser';
let controller = null;
let animations = [];
let point = { x: 0, y: 0 };
const theme = () => document.documentElement.dataset.theme;
const nextTheme = () => theme() === 'light' ? 'dark' : 'light';

function applyTheme(value) {
  if (!['light', 'dark'].includes(value)) throw new Error('Invalid theme.');
  document.documentElement.dataset.theme = value;
}
function updateRequest() {
  $('request-label').textContent = `Turn on ${nextTheme()} mode`;
}
function setRoute(value) {
  route = value;
  $('browser-route').setAttribute('aria-pressed', String(value === 'browser'));
  $('hardwire-route').setAttribute('aria-pressed', String(value === 'hardwire'));
  $('status').textContent = '';
  updateRequest();
}
function announce(message) { $('announcement').textContent = message; }
function pause(ms, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
function clearReplay() {
  for (const animation of animations) animation.cancel();
  animations = [];
  $('cursor').hidden = true;
  $('settings').hidden = true;
  for (const id of ['settings-link', 'appearance-link', 'light-choice', 'dark-choice']) $(id).classList.remove('hovered');
}
async function moveTo(id, signal) {
  signal.throwIfAborted();
  const rect = $(id).getBoundingClientRect();
  const destination = { x: rect.left + rect.width * .6, y: rect.top + rect.height * .6 };
  if (!reducedMotion.matches) {
    const animation = $('cursor').animate([
      { transform: `translate(${point.x}px, ${point.y}px)` },
      { transform: `translate(${destination.x}px, ${destination.y}px)` },
    ], { duration: 550, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'forwards' });
    animations.push(animation);
    const abort = () => animation.cancel();
    signal.addEventListener('abort', abort, { once: true });
    try { await animation.finished; }
    finally { signal.removeEventListener('abort', abort); }
  }
  point = destination;
  $(id).classList.add('hovered');
  await pause(reducedMotion.matches ? 120 : 400, signal);
  $(id).classList.remove('hovered');
}
async function replayBrowser(target, signal) {
  const rect = $('request').getBoundingClientRect();
  point = { x: rect.right - 27, y: rect.top + rect.height / 2 };
  $('cursor').hidden = reducedMotion.matches;
  $('settings').hidden = false;
  $('settings-title').textContent = 'Preferences';
  $('settings-menu').hidden = false;
  $('appearance-menu').hidden = true;
  $('theme-menu').hidden = true;
  announce('Browser replay. Opening settings.');
  await moveTo('settings-link', signal);
  $('settings-menu').hidden = true;
  $('appearance-menu').hidden = false;
  $('settings-title').textContent = 'Settings';
  announce('Browser replay. Opening appearance.');
  await moveTo('appearance-link', signal);
  $('appearance-menu').hidden = true;
  $('theme-menu').hidden = false;
  $('settings-title').textContent = 'Appearance';
  announce(`Browser replay. Selecting ${target} mode.`);
  await moveTo(`${target}-choice`, signal);
  signal.throwIfAborted();
  applyTheme(target);
  await pause(reducedMotion.matches ? 100 : 500, signal);
  clearReplay();
}
function checkedTheme(target, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
    const finish = () => { clearTimeout(timer); worker.terminate(); signal.removeEventListener('abort', abort); };
    const abort = () => { finish(); reject(signal.reason); };
    const timer = setTimeout(() => { finish(); reject(new Error('Hardwire could not respond. Try again.')); }, 5000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      finish();
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    };
    worker.onerror = event => { event.preventDefault(); finish(); reject(new Error('Could not load Hardwire. Please reload.')); };
    worker.postMessage({ operation: 'theme', input: { panel: themePanel(), params: JSON.stringify({ theme: target }) } });
  });
}
async function request() {
  if (controller) return;
  const previous = theme();
  const target = nextTheme();
  const selectedRoute = route;
  controller = new AbortController();
  const signal = controller.signal;
  for (const id of ['request', 'browser-route', 'hardwire-route']) $(id).disabled = true;
  $('request').setAttribute('aria-busy', 'true');
  $('cancel').hidden = false;
  $('status').textContent = '';
  $('status').classList.remove('error');
  try {
    if (selectedRoute === 'browser') {
      await replayBrowser(target, signal);
      signal.throwIfAborted();
      setRoute('hardwire');
      $('status').textContent = 'Now with Hardwire.';
    } else {
      const checked = await checkedTheme(target, signal);
      signal.throwIfAborted();
      if (checked.validated !== true || checked.theme !== target) throw new Error('The action could not be verified.');
      $('request').classList.remove('direct');
      // Reflow restarts the single visual pulse for subsequent calls.
      void $('request').offsetWidth;
      $('request').classList.add('direct');
      applyTheme(checked.theme);
      $('status').textContent = 'Done.';
    }
    announce(`${target} mode is on. ${selectedRoute === 'browser' ? 'Try the same action through Hardwire.' : 'Hardwire validated the action and this tab applied it directly.'}`);
  } catch (error) {
    applyTheme(previous);
    if (signal.aborted) { $('status').textContent = 'Cancelled.'; announce('Cancelled. The original theme is restored.'); }
    else { $('status').textContent = error.message; $('status').classList.add('error'); }
  } finally {
    clearReplay();
    controller = null;
    for (const id of ['request', 'browser-route', 'hardwire-route']) $(id).disabled = false;
    $('request').removeAttribute('aria-busy');
    if ([document.body, $('cancel')].includes(document.activeElement)) $('request').focus({ preventScroll: true });
    $('cancel').hidden = true;
    updateRequest();
  }
}
$('request').addEventListener('click', request);
$('browser-route').addEventListener('click', () => setRoute('browser'));
$('hardwire-route').addEventListener('click', () => setRoute('hardwire'));
$('cancel').addEventListener('click', () => controller?.abort());
window.addEventListener('keydown', event => { if (event.key === 'Escape') controller?.abort(); });
window.addEventListener('pagehide', () => controller?.abort());
updateRequest();
