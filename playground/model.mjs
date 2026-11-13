// Shared by the browser worker and tests. No DOM, storage or network access.
import {
  auditPanel, canonicalJson, compilePanel, HardwireError, inferFromHtml,
  normalizePanel, panelDigestAsync, toPanelDraft, validateParams,
} from '../src/browser.mjs';
import { samples } from './samples.mjs';
import { searchCatalogue } from '../examples/catalogue.mjs';

export function parseJson(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 256 * 1024) {
    throw new HardwireError('hardwire_input_invalid', '', 'JSON must be at most 256 KiB');
  }
  try { return JSON.parse(canonicalJson(JSON.parse(text))); }
  catch { throw new HardwireError('hardwire_input_invalid', '', 'Enter valid, bounded JSON'); }
}

export async function inspect({ mode, source, origin }) {
  if (!['html', 'panel'].includes(mode)) throw new HardwireError('hardwire_input_invalid', 'mode');
  const inference = mode === 'html' ? inferFromHtml(source, { origin }) : null;
  if (inference && !inference.candidates.length) {
    return { panel: null, tools: [], digest: null, audit: null, notes: inference.notes, candidates: [] };
  }
  const panel = inference ? toPanelDraft(inference) : normalizePanel(parseJson(source));
  return {
    panel, tools: compilePanel(panel), digest: await panelDigestAsync(panel), audit: auditPanel(panel),
    notes: inference?.notes ?? ['These are supplied declarations. Validation does not verify application behavior or grant approval.'],
    candidates: inference?.candidates ?? [],
  };
}

export function checkArguments({ panel, portId, params }) {
  const normalized = normalizePanel(panel);
  const port = normalized.ports.find(candidate => candidate.id === portId);
  if (!port) throw new HardwireError('hardwire_port_unknown', 'port');
  validateParams(port, parseJson(params));
  return { valid: true, executed: false, confirmation: port.confirmation, kind: port.kind };
}

// This fixed application handler is deliberately separate from generic inspection.
// Supplied endpoints never choose a URL, handler or implementation.
let reviewed;
export async function runDemoSearch({ panel, params }) {
  reviewed ??= inspect(samples.search);
  const expected = await reviewed;
  if (await panelDigestAsync(panel) !== expected.digest) {
    throw new HardwireError('hardwire_demo_unreviewed', 'panel', 'The demo only runs its original search contract');
  }
  const port = expected.panel.ports[0];
  const args = validateParams(port, parseJson(params));
  return { products: searchCatalogue(args), executed: true, demo: true };
}
