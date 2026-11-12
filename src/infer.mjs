// Infer candidate ports from a live page.
//
// This is the part that works without cooperation: a site that published
// nothing still has forms and structured data, and those describe operations.
// Inference is deliberately conservative. It may only propose `read` and
// `write`, never `payment` or `destructive`, so a bad inference cannot spend
// money or delete an account. Every candidate is labelled low confidence and
// must be confirmed by the publisher before anyone treats it as truth.
import { HardwireError, PANEL_VERSION } from "./panel.mjs";
import { assertPublicOrigin, fetchPage } from "./probe.mjs";

export const INFERENCE_VERSION = "hardwire.inference/1";
const MAX_DEPTH = 6;
const MAX_HTML = 512 * 1024;

const ATTRIBUTE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const FIELD_TYPES = Object.freeze({
  text: "string", search: "string", email: "string", url: "string", tel: "string",
  password: "string", date: "string", time: "string", "datetime-local": "string",
  month: "string", week: "string", color: "string",
  number: "number", range: "number",
  checkbox: "boolean", radio: "boolean",
});
const IGNORED_INPUTS = new Set(["submit", "button", "reset", "image", "file", "hidden"]);

function attributes(source) {
  const out = {};
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = match[1].toLowerCase();
    if (!(name in out)) out[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return out;
}

function slug(value, fallback) {
  const clean = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!clean) return fallback;
  return /^[a-z]/.test(clean) ? clean : `port-${clean}`;
}

function lastSegment(action) {
  try {
    const path = new URL(action, "https://placeholder.invalid").pathname;
    return path.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
}

function fieldSchema(tag, attrs) {
  if (tag === "select" || tag === "textarea") return { type: "string" };
  const type = (attrs.type ?? "text").toLowerCase();
  return { type: FIELD_TYPES[type] ?? "string" };
}

function collectFields(body) {
  const properties = {};
  const required = [];
  const unsupported = [];
  for (const match of body.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = attributes(match[2]);
    const name = attrs.name;
    if (!name) continue;
    if (tag === "input" && IGNORED_INPUTS.has((attrs.type ?? "").toLowerCase())) continue;
    // Bracket and dashed names (`user[name]`, `search-term`) are valid HTML and
    // common. They are rejected here because accepting arbitrary keys invites
    // prototype pollution, so the omission is reported instead of hidden.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      unsupported.push(name);
      continue;
    }
    properties[name] = fieldSchema(tag, attrs);
    if ("required" in attrs) required.push(name);
  }
  return { schema: { type: "object", properties, required: required.sort() }, unsupported };
}

function walk(node, visit, depth = 0) {
  if (depth > MAX_DEPTH || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const entry of node) walk(entry, visit, depth + 1);
    return;
  }
  visit(node);
  for (const value of Object.values(node)) walk(value, visit, depth + 1);
}

function actionTarget(action) {
  const target = action.target ?? action.url;
  if (typeof target === "string") return target;
  if (target && typeof target === "object") {
    return target.urlTemplate ?? target.url ?? target["@id"] ?? "";
  }
  return "";
}

function hasActionType(node) {
  const type = node["@type"];
  const values = Array.isArray(type) ? type : [type];
  return values.some((entry) => typeof entry === "string" && entry.endsWith("Action"));
}

/** Extract JSON-LD search actions, which describe reads without a form. */
function structuredActions(html) {
  const found = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    walk(parsed, (node) => {
      if (!hasActionType(node)) return;
      const raw = node["@type"];
      const type = Array.isArray(raw)
        ? raw.find((entry) => typeof entry === "string" && entry.endsWith("Action"))
        : raw;
      if (typeof type !== "string") return;
      const target = actionTarget(node);
      if (!target) return;
      found.push({ type, target, templated: target.includes("{") });
    });
  }
  return found;
}

/**
 * Turn a page into candidate ports. Never returns `payment` or `destructive`,
 * and never asserts reversibility.
 */
