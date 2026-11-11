// Probe a live origin for signals that an agent can act without pixels.
//
// Every path below is a convention, not a standard, and the panel path is this
// project's own proposal. That is why each signal carries a status and the
// result is described as a diagnostic rather than a grade. The probe never
// throws on network failure: a blocked or missing endpoint is data.
import { DISCOVERY_PATH, HardwireError, normalizePanel } from "./panel.mjs";

const DEFAULT_TIMEOUT_MS = 6000;
const MAX_BODY_BYTES = 512 * 1024;
const USER_AGENT = "Hardwire-probe/1.0 (+https://github.com/Automatron-workflows/hardwire)";

// Weights sum to 100 with the in-page WebMCP signal. The panel itself is worth
// the most because it is the only signal that names real operations.
export const WEBMCP_WEIGHT = 20;
export const ROBOTS_CAP = 25;

export const SIGNALS = Object.freeze([
  { id: "hardwire", path: DISCOVERY_PATH, weight: 30, status: "proposed",
    detail: "published panel: the operation surface itself" },
  { id: "mcp", path: "/.well-known/mcp.json", weight: 15, status: "convention",
    detail: "published MCP server descriptor" },
  { id: "openapi", path: "/openapi.json", weight: 15, status: "convention",
    detail: "OpenAPI document that can be converted into tools" },
  { id: "agent-card", path: "/.well-known/agent-card.json", weight: 10, status: "deployed",
    detail: "machine-readable description of the agent-facing surface" },
  { id: "llms", path: "/llms.txt", weight: 5, status: "convention",
    detail: "prose guide for models; helps reading, not acting" },
  { id: "x402", path: "/.well-known/x402", weight: 5, status: "deployed",
    detail: "pays-per-call discovery; commerce, not an operation surface" },
]);

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

export function assertPublicOrigin(origin, { allowPrivate = false } = {}) {
  let url;
  try {
    url = new URL(origin);
  } catch {
    throw new HardwireError("hardwire_origin_invalid", "origin", "not an absolute URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new HardwireError("hardwire_origin_invalid", "origin", "http or https only");
  }
  if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new HardwireError("hardwire_origin_invalid", "origin", "https is required outside local development");
  }
  if (!allowPrivate && isPrivateHostname(url.hostname)) {
    throw new HardwireError("hardwire_origin_private", "origin", "refusing to probe a private host without --allow-private");
  }
  return url.origin;
}

async function readBounded(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).subarray(0, MAX_BODY_BYTES).toString("utf8");
}

