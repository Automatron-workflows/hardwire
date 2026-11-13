// A silent, illustrative film. No accounts, payments or application handlers run.
// The executable, validated fixture examples remain in comparison.mjs.
import { svg, icons, check, person, google, lock, credit, sliders, toggle, skeleton, browser, cursor, success } from './art.mjs';
const film = [
  { id: 'signin', label: 'Google sign in', description: 'Before: a cursor opens sign in, selects Google, chooses an account and continues. With Hardwire: an authorized session connects directly. This is an illustration, not a live login.', source: google(70, 331, .65), result: person(286, 331, .75),
    frames: [
      `${person(180, 106, .7)}<rect class="field" x="104" y="151" width="152" height="35" rx="7"/>${google(180, 168, .5)}${skeleton(138, 202, 84)}`,
      `${google(180, 91, .55)}<rect class="choice" x="91" y="123" width="178" height="43" rx="8"/>${person(117, 144, .35)}${skeleton(140, 140, 88)}${person(117, 190, .35)}${skeleton(140, 188, 60)}`,
      `${person(180, 112, .7)}${lock(180, 160)}<rect class="continue" x="137" y="193" width="86" height="25" rx="6"/><path class="arrow" d="M168 205h24m-6-5 6 5-6 5"/>`,
      `${success}${person(180, 139, 1)}<circle class="success-dot" cx="209" cy="174" r="11"/>${check(209,174,.7)}`,
    ] },
  { id: 'payment', label: 'Invoice payment', description: 'Before: a cursor opens an invoice, selects a card and confirms payment. With Hardwire: the approved payment takes a direct path. This is an illustration; no money moves.', source: credit(70,331,.65), result: `<g transform="translate(286 331)"><path class="receipt" d="M-17-23h34v46l-6-4-6 4-5-4-6 4-6-4-5 4Z"/>${check(0,0,.9)}</g>`,
    frames: [
      `<path class="receipt" d="M137 78h86v140l-8-5-9 5-9-5-9 5-9-5-9 5-9-5-9 5-8-5-7 5Z"/>${skeleton(153, 96, 54)}<text class="amount" x="180" y="141">€24</text>${skeleton(153, 156, 54)}<rect class="continue" x="153" y="178" width="54" height="22" rx="5"/><path class="arrow" d="M170 189h20m-5-4 5 4-5 4"/>`,
      `${credit(180,128,1.8)}${skeleton(139, 181, 82)}<rect class="choice" x="116" y="197" width="128" height="22" rx="5"/><circle class="radio" cx="131" cy="208" r="4"/>${skeleton(146, 205, 78)}`,
      `<text class="amount large" x="180" y="116">€24</text>${lock(180,147)}<rect class="continue" x="137" y="186" width="86" height="28" rx="6"/>${check(180,201,.8)}`,
      `${success}<path class="receipt" d="M154 103h52v84l-7-5-6 5-7-5-6 5-6-5-7 5-6-5-7 5Z"/>${check(180,143,1.25)}`,
    ] },
  { id: 'settings', label: 'Email settings', description: 'Before: a cursor navigates settings and email preferences, then changes a switch. With Hardwire: the declared preference changes directly. This is an illustration using sample data.', source: sliders(70,331), result: toggle(286,331,false),
    frames: [
      `<path class="hairline" d="M91 54v189"/>${sliders(57,88)}${[122,152,182,212].map(y=>`<rect class="nav-item" x="47" y="${y}" width="20" height="5" rx="2.5"/>`).join('')}${[0,1,2,3,4,5].map(i=>`<rect class="tile" x="${112+i%3*67}" y="${81+Math.floor(i/3)*77}" width="53" height="60" rx="7"/>${skeleton(122+i%3*67,126+Math.floor(i/3)*77,30)}`).join('')}`,
      `<path class="hairline" d="M91 54v189"/>${sliders(57,88)}${[100,146,192].map((y,i)=>`<rect class="${i===1?'choice':'field'}" x="113" y="${y-17}" width="196" height="34" rx="6"/>${skeleton(129,y-2,76)}<path class="chevron" d="m289 ${y-4} 4 4-4 4"/>`).join('')}`,
      `${[99,145,191].map((y,i)=>`${skeleton(77,y-3,i===1?91:70)}${toggle(262,y,true)}`).join('')}`,
      `${[99,145,191].map((y,i)=>`${skeleton(77,y-3,i===1?91:70)}${toggle(262,y,i!==1)}`).join('')}<circle class="success-dot" cx="302" cy="145" r="9"/>${check(302,145,.6)}`,
    ] },
];
const stage = document.querySelector('#film');
for (const scene of film) {
  const figure = document.createElement('figure');
  figure.className = `scene ${scene.id}`;
  figure.setAttribute('role', 'img'); figure.setAttribute('aria-label', scene.description);
  figure.innerHTML = `<svg class="scene-art" viewBox="0 0 360 405" aria-hidden="true">
    <g class="upper">${browser}${scene.frames.map((frame,i)=>`<g class="frame frame-${i}">${frame}</g>`).join('')}${cursor}</g>
    <path class="separator" d="M40 274h280"/>
    <g class="direct"><path class="wire-base" d="M106 331h144"/><path class="wire-light" d="M106 331h144"/>
    <circle class="source" cx="70" cy="331" r="34"/>${scene.source}<circle class="destination" cx="286" cy="331" r="34"/>
    <g class="result">${scene.result}</g><g class="permission">${lock(180,364)}${check(197,369,.45)}</g></g>
  </svg>`;
  stage.append(figure);
}
const playback = document.querySelector('#playback');
const replay = document.querySelector('#replay');
const info = document.querySelector('#info');
const details = document.querySelector('#demo-details');
replay.innerHTML = icons.replay; info.innerHTML = icons.info;
document.querySelector('#github').innerHTML = icons.github;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const duration = 8000;
let elapsed = reducedMotion.matches ? 5800 : 0;
let playing = !reducedMotion.matches;
let visible = true;
let previous = null;
let request = null;