export function inferFromHtml(html, { origin }) {
  if (typeof html !== "string") throw new HardwireError("hardwire_infer_failed", "html", "expected a string");
  if (!origin) throw new HardwireError("hardwire_origin_invalid", "origin", "required");
  const source = html.slice(0, MAX_HTML);

  const candidates = [];
  const used = new Map();
  const taken = new Set();
  const unsupportedNames = new Set();
  const unique = (base) => {
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    taken.add(id);
    return id;
  };

  for (const match of source.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = attributes(match[1]);
    const method = (attrs.method ?? "get").toLowerCase();
    const action = attrs.action ?? "";
    const label = attrs["aria-label"] || attrs.name || attrs.id || lastSegment(action) || "form";
    const idBase = attrs.id || attrs.name || lastSegment(action) || "form";
    const id = unique(slug(idBase, "submit"));
    const { schema: fields, unsupported } = collectFields(match[2]);
    const kind = method === "get" ? "read" : "write";
    for (const name of unsupported) unsupportedNames.add(name);

    candidates.push({
      id,
      kind,
      summary: `Submit the ${label} form.`,
      confidence: action ? "low" : "very-low",
      evidence: [
        `form method=${method}${action ? ` action=${action}` : ""}`,
        `fields=${Object.keys(fields.properties).length}`,
        ...(unsupported.length ? [`unsupported=${unsupported.join(",")}`] : []),
      ],
      ...(unsupported.length ? { unsupported } : {}),
      parameters: fields,
      ...(action ? { endpoint: action } : {}),
    });
  }

  for (const action of structuredActions(source)) {
    const base = slug(action.type.replace(/Action$/, ""), "search");
    // A form is stronger evidence than structured data; do not shadow it.
    if (taken.has(base)) continue;
    const id = unique(base);
    candidates.push({
      id,
      kind: "read",
      summary: `Run the site's ${action.type.replace(/Action$/, "").toLowerCase()} action.`,
      confidence: "low",
      evidence: [
        `json-ld ${action.type}`,
        `target=${action.target}`,
        ...(action.templated ? ["templated target; endpoint omitted"] : []),
      ],
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search terms." } },
        required: ["query"],
      },
      // A URL template is not callable as written, so it is not offered as one.
      ...(!action.templated ? { endpoint: action.target } : {}),
    });
  }

  return {
    inference: INFERENCE_VERSION,
    origin,
    candidates,
    notes: [
      "Candidates are low-confidence guesses from markup, not a published contract.",
      "Inference never proposes payment or destructive operations.",
      "Every candidate must be confirmed by the publisher before it is trusted.",
      ...(unsupportedNames.size
        ? [`${unsupportedNames.size} field name(s) could not be represented: ${[...unsupportedNames].sort().join(", ")}`]
        : []),
    ],
  };
}

/** Fetch a page and infer from it. */
export async function inferFromUrl(origin, options = {}) {
  const base = assertPublicOrigin(origin, { allowPrivate: options.allowPrivate });
  const page = await fetchPage(base, {
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
  });
  if (page.status !== 200) {
    throw new HardwireError("hardwire_infer_failed", "origin", `page returned ${page.status || page.error}`);
  }
  return inferFromHtml(page.body, { origin: base });
}

/**
 * Render candidates as a panel a reviewer can edit. Writes keep user
 * confirmation and are never marked reversible, so the draft is safe to
 * validate but not safe to trust.
 */
export function toPanelDraft(inference) {
  const ports = inference.candidates
    .filter((candidate) => candidate.kind === "read" || candidate.kind === "write")
    .map((candidate) => ({
      id: candidate.id,
      kind: candidate.kind,
      summary: candidate.summary.slice(0, 280),
      ...(candidate.kind === "write" ? { confirmation: "user" } : {}),
      parameters: candidate.parameters,
      ...(candidate.endpoint ? { endpoint: candidate.endpoint } : {}),
    }));

  if (ports.length === 0) {
    throw new HardwireError("hardwire_infer_failed", "candidates", "nothing to draft; no forms or structured actions found");
  }

  return {
    panel: PANEL_VERSION,
    origin: inference.origin,
    title: "Draft inferred from a live page. Review every port before use.",
    revision: "inferred/1",
    ports,
  };
}
