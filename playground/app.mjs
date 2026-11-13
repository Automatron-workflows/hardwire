import { createCalendar, clock } from './calendar.mjs';

const $ = id => document.getElementById(id);
const calendar = createCalendar();
let phase = 'ready';
let proposal = null;
let change = null;
let discovery = null;
let controller = null;
const arrow = 'M5 12h14M13 6l6 6-6 6';
const tick = 'M5 12l4 4L19 6';

function row(event, before) {
  const li = document.createElement('li');
  li.className = 'meeting' + (before || phase === 'complete' && event.id !== 'team-sync' ? ' changed' : '') + (event.id === 'team-sync' ? ' existing' : '');
  const marker = document.createElement('span');
  marker.className = 'marker';
  marker.setAttribute('aria-hidden', 'true');
  const title = document.createElement('span');
  title.className = 'meeting-title';
  title.textContent = event.title;
  const time = document.createElement('span');
  time.className = 'meeting-time';
  if (before && before.start !== event.start) {
    const old = document.createElement('span');
    old.className = 'old-time';
    old.textContent = clock(before.start);
    old.setAttribute('aria-label', 'Previously ' + clock(before.start) + '. Now');
    time.append(old);
  }
  time.append(document.createTextNode(clock(event.start)));
  li.append(marker, title, time);
  return li;
}
function render() {
  const complete = ['complete', 'undoing'].includes(phase);
  const reviewing = ['review', 'applying'].includes(phase);
  $('request-label').textContent = controller ? (phase === 'applying' ? 'Updating your calendar…' : phase === 'undoing' ? 'Restoring Friday…' : 'Checking your calendar…')
    : complete ? 'Friday is clear.' : reviewing ? 'Approve ' + proposal.moves.length + ' changes' : 'Move Friday’s meetings to Monday';
  $('request').disabled = !!controller || complete;
  $('request').setAttribute('aria-busy', String(!!controller));
  $('request').classList.toggle('complete', complete);
  $('send-path').setAttribute('d', complete ? tick : arrow);
  $('calendar-day').textContent = reviewing ? 'Friday → Monday' : complete ? 'Monday' : 'Friday';
  $('calendar-caption').textContent = reviewing ? 'Proposed changes' : 'Demo calendar';
  const entries = reviewing ? proposal.moves.map(move => row(move.after, move.before))
    : calendar.snapshot().events.filter(event => event.day === (complete ? 'monday' : 'friday')).sort((a, b) => a.start - b.start).map(event => row(event));
  $('meetings').replaceChildren(...entries);
  $('secondary').textContent = complete ? 'Undo' : 'Cancel';
  $('secondary').hidden = !['review', 'complete', 'planning'].includes(phase);
  $('secondary').disabled = !!controller && phase !== 'planning';
  if (discovery) {
    $('details').hidden = false;
    $('discovery').textContent = discovery.tools.length + ' typed actions discovered. Each call below passed Hardwire validation.';
    const labels = {
      'list-events': record => 'Read ' + record.params.day + ': ' + record.result.events.length + ' meetings.',
      'plan-move': record => 'Checked Monday: ' + record.result.moves.length + ' available times, ' + record.result.conflicts + ' conflict avoided.',
      'move-events': () => 'Applied the approved changes together.',
      'undo-move': () => 'Restored the meetings after your Undo request.',
    };
    $('action-log').replaceChildren(...calendar.log().map(record => {
      const li = document.createElement('li');
      li.textContent = labels[record.port](record);
      return li;
    }));
    $('record').textContent = JSON.stringify({ contract: discovery.panel, tools: discovery.tools, calls: calendar.log() }, null, 2);
  }
}
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
async function work(operation) {
  if (controller) return;
  controller = new AbortController();
  const signal = controller.signal;
  render();
  try { await operation(signal); }
  catch (error) {
    calendar.discardProposal();
    proposal = null;
    // Reflect actual application state, including an error after a write.
    phase = calendar.snapshot().events.some(event => event.day === 'friday') ? 'ready' : 'complete';
    status(signal.aborted ? 'Cancelled. Your meetings stayed where they were.' : error.message, !signal.aborted);
  } finally {
    controller = null;
    render();
    if ([document.body, $('secondary'), $('request')].includes(document.activeElement)) {
      (phase === 'complete' ? $('secondary') : $('request')).focus({ preventScroll: true });
    }
  }
}
async function plan() {
  phase = 'planning';
  status('Finding times that work.');
  await work(async signal => {
    discovery = await calendar.discover();
    const friday = await calendar.call({ portId: 'list-events', params: { day: 'friday' }, signal });
    proposal = await calendar.call({ portId: 'plan-move', params: { ids: friday.events.map(event => event.id), day: 'monday' }, signal });
    signal.throwIfAborted();
    phase = 'review';
    const shifted = proposal.moves.find(move => move.before.start !== move.after.start);
    status(shifted ? clock(shifted.before.start) + ' is busy on Monday. Your first meeting fits at ' + clock(shifted.after.start) + '.' : 'Every meeting fits. Ready for your approval.');
  });
}
async function apply() {
  phase = 'applying';
  status('Applying the changes you approved.');
  await work(async signal => {
    const params = { planId: proposal.id, version: proposal.version };
    const approval = calendar.approve('move-events', params);
    change = await calendar.call({ portId: 'move-events', params, approval, signal });
    // Verify through the declared read interface, not a timer or animation.
    const friday = await calendar.call({ portId: 'list-events', params: { day: 'friday' } });
    const monday = await calendar.call({ portId: 'list-events', params: { day: 'monday' } });
    if (friday.events.length || !proposal.moves.every(move => monday.events.some(event => event.id === move.after.id && event.start === move.after.start))) throw new Error('The calendar result needs review.');
    phase = 'complete';
    status(proposal.moves.length + ' meetings moved to Monday. Nothing overlaps.');
    proposal = null;
  });
}
async function undo() {
  phase = 'undoing';
  status('Restoring your original meetings.');
  await work(async signal => {
    const params = { changeId: change.changeId, version: change.version };
    const approval = calendar.approve('undo-move', params);
    await calendar.call({ portId: 'undo-move', params, approval, signal });
    change = null;
    phase = 'ready';
    status('Friday is back as it was. Try again.');
  });
}
$('request').addEventListener('click', () => {
  if (controller) return;
  if (phase === 'ready') void plan();
  else if (phase === 'review') void apply();
});
function cancel() {
  if (phase === 'planning') controller?.abort();
  else if (phase === 'review') {
    calendar.discardProposal(); proposal = null; phase = 'ready';
    status('Cancelled. Your meetings stayed where they were.'); render(); $('request').focus();
  }
}
$('secondary').addEventListener('click', () => phase === 'complete' ? void undo() : cancel());
window.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
window.addEventListener('pagehide', () => controller?.abort());
status('3 meetings. One request.');
render();