function render() {
  const phase = elapsed < 1450 ? 0 : elapsed < 2850 ? 1 : elapsed < 4250 ? 2 : 3;
  const direct = elapsed >= 660;
  if (stage.dataset.phase !== String(phase)) stage.dataset.phase = String(phase);
  if (stage.dataset.direct !== String(direct)) stage.dataset.direct = String(direct);
  stage.classList.toggle('restarting', elapsed > 7480);
  stage.classList.toggle('paused', !playing || document.hidden || !visible);
  const label = playing ? 'Pause animation' : 'Play animation';
  if (playback.getAttribute('aria-label') !== label || !playback.firstChild) {
    playback.innerHTML = playing ? icons.pause : icons.play;
    playback.setAttribute('aria-label', label);
    playback.title = playing ? 'Pause' : 'Play';
  }
}
function tick(time) {
  request = null;
  if (previous !== null) elapsed = (elapsed + Math.min(time - previous, 100)) % duration;
  previous = time; render(); schedule();
}
function schedule() {
  const active = playing && visible && !document.hidden;
  if (active && request === null) request = requestAnimationFrame(tick);
  if (!active) { cancelAnimationFrame(request); request = null; previous = null; }
}
function syncMotion() {
  const active = playing && visible && !document.hidden;
  for (const animation of stage.getAnimations({ subtree: true })) {
    if (!active && animation.playState === 'running') animation.pause();
    else if (active && animation.playState === 'paused') animation.play();
  }
}
function setPlaying(value) { playing = value; previous = null; render(); syncMotion(); schedule(); }
playback.addEventListener('click', () => setPlaying(!playing));
replay.addEventListener('click', () => { elapsed = reducedMotion.matches ? 5800 : 0; setPlaying(!reducedMotion.matches); });
reducedMotion.addEventListener('change', () => { elapsed = reducedMotion.matches ? 5800 : 0; setPlaying(!reducedMotion.matches); });
document.addEventListener('visibilitychange', () => { previous = null; render(); syncMotion(); schedule(); });
new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; previous = null; render(); syncMotion(); schedule(); }, { threshold: .05 }).observe(stage);
info.addEventListener('click', () => { details.hidden = !details.hidden; info.setAttribute('aria-expanded', String(!details.hidden)); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { setPlaying(false); details.hidden = true; info.setAttribute('aria-expanded','false'); } });
render(); schedule();
