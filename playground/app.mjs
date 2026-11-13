// A silent, illustrative film. No accounts, payments or application handlers run.
// The executable, validated fixture examples remain in comparison.mjs.
const svg = content => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
const icons = {
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  play: svg('<path d="m9 5 10 7-10 7Z"/>'),
  replay: svg('<path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>'),
  github: svg('<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.7c3.3-.4 6.8-1.6 6.8-7.3A5.7 5.7 0 0 0 19.3 4a5.2 5.2 0 0 0-.1-4s-1.3-.4-4.2 1.5a14.5 14.5 0 0 0-7.5 0C4.6-.4 3.3 0 3.3 0a5.2 5.2 0 0 0-.1 4 5.7 5.7 0 0 0-1.5 4c0 5.7 3.5 6.9 6.8 7.3A3.5 3.5 0 0 0 7.5 18v4" transform="translate(2 2) scale(.85)"/>'),
};
const check = (x, y, size = 1) => `<path class="check" d="m-6 0 4 4 9-9" transform="translate(${x} ${y}) scale(${size})"/>`;
const person = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})"><circle class="face" cy="-9" r="10"/><path class="shoulders" d="M-20 20a20 20 0 0 1 40 0"/></g>`;
const google = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})"><path fill="#4285f4" d="M20 0c0-1.4-.1-2.7-.4-4H0v8h11.2a9.6 9.6 0 0 1-4.2 6.3v5.2h6.8C17.8 11.8 20 6.5 20 0Z"/><path fill="#34a853" d="M0 20c5.6 0 10.4-1.9 13.8-5.1L7 9.7c-1.9 1.3-4.3 2-7 2-5.4 0-9.9-3.6-11.5-8.5h-7v5.4A20.8 20.8 0 0 0 0 20Z"/><path fill="#fbbc05" d="M-11.5 3.2a12.5 12.5 0 0 1 0-7.4v-5.4h-7a20.8 20.8 0 0 0 0 18.2Z"/><path fill="#ea4335" d="M0-13c3 0 5.6 1 7.7 3l5.8-5.8A20.5 20.5 0 0 0-18.5-9.6l7 5.4C-9.9-9.3-5.4-13 0-13Z"/></g>`;
const lock = (x, y) => `<g class="lock" transform="translate(${x} ${y})"><rect x="-9" y="-2" width="18" height="15" rx="4"/><path d="M-5-2v-5a5 5 0 0 1 10 0v5"/><circle cy="5" r="1"/></g>`;
const credit = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})"><rect class="credit" x="-30" y="-19" width="60" height="38" rx="6"/><path class="card-line" d="M-30-7h60M-20 10h10"/><rect class="chip" x="10" y="3" width="10" height="8" rx="2"/></g>`;
const sliders = (x, y) => `<g class="sliders" transform="translate(${x} ${y})"><path d="M-17-12h34M-17 0h34M-17 12h34"/><circle cx="-7" cy="-12" r="4"/><circle cx="10" r="4"/><circle cx="-3" cy="12" r="4"/></g>`;
const toggle = (x, y, on = false) => `<g transform="translate(${x} ${y})"><rect class="switch ${on ? 'on' : ''}" x="-22" y="-12" width="44" height="24" rx="12"/><circle class="knob" cx="${on ? 10 : -10}" r="8"/></g>`;
const skeleton = (x, y, width) => `<rect class="skeleton" x="${x}" y="${y}" width="${width}" height="5" rx="2.5"/>`;
const browser = `<rect class="window" x="24" y="25" width="312" height="218" rx="13"/><path class="hairline" d="M24 54h312"/><g class="dots"><circle cx="40" cy="40" r="2.5"/><circle cx="50" cy="40" r="2.5"/><circle cx="60" cy="40" r="2.5"/></g><rect class="address" x="133" y="36" width="94" height="8" rx="4"/>`;
const cursor = `<g class="cursor"><circle class="click-ring" r="14"/><path d="M0 0v23l6-6 5 11 4-2-5-10h10Z"/></g>`;
const success = `<circle class="success-halo" cx="180" cy="144" r="46"/>`;
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
