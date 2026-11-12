// Hardwire traces: the record of one port call against one panel revision.
//
// A trace is a digest, not a signature. It detects edits and truncation; it
// does not prove who asserted the record. Signed delivery is a separate
// primitive and deliberately out of scope for this package.
import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical.mjs";
import { HardwireError, normalizePanel, panelDigest, validateParams } from "./panel.mjs";

export const TRACE_VERSION = "hardwire.trace/1";
const OUTCOMES = new Set(["succeeded", "failed", "unknown", "refused"]);
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const validTime = (at) => typeof at === "string" && TIMESTAMP.test(at) &&
  Number.isFinite(Date.parse(at)) && new Date(at).toISOString() === (at.length === 20 ? at.replace("Z", ".000Z") : at);

/**
 * Replace write-only values before they enter a trace. The schema is the only
 * thing that knows which arguments are secrets, so redaction happens here
 * rather than in a caller's memory.
 */
export function redactParams(schema, value) {
  if (value === null || value === undefined) return value;
  if (schema.writeOnly) return "[redacted]";
  if (schema.type === "object" && typeof value === "object" && !Array.isArray(value)) {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      const property = schema.properties?.[key];
      if (!property) {
        out[key] = entry;
        continue;
      }
      out[key] = property.writeOnly ? "[redacted]" : redactParams(property, entry);
    }
    return out;
  }
  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    return value.map((entry) => redactParams(schema.items, entry));
  }
  return value;
}

/**
 * Record one attempted call. `params` are the validated arguments, not the
 * caller's prompt, so the digest cannot be re-read as intent. Write-only
 * parameters are redacted before hashing. A response body's hash belongs in
 * `outcome.resultDigest`; the body itself stays out.
 */
export function buildTrace({
  panel,
  port,
  params = {},
  outcome = { status: "unknown" },
  at = new Date().toISOString(),
  actor = "agent",
}) {
  panel = normalizePanel(panel);
  const id = typeof port === "string" ? port : port?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new HardwireError("hardwire_panel_invalid", "port", "a port id or normalised port is required");
  }
  // The panel is the authority. A caller cannot attach a read port's id to a
  // payment's schema, or vice versa, and have the trace record the lie.
  const bound = panel.ports.find((candidate) => candidate.id === id);
  if (!bound) {
    throw new HardwireError("hardwire_panel_invalid", "port", `${id} is not in the panel`);
  }
  if (typeof bound.kind !== "string" || typeof bound.confirmation !== "string") {
    throw new HardwireError("hardwire_panel_invalid", "port", `${id} is not normalised`);
  }
  if (!outcome || !OUTCOMES.has(outcome.status)) {
    throw new HardwireError("hardwire_trace_invalid", "outcome.status", `expected one of ${[...OUTCOMES].join(", ")}`);
  }
  if (!validTime(at)) throw new HardwireError("hardwire_trace_invalid", "at", "expected a real ISO-8601 UTC timestamp");
  if (typeof actor !== "string" || !actor.length || actor.length > 128) {
    throw new HardwireError("hardwire_trace_invalid", "actor", "expected 1–128 characters");
  }
  if (outcome.code !== undefined && (typeof outcome.code !== "string" || !outcome.code.length || outcome.code.length > 128)) {
    throw new HardwireError("hardwire_trace_invalid", "outcome.code", "expected 1–128 characters");
  }
  if (outcome.resultDigest !== undefined && !DIGEST.test(outcome.resultDigest)) {
    throw new HardwireError("hardwire_trace_invalid", "outcome.resultDigest", "expected sha256 and 64 lowercase hex digits");
  }

  const document = {
    trace: TRACE_VERSION,
    panel: panel.origin,
    panelDigest: panelDigest(panel),
    ...(panel.revision ? { revision: panel.revision } : {}),
    port: { id: bound.id, kind: bound.kind, confirmation: bound.confirmation },
    actor: String(actor),
    at,
    params: redactParams(bound.parameters, validateParams(bound, params)),
    outcome: {
      status: outcome.status,
      ...(outcome.code ? { code: String(outcome.code) } : {}),
      ...(outcome.resultDigest ? { resultDigest: String(outcome.resultDigest) } : {}),
    },
  };

  return { ...document, digest: traceDigest(document) };
}

/** Hash of the canonical document without its own digest field. */
export function traceDigest(document) {
  const { digest: _ignored, ...rest } = document;
  return `sha256:${createHash("sha256").update(canonicalJson(rest), "utf8").digest("hex")}`;
}

/**
 * True only when the digest still matches the document. Recomputation catches
 * truncation and edits; it does not catch forgery, which needs an issuer.
 */
export function verifyTrace(trace, { panel } = {}) {
  if (!trace || typeof trace !== "object") return false;
  if (trace.trace !== TRACE_VERSION) return false;
  if (!DIGEST.test(trace.digest) || !DIGEST.test(trace.panelDigest)) return false;
  if (!validTime(trace.at) || !OUTCOMES.has(trace.outcome?.status)) return false;
  if (typeof trace.actor !== "string" || !trace.actor.length || trace.actor.length > 128) return false;
  if (typeof trace.port?.id !== "string" || !["read", "write", "payment", "destructive"].includes(trace.port?.kind) || !["none", "user", "owner"].includes(trace.port?.confirmation)) return false;
  if (!trace.params || typeof trace.params !== "object" || Array.isArray(trace.params)) return false;
  try {
    if (panel !== undefined) {
      const normalized = normalizePanel(panel);
      const port = normalized.ports.find((entry) => entry.id === trace.port.id);
      if (!port || trace.panel !== normalized.origin || trace.panelDigest !== panelDigest(normalized) || trace.revision !== normalized.revision || trace.port.kind !== port.kind || trace.port.confirmation !== port.confirmation) return false;
    }
    return traceDigest(trace) === trace.digest;
  } catch {
    return false;
  }
}
