// Public surface of the hardwire package.
export {
  auditPanel,
  CONFIRMATIONS,
  DISCOVERY_PATH,
  HardwireError,
  KINDS,
  normalizePanel,
  PANEL_FILENAME,
  PANEL_LIMITS,
  PANEL_VERSION,
  panelDigest,
  validateParams,
} from "./panel.mjs";

export { compilePanel, findPort, toolName, toolsListResponse } from "./mcp.mjs";

export { assertPublicOrigin, fetchPage, probeOrigin, ROBOTS_CAP, SIGNALS, WEBMCP_WEIGHT } from "./probe.mjs";

export { buildTrace, redactParams, TRACE_VERSION, traceDigest, verifyTrace } from "./trace.mjs";

export { inferFromHtml, inferFromUrl, INFERENCE_VERSION, toPanelDraft } from "./infer.mjs";

export { comparePanels, DEFAULT_THRESHOLD, passes } from "./score.mjs";

export { scoreCorpus } from "./corpus.mjs";

export { canonicalJson } from "./canonical.mjs";
