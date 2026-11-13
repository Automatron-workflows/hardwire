// Application owned example, not a general executor. Everything lives in this tab.
import { canonicalJson, compilePanel, normalizePanel, panelDigestAsync, validateParams } from '../src/browser.mjs';

const clone = value => structuredClone(value);
const day = { type: 'string', enum: ['friday', 'monday'] };
const string = { type: 'string' };
const integer = { type: 'integer' };
export function calendarPanel() {
  const parameters = properties => ({ properties, required: Object.keys(properties) });
  return clone({
    panel: 'hardwire.panel/1', origin: 'https://automatron-workflows.github.io', revision: 'calendar-demo/1',
    ports: [
      { id: 'list-events', kind: 'read', summary: 'Read meetings in this demo calendar.', parameters: parameters({ day }) },
      { id: 'plan-move', kind: 'read', summary: 'Preview available times without changing meetings.', parameters: parameters({ ids: { type: 'array', items: string }, day }) },
      { id: 'move-events', kind: 'write', reversible: true, confirmation: 'user', summary: 'Apply one reviewed proposal to this demo calendar.', parameters: parameters({ planId: string, version: integer }) },
      { id: 'undo-move', kind: 'write', reversible: true, confirmation: 'user', summary: 'Restore the meetings from the last move.', parameters: parameters({ changeId: string, version: integer }) },
    ],
  });
}
const initialEvents = () => [
  { id: 'client-call', title: 'Client catch up', day: 'friday', start: 600, duration: 30 },
  { id: 'design-review', title: 'Design review', day: 'friday', start: 780, duration: 45 },
  { id: 'weekly-wrap', title: 'Weekly wrap', day: 'friday', start: 900, duration: 30 },
  { id: 'team-sync', title: 'Team sync', day: 'monday', start: 600, duration: 60 },
];
const overlaps = (a, b) => a.day === b.day && a.start < b.start + b.duration && b.start < a.start + a.duration;
export const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function createCalendar() {
  const panel = normalizePanel(calendarPanel());
  const digest = panelDigestAsync(panel);
  let events = initialEvents();
  let version = 0;
  let proposal = null;
  let lastChange = null;
  const approvals = new WeakMap();
  const records = [];
  let sequence = 0;
  const snapshot = () => clone({ events, version });
  const portFor = id => {
    const port = panel.ports.find(port => port.id === id);
    if (!port) throw new Error('Unknown calendar action.');
    return port;
  };
  const ensureVersion = expected => {
    if (expected !== version) throw new Error('The calendar changed. Review a new proposal.');
  };
  const handlers = {
    'list-events': args => ({ events: clone(events.filter(event => event.day === args.day)), version }),
    'plan-move': args => {
      if (!args.ids.length || args.ids.length > 3 || new Set(args.ids).size !== args.ids.length) throw new Error('Choose one to three distinct meetings.');
      const selected = args.ids.map(id => {
        const event = events.find(event => event.id === id);
        if (!event || event.day === args.day) throw new Error('The selected meeting cannot be moved.');
        return event;
      }).sort((a, b) => a.start - b.start);
      const occupied = events.filter(event => !args.ids.includes(event.id));
      const moves = [];
      let conflicts = 0;
      for (const event of selected) {
        const next = { ...event, day: args.day };
        if (occupied.some(other => overlaps(next, other))) conflicts++;
        while (occupied.some(other => overlaps(next, other)) && next.start + next.duration <= 1020) next.start += 15;
        if (next.start + next.duration > 1020) throw new Error('No available time. Nothing was changed.');
        moves.push({ before: clone(event), after: clone(next) });
        occupied.push(next);
      }
      proposal = { id: crypto.randomUUID(), version, day: args.day, moves, conflicts };
      return clone(proposal);
    },
    'move-events': args => {
      ensureVersion(args.version);
      if (!proposal || proposal.id !== args.planId || proposal.version !== version) throw new Error('This proposal is no longer available.');
      const changes = new Map(proposal.moves.map(move => [move.before.id, move.after]));
      const next = events.map(event => clone(changes.get(event.id) ?? event));
      // Recheck every conflict before replacing any event. The write is atomic.
      for (let i = 0; i < next.length; i++) {
        if (next.slice(i + 1).some(other => overlaps(next[i], other))) throw new Error('A meeting conflicts. Review a new proposal.');
      }
      lastChange = { id: crypto.randomUUID(), before: clone(events), version: version + 1 };
      events = next;
      version++;
      proposal = null;
      return { changeId: lastChange.id, ...snapshot() };
    },
    'undo-move': args => {
      ensureVersion(args.version);
      if (!lastChange || args.changeId !== lastChange.id || lastChange.version !== version) throw new Error('This change can no longer be undone.');
      events = lastChange.before;
      version++;
      lastChange = null;
      proposal = null;
      return snapshot();
    },
  };

  return {
    snapshot,
    log: () => clone(records),
    async discover(supplied = calendarPanel()) {
      if (await panelDigestAsync(supplied) !== await digest) throw new Error('Unrecognized calendar contract.');
      return { panel: clone(panel), tools: compilePanel(panel), digest: await digest };
    },
    // Called only by the application's explicit approval controls. A boolean in
    // an agent request is not approval. Grants are one use, scoped to exact args,
    // current calendar version and this application instance. Not remote auth.
    approve(portId, params) {
      const port = portFor(portId);
      if (port.confirmation !== 'user') throw new Error('This action does not request approval.');
      const args = validateParams(port, params);
      ensureVersion(args.version);
      const token = Object.freeze({});
      approvals.set(token, { portId, args: canonicalJson(args), version });
      return token;
    },
    discardProposal() { proposal = null; },
    async call({ contract = calendarPanel(), portId, params, approval, signal }) {
      signal?.throwIfAborted();
      // Snapshot caller data before hashing so a caller cannot change the request
      // while the asynchronous contract check is running.
      const supplied = JSON.parse(canonicalJson(contract));
      const input = JSON.parse(canonicalJson(params));
      const checkedDigest = await panelDigestAsync(supplied);
      if (checkedDigest !== await digest) throw new Error('Unrecognized calendar contract.');
      signal?.throwIfAborted();
      const port = portFor(portId);
      const args = validateParams(port, input);
      if (port.confirmation === 'user') {
        const grant = approval && approvals.get(approval);
        if (!grant || grant.portId !== portId || grant.args !== canonicalJson(args) || grant.version !== version) throw new Error('Approve these exact changes first.');
        approvals.delete(approval);
      }
      const result = handlers[portId](args);
      records.push({ sequence: ++sequence, port: port.id, kind: port.kind, confirmation: port.confirmation,
        params: clone(args), result: clone(result), panelDigest: checkedDigest, status: 'succeeded' });
      if (records.length > 50) records.shift();
      return clone(result);
    },
  };
}