/** One bounded GET. Redirects are not followed so a probe cannot be walked elsewhere. */
export async function fetchPage(url, { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof fetchImpl !== "function") throw new HardwireError("hardwire_panel_invalid", "fetch", "no fetch available");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/json, text/html;q=0.9, text/plain;q=0.8" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const textual = /json|html|text\/plain|xml/.test(contentType);
    if (response.status !== 200 || !textual) {
      await response.body?.cancel().catch(() => {});
      return { status: response.status, contentType, body: "", redirect: response.headers.get("location") ?? null };
    }
    return {
      status: response.status,
      contentType,
      body: await readBounded(response),
      redirect: response.headers.get("location") ?? null,
    };
  } catch (error) {
    return { status: 0, contentType: "", body: "", error: error.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

function robotsBlocksAllAgents(body) {
  const lines = body.split(/\r?\n/).map((line) => line.replace(/#.*$/, "").trim());
  let inAll = false;
  let disallowsRoot = false;
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") inAll = value === "*";
    else if (inAll && key === "disallow" && (value === "/" || value === "/*")) disallowsRoot = true;
  }
  return disallowsRoot;
}

function htmlSignals(body) {
  const lower = body.toLowerCase();
  const links = [...lower.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]);
  return {
    declaresMcpLink: links.some((tag) => /rel=["']?alternate/.test(tag) && /mcp/.test(tag)),
    declaresWebMcpMeta: /<meta\b[^>]*name=["']?webmcp/.test(lower),
    referencesModelContext: /navigator\.modelcontext|providecontext\s*\(/.test(lower),
  };
}

/** Validate a discovered panel without letting a bad file abort the probe. */
function inspectPanel(body, origin) {
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { valid: false, code: "hardwire_panel_invalid", reason: "not JSON" };
  }
  try {
    const panel = normalizePanel(parsed);
    return {
      valid: true,
      ports: panel.ports.length,
      origin: panel.origin,
      ...(panel.revision ? { revision: panel.revision } : {}),
      ...(panel.origin !== origin ? { originMismatch: true } : {}),
    };
  } catch (error) {
    return { valid: false, code: error.code ?? "hardwire_panel_invalid", reason: error.detail || error.message };
  }
}

/**
 * Probe an origin. Returns a deterministic report; the caller decides what the
 * number means. `fetchImpl` exists so tests never touch the network.
 */
export async function probeOrigin(origin, options = {}) {
  const { fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS, allowPrivate = false } = options;
  const base = assertPublicOrigin(origin, { allowPrivate });

  const paths = [...SIGNALS.map((signal) => signal.path), "/robots.txt", "/"];
  const responses = await Promise.all(
    paths.map((path) => fetchPage(`${base}${path}`, { fetchImpl, timeoutMs })),
  );
  const byPath = new Map(paths.map((path, index) => [path, responses[index]]));

  const probes = SIGNALS.map((signal) => {
    const response = byPath.get(signal.path);
    const ok = response.status === 200 && !response.error;
    return {
      id: signal.id,
      path: signal.path,
      status: response.status,
      ok,
      ...(response.error ? { error: response.error } : {}),
      ...(response.redirect ? { redirect: response.redirect } : {}),
      weight: signal.weight,
      source: signal.status,
      detail: signal.detail,
    };
  });

  // A panel that exists but does not validate is not a surface.
  const hardwireProbe = probes.find((probe) => probe.id === "hardwire");
  if (hardwireProbe.ok) {
    const panel = inspectPanel(byPath.get(DISCOVERY_PATH).body, base);
    hardwireProbe.panel = panel;
    if (!panel.valid) {
      hardwireProbe.ok = false;
      hardwireProbe.note = `panel did not validate: ${panel.code}`;
    }
  }

  const root = byPath.get("/");
  const page = root.status === 200 ? htmlSignals(root.body) : {
    declaresMcpLink: false,
    declaresWebMcpMeta: false,
    referencesModelContext: false,
  };
  if (page.declaresMcpLink || page.declaresWebMcpMeta || page.referencesModelContext) {
    probes.push({
      id: "webmcp",
      path: "/",
      status: 200,
      ok: true,
      weight: WEBMCP_WEIGHT,
      source: "draft",
      confidence: "weak",
      detail: "page declares a browser-side tool surface; presence-only and unverified",
    });
  }

  const robots = byPath.get("/robots.txt");
  const blocked = robots.status === 200 && robotsBlocksAllAgents(robots.body);
  probes.push({
    id: "robots",
    path: "/robots.txt",
    status: robots.status,
    ok: robots.status === 200 && !blocked,
    ...(robots.error ? { error: robots.error } : {}),
    weight: 0,
    gate: true,
    source: "convention",
    detail: "a blanket disallow is a gate, not a capability",
    ...(blocked ? { note: "blanket disallow for User-agent: *" } : {}),
  });
  probes.push({
    id: "root",
    path: "/",
    status: root.status,
    ok: root.status === 200,
    ...(root.error ? { error: root.error } : {}),
    weight: 0,
    source: "convention",
    detail: "landing page examined for in-page agent declarations",
  });

  const earned = probes.filter((probe) => probe.ok && probe.weight > 0)
    .reduce((total, probe) => total + probe.weight, 0);
  const raw = Math.max(0, Math.min(100, earned));
  const score = blocked ? Math.min(raw, ROBOTS_CAP) : raw;

  const ordered = [...probes].sort((left, right) => {
    if (left.path !== right.path) return left.path < right.path ? -1 : 1;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });

  return {
    probe: "hardwire.probe/1",
    origin: base,
    checkedAt: new Date().toISOString(),
    score,
    ...(blocked ? { cappedByRobots: true } : {}),
    signals: ordered.filter((probe) => probe.ok && probe.weight > 0).map((probe) => probe.id).sort(),
    missing: SIGNALS.filter((signal) => !probes.some((probe) => probe.id === signal.id && probe.ok))
      .map((signal) => signal.id)
      .sort(),
    blockedByRobots: blocked,
    page,
    probes: ordered,
    note: "Score is a zero-dependency heuristic over public endpoints. It is not a certification, an audit, or evidence that any agent completed a task.",
  };
}
