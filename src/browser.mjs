// Portable entry point. No network, filesystem, Node shims or runtime dependencies.
import { canonicalBytes } from './canonical.mjs';
import { normalizePanel } from './panel-schema.mjs';

export * from './panel-schema.mjs';
export { canonicalJson } from './canonical.mjs';
export { inferFromHtml, toPanelDraft, INFERENCE_VERSION } from './infer-html.mjs';
export { compilePanel, findPort, toolName, toolsListResponse } from './mcp.mjs';
export { comparePanels, passes, DEFAULT_THRESHOLD } from './score.mjs';

/** Same digest as the Node API, asynchronously using platform Web Crypto. */
export async function panelDigestAsync(panel) {
  const bytes = canonicalBytes(normalizePanel(panel));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
