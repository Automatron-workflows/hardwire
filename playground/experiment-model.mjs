// The experiment uses the same fixed handlers as the three film scenarios.
// Approval levels here are local UI assertions, never proof of identity.
import { canonicalJson, normalizePanel, validateParams } from '../src/browser.mjs';
import { comparisonPanel, createComparison, scenarios } from './comparison.mjs';

export const invalidArguments = Object.freeze({
  signin: Object.freeze({ provider: 'google', account: 'someone-else' }),
  payment: Object.freeze({ invoiceId: 'demo001', amount: 2500, currency: 'EUR' }),
  settings: Object.freeze({ marketingEmails: 'false' }),
});

export function createExperiment(id) {
  const app = createComparison(id);
  const port = normalizePanel(comparisonPanel()).ports.find(item => item.id === scenarios[id].portId);
  let pending = null;
  let busy = false;
  let complete = false;
  return {
    snapshot: app.snapshot,
    log: app.log,
    cancel() { pending = null; },
    async submit(params) {
      if (busy || complete) throw new Error('Reset this experiment before running it again.');
      pending = null;
      // Copy before any asynchronous work, including objects supplied by callers.
      const args = validateParams(port, JSON.parse(canonicalJson(params)));
      if (port.confirmation !== 'none') {
        pending = args;
        return { status: 'approval', level: port.confirmation, params: structuredClone(args) };
      }
      busy = true;
      try {
        const result = await app.run({ params: args });
        complete = true;
        return { status: 'complete', result };
      } finally { busy = false; }
    },
    async confirm(params) {
      if (busy || complete) throw new Error('Reset this experiment before running it again.');
      if (!pending) throw new Error('Run and review this request before approving it.');
      const args = pending;
      pending = null;
      if (canonicalJson(params) !== canonicalJson(args)) throw new Error('The request changed. Run it again before approving.');
      busy = true;
      try {
        const approval = app.approve({ level: port.confirmation, params: args });
        const result = await app.run({ params: args, approval });
        complete = true;
        return { status: 'complete', result };
      } finally { busy = false; }
    },
  };
}
