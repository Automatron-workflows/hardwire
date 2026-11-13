import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarPanel, createCalendar, clock } from '../playground/calendar.mjs';

async function plan(calendar) {
  const friday = await calendar.call({ portId: 'list-events', params: { day: 'friday' } });
  return calendar.call({ portId: 'plan-move', params: { ids: friday.events.map(event => event.id), day: 'monday' } });
}
const moveParams = proposal => ({ planId: proposal.id, version: proposal.version });
async function move(calendar, proposal) {
  const params = moveParams(proposal);
  return calendar.call({ portId: 'move-events', params, approval: calendar.approve('move-events', params) });
}

test('calendar discovers typed ports and plans around a real conflict without writing', async () => {
  const calendar = createCalendar();
  const before = calendar.snapshot();
  const discovered = await calendar.discover();
  assert.deepEqual(discovered.tools.map(tool => tool.name), ['list_events', 'move_events', 'plan_move', 'undo_move']);
  assert.equal(discovered.panel.ports.find(port => port.id === 'move-events').confirmation, 'user');
  const proposal = await plan(calendar);
  assert.equal(proposal.conflicts, 1);
  assert.deepEqual(proposal.moves.map(move => clock(move.after.start)), ['11:00', '13:00', '15:00']);
  assert.deepEqual(calendar.snapshot(), before);
  assert.equal(calendar.log().length, 2);
  assert.ok(calendar.log().every(record => record.kind === 'read' && record.panelDigest === discovered.digest));
});

test('an approved batch moves all meetings, preserves existing ones and can be undone exactly', async () => {
  const calendar = createCalendar();
  const original = calendar.snapshot();
  const proposal = await plan(calendar);
  const result = await move(calendar, proposal);
  assert.equal(result.version, 1);
  assert.equal(result.events.filter(event => event.day === 'friday').length, 0);
  assert.equal(result.events.filter(event => event.day === 'monday').length, 4);
  assert.deepEqual(result.events.find(event => event.id === 'team-sync'), original.events.find(event => event.id === 'team-sync'));
  const params = { changeId: result.changeId, version: result.version };
  await assert.rejects(calendar.call({ portId: 'undo-move', params }), /Approve/);
  const restored = await calendar.call({ portId: 'undo-move', params, approval: calendar.approve('undo-move', params) });
  assert.deepEqual(restored.events, original.events);
  assert.equal(restored.version, 2);
  assert.equal(calendar.log().at(-1).port, 'undo-move');
  assert.equal((await plan(calendar)).moves.length, 3);
});

test('writes reject missing, forged, altered and cross-instance approval without partial effects', async () => {
  const calendar = createCalendar();
  const proposal = await plan(calendar);
  const params = moveParams(proposal);
  const before = calendar.snapshot();
  for (const approval of [undefined, true, {}, { approved: true }]) {
    await assert.rejects(calendar.call({ portId: 'move-events', params, approval }), /Approve/);
  }
  const token = calendar.approve('move-events', params);
  await assert.rejects(calendar.call({ portId: 'move-events', params: { ...params, planId: 'other' }, approval: token }), /Approve/);
  const other = createCalendar();
  const otherPlan = await plan(other);
  await assert.rejects(other.call({ portId: 'move-events', params: moveParams(otherPlan), approval: token }), /Approve/);
  assert.deepEqual(calendar.snapshot(), before);
  assert.equal(calendar.log().filter(record => record.kind === 'write').length, 0);
});

test('duplicate concurrent calls can consume a grant only once', async () => {
  const calendar = createCalendar();
  const proposal = await plan(calendar);
  const params = moveParams(proposal);
  const approval = calendar.approve('move-events', params);
  const results = await Promise.allSettled([calendar.call({ portId: 'move-events', params, approval }), calendar.call({ portId: 'move-events', params, approval })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(calendar.snapshot().version, 1);
  assert.equal(calendar.log().filter(record => record.kind === 'write').length, 1);
});

test('cancelled, replaced and stale proposals cannot be applied', async () => {
  const calendar = createCalendar();
  const original = calendar.snapshot();
  const cancelled = await plan(calendar);
  calendar.discardProposal();
  await assert.rejects(move(calendar, cancelled), /no longer available/);
  const replaced = await plan(calendar);
  const current = await plan(calendar);
  await assert.rejects(move(calendar, replaced), /no longer available/);
  assert.deepEqual(calendar.snapshot(), original);
  await move(calendar, current);
  assert.throws(() => calendar.approve('move-events', moveParams(current)), /calendar changed/);
});

test('abort during asynchronous validation prevents the write', async () => {
  const calendar = createCalendar();
  const proposal = await plan(calendar);
  const params = moveParams(proposal);
  const controller = new AbortController();
  const before = calendar.snapshot();
  const operation = calendar.call({ portId: 'move-events', params, approval: calendar.approve('move-events', params), signal: controller.signal });
  controller.abort();
  await assert.rejects(operation, { name: 'AbortError' });
  assert.deepEqual(calendar.snapshot(), before);
});

test('changed contracts, unsupported ports and invalid arguments never dispatch', async () => {
  const calendar = createCalendar();
  const original = calendar.snapshot();
  const contract = calendarPanel();
  contract.ports[2].confirmation = 'none';
  await assert.rejects(calendar.discover(contract), /Unrecognized/);
  await assert.rejects(calendar.call({ contract, portId: 'list-events', params: { day: 'friday' } }), /Unrecognized/);
  await assert.rejects(calendar.call({ portId: 'send-email', params: {} }), /Unknown/);
  for (const params of [{}, { day: 42 }, { day: 'tuesday' }, { day: 'friday', url: 'https://example.com' }]) {
    await assert.rejects(calendar.call({ portId: 'list-events', params }));
  }
  for (const ids of [[], ['missing'], ['client-call', 'client-call']]) {
    await assert.rejects(calendar.call({ portId: 'plan-move', params: { ids, day: 'monday' } }));
  }
  assert.deepEqual(calendar.snapshot(), original);
  assert.equal(calendar.log().length, 0);
});

test('caller mutations cannot change contracts, pending inputs, proposals or internal state', async () => {
  const calendar = createCalendar();
  const contract = calendarPanel();
  contract.ports[0].parameters.properties.day.enum.push('tuesday');
  assert.equal(calendarPanel().ports[0].parameters.properties.day.enum.length, 2);
  const params = { day: 'friday' };
  const operation = calendar.call({ portId: 'list-events', params });
  params.day = 'monday';
  assert.equal((await operation).events.length, 3);
  const proposal = await plan(calendar);
  proposal.moves[0].after.start = 1;
  const snapshot = calendar.snapshot();
  snapshot.events[0].title = 'changed';
  const result = await move(calendar, proposal);
  assert.equal(result.events.find(event => event.id === 'client-call').start, 660);
  assert.equal(result.events[0].title, 'Client catch up');
  calendar.log()[0].status = 'forged';
  assert.equal(calendar.log()[0].status, 'succeeded');
});
