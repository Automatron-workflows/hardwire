// Application-owned consumer example. No arbitrary URL execution or credentials.
import { createHash } from 'node:crypto';
import { searchCatalogue } from './catalogue.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildTrace, canonicalJson, compilePanel, findPort, normalizePanel,
  panelDigest, validateParams, verifyTrace,
} from '../src/index.mjs';

export const cataloguePanel = {
  panel: 'hardwire.panel/1', origin: 'https://catalogue.example.com', revision: 'demo/1',
  ports: [{
    id: 'search-catalogue', kind: 'read', summary: 'Search the demo catalogue.',
    parameters: { properties: { query: { type: 'string' } }, required: ['query'] },
    expects: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, name: { type: 'string' },
    }, required: ['id', 'name'] } },
  }],
};
const reviewedDigest = panelDigest(cataloguePanel);

// Replace this application function with an existing, authorized read service.
// The model chooses arguments, never source code, URLs, headers or credentials.
const handlers = new Map([['search-catalogue', searchCatalogue]]);

export async function callReadTool(name, args, { panel: input = cataloguePanel } = {}) {
  const panel = normalizePanel(input);
  if (panelDigest(panel) !== reviewedDigest) throw new Error('panel_revision_not_reviewed');
  const resolved = findPort(panel, name);
  if (!resolved) throw new Error('tool_not_allowed');
  const { port } = resolved;
  if (port.kind !== 'read' || port.confirmation !== 'none' || port.preconditions.length) {
    throw new Error('policy_not_supported');
  }
  const handler = handlers.get(port.id);
  if (!handler) throw new Error('handler_not_registered');
  const params = validateParams(port, args);
  const result = await handler(params);
  // Application-specific result check. `expects` alone does not check results.
  if (!Array.isArray(result) || result.some(item =>
    typeof item.id !== 'string' || typeof item.name !== 'string' || Object.keys(item).length !== 2)) {
    throw new Error('catalogue_result_invalid');
  }
  const resultDigest = `sha256:${createHash('sha256').update(canonicalJson(result)).digest('hex')}`;
  const trace = buildTrace({ panel, port, params, actor: 'demo-consumer',
    outcome: { status: 'succeeded', resultDigest } });
  if (!verifyTrace(trace, { panel })) throw new Error('trace_verification_failed');
  return { result, trace };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const response = await callReadTool('search_catalogue', { query: 'lamp' });
  console.log(JSON.stringify({
    tools: compilePanel(cataloguePanel).map(tool => tool.name),
    ...response,
  }, null, 2));
}
