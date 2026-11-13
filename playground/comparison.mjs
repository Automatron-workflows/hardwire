// Fixed application handlers for the illustrated demo. No OAuth or payment provider.
import { canonicalJson, normalizePanel, panelDigestAsync, validateParams } from '../src/browser.mjs';

const clone = value => structuredClone(value);
const parameters = properties => ({ properties, required: Object.keys(properties) });
export function comparisonPanel() {
  return {
    panel: 'hardwire.panel/1', origin: 'https://automatron-workflows.github.io', revision: 'comparisons/1',
    ports: [
      { id: 'start-session', kind: 'write', confirmation: 'user', reversible: true,
        summary: 'Start a local demo session after consent.', parameters: parameters({ provider: { type: 'string', enum: ['google'] }, account: { type: 'string', enum: ['demo'] } }) },
      { id: 'pay-invoice', kind: 'payment', confirmation: 'owner',
        summary: 'Mark one fixture invoice paid after demo approval.', parameters: parameters({ invoiceId: { type: 'string', enum: ['demo001'] }, amount: { type: 'integer', enum: [2400] }, currency: { type: 'string', enum: ['EUR'] } }) },
      { id: 'set-preferences', kind: 'write', confirmation: 'none', reversible: true,
        summary: 'Change the local marketing email preference.', parameters: parameters({ marketingEmails: { type: 'boolean' } }) },
    ],
  };
}
export const scenarios = Object.freeze({
  signin: { portId: 'start-session', params: { provider: 'google', account: 'demo' } },
  payment: { portId: 'pay-invoice', params: { invoiceId: 'demo001', amount: 2400, currency: 'EUR' } },
  settings: { portId: 'set-preferences', params: { marketingEmails: false } },
});
// Freeze nested configuration so consumers cannot change the fixed target actions.
for (const scenario of Object.values(scenarios)) { Object.freeze(scenario.params); Object.freeze(scenario); }

export function createComparison(scenario) {
  if (!Object.hasOwn(scenarios, scenario)) throw new Error('Unknown demo scenario.');
  const panel = normalizePanel(comparisonPanel());
  const digest = panelDigestAsync(panel);
  const port = panel.ports.find(item => item.id === scenarios[scenario].portId);
  const grants = new WeakMap();
  let state = { signedIn: false, invoicePaid: false, marketingEmails: true };
  let executed = false;
  const records = [];
  return {
    snapshot: () => clone(state),
    log: () => clone(records),
    // Only the explicit demo approval control calls this. The level is a local
    // UI assertion, not proof of identity or production authorization.
    approve({ level, params }) {
      if (port.confirmation === 'none' || level !== port.confirmation) throw new Error('Approval level does not match this action.');
      const args = validateParams(port, params);
      const token = Object.freeze({});
      grants.set(token, canonicalJson(args));
      return token;
    },
    async run({ contract = comparisonPanel(), params, approval, signal }) {
      signal?.throwIfAborted();
      const supplied = JSON.parse(canonicalJson(contract));
      const input = JSON.parse(canonicalJson(params));
      const checkedDigest = await panelDigestAsync(supplied);
      if (checkedDigest !== await digest) throw new Error('Unrecognized demo contract.');
      const args = validateParams(port, input);
      signal?.throwIfAborted();
      if (executed) throw new Error('This comparison already ran. Start a fresh replay.');
      if (port.confirmation !== 'none') {
        if (!approval || grants.get(approval) !== canonicalJson(args)) throw new Error('Approve this exact demo action first.');
        grants.delete(approval);
      }
      // No await between the last checks and dispatch: one atomic local change.
      if (scenario === 'signin') state.signedIn = true;
      if (scenario === 'payment') state.invoicePaid = true;
      if (scenario === 'settings') state.marketingEmails = args.marketingEmails;
      executed = true;
      records.push({ port: port.id, kind: port.kind, confirmation: port.confirmation, params: clone(args), result: clone(state), panelDigest: checkedDigest });
      return clone(state);
    },
  };
}
