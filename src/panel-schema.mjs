// Hardwire panel format v1: what a site says it can do, in a form an agent can
// call without looking at the DOM.
//
// A panel names the real operations of an application: typed ports, each with
// an effect class, a confirmation floor and, optionally, an expected result
// shape. It is deliberately not a selector map, a recorded macro or a script.
// An agent holding a panel never has to guess which button is "submit".
//
// A panel is optional. A caller may infer one from a live page (see infer.mjs)
// and use this module to validate the result, so a panel can exist for a site
// that published nothing. See docs/SPEC.md.

import { canonicalJson } from "./canonical.mjs";

export const PANEL_VERSION = "hardwire.panel/1";
export const DISCOVERY_PATH = "/.well-known/hardwire.json";
export const PANEL_FILENAME = "hardwire.panel.json";

export const KINDS = Object.freeze(["read", "write", "destructive", "payment"]);
export const CONFIRMATIONS = Object.freeze(["none", "user", "owner"]);

// A panel may never lower the confirmation floor implied by a port's effect.
// `payment` and `destructive` declarations cannot drop below owner. A consumer
// must actually enforce approval. `write` defaults to user and may drop to none
// only when the publisher asserts the port is reversible, which is itself a
// claim the caller is choosing to trust. `read` defaults to no confirmation.
const ABSOLUTE_FLOOR = Object.freeze({ destructive: "owner", payment: "owner" });
const DEFAULT_CONFIRMATION = Object.freeze({ read: "none", write: "user" });

const SCHEMA_TYPES = new Set(["string", "number", "integer", "boolean", "array", "object", "null"]);
// Unknown keywords are rejected rather than ignored: silently dropping a
// constraint is how an agent sends a value the publisher thought it forbade.
const SCHEMA_KEYWORDS = new Set([
  "type", "description", "enum", "items", "properties", "required", "additionalProperties", "writeOnly",
]);
const KEYWORD_TYPE = Object.freeze({
  items: "array",
  properties: "object",
  required: "object",
  additionalProperties: "object",
});
const LIMITS = Object.freeze({
  maxPorts: 256,
  maxIdLength: 64,
  maxSummaryLength: 280,
  maxSchemaDepth: 4,
  maxEnumValues: 64,
  maxRequired: 64,
});
const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function checkKeys(value, allowed, path, code) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new HardwireError(code, `${path}.${key}`, "unsupported field");
  }
}

export class HardwireError extends Error {
  constructor(code, path = "", detail = "") {
    super(detail ? `${code} at ${path}: ${detail}` : `${code}${path ? ` at ${path}` : ""}`);
    this.name = "HardwireError";
    this.code = code;
    this.path = path;
    this.detail = detail;
  }
}

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function requireString(value, path, { max = Infinity, pattern } = {}) {
  if (typeof value !== "string" || value.length === 0) {
    throw new HardwireError("hardwire_schema_invalid", path, "expected a non-empty string");
  }
  if (value.length > max) throw new HardwireError("hardwire_schema_invalid", path, `longer than ${max}`);
  if (pattern && !pattern.test(value)) throw new HardwireError("hardwire_schema_invalid", path, "bad format");
  return value;
}

/**
 * Validate one schema fragment. Only the subset an agent needs is accepted:
 * type, description, enum, items, properties, required and additionalProperties.
 * Anything richer is rejected rather than ignored, because silently dropping a
 * constraint is how an agent sends the wrong value.
 */
function normalizeSchema(schema, path, depth = 0) {
  if (!isPlainObject(schema)) throw new HardwireError("hardwire_schema_invalid", path, "expected an object");
  if (depth > LIMITS.maxSchemaDepth) throw new HardwireError("hardwire_schema_invalid", path, "too deep");
  for (const key of Object.keys(schema)) {
    if (!SCHEMA_KEYWORDS.has(key)) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.${key}`, "unsupported keyword");
    }
  }

  if (schema.type === undefined) throw new HardwireError("hardwire_schema_invalid", path, "missing type");
  if (!SCHEMA_TYPES.has(schema.type)) {
    throw new HardwireError("hardwire_schema_invalid", `${path}.type`, `unsupported ${String(schema.type)}`);
  }
  for (const [key, type] of Object.entries(KEYWORD_TYPE)) {
    if (schema[key] !== undefined && schema.type !== type) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.${key}`, `only valid on ${type} schemas`);
    }
  }

  const out = { type: schema.type };
  if (schema.description !== undefined) {
    out.description = requireString(schema.description, `${path}.description`, { max: 500 });
  }

  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum) || schema.enum.length === 0) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.enum`, "expected a non-empty array");
    }
    if (schema.enum.length > LIMITS.maxEnumValues) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.enum`, "too many values");
    }
    for (const value of schema.enum) {
      if (value !== null && !["string", "number", "boolean"].includes(typeof value)) {
        throw new HardwireError("hardwire_schema_invalid", `${path}.enum`, "enum values must be scalars");
      }
      const matches = schema.type === "null" ? value === null
        : schema.type === "integer" ? Number.isInteger(value)
          : typeof value === schema.type && value !== null;
      if (!matches || (typeof value === "number" && !Number.isFinite(value))) {
        throw new HardwireError("hardwire_schema_invalid", `${path}.enum`, "value does not match type");
      }
    }
    if (new Set(schema.enum).size !== schema.enum.length) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.enum`, "duplicate values");
    }
    out.enum = [...schema.enum];
  }

  if (schema.type === "array" && schema.items !== undefined) {
    out.items = normalizeSchema(schema.items, `${path}.items`, depth + 1);
  }

  // A write-only value is accepted but never recorded in a trace. This is the
  // one place a panel is allowed to say "this argument is a secret".
  if (schema.writeOnly !== undefined) {
    if (typeof schema.writeOnly !== "boolean") {
      throw new HardwireError("hardwire_schema_invalid", `${path}.writeOnly`, "expected a boolean");
    }
    if (schema.type !== "string") {
      throw new HardwireError("hardwire_schema_invalid", `${path}.writeOnly`, "only strings can be write-only");
    }
    if (schema.writeOnly) out.writeOnly = true;
  }

  if (schema.type === "object") {
    const properties = schema.properties === undefined ? {} : schema.properties;
    if (!isPlainObject(properties)) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.properties`, "expected an object");
    }
    out.properties = {};
    for (const key of Object.keys(properties).sort()) {
      if (RESERVED_KEYS.has(key)) throw new HardwireError("hardwire_schema_invalid", `${path}.properties`, "reserved property name");
      out.properties[key] = normalizeSchema(properties[key], `${path}.properties.${key}`, depth + 1);
    }

    const required = schema.required === undefined ? [] : schema.required;
    if (!Array.isArray(required)) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.required`, "expected an array");
    }
    if (required.length > LIMITS.maxRequired) {
      throw new HardwireError("hardwire_schema_invalid", `${path}.required`, "too many entries");
    }
    for (const name of required) {
      requireString(name, `${path}.required`, { pattern: /^[A-Za-z_][A-Za-z0-9_]*$/ });
      if (!Object.hasOwn(out.properties, name)) {
        throw new HardwireError("hardwire_schema_invalid", `${path}.required`, `${name} is not declared`);
      }
    }
    out.required = [...new Set(required)].sort();

    // Unknown keys are rejected by default. An open object must say so.
    out.additionalProperties = false;
    if (schema.additionalProperties !== undefined) {
      if (typeof schema.additionalProperties !== "boolean") {
        throw new HardwireError("hardwire_schema_invalid", `${path}.additionalProperties`, "expected a boolean");
      }
      out.additionalProperties = schema.additionalProperties;
    }
  }

  return out;
}

const rank = (level) => CONFIRMATIONS.indexOf(level);
const floorFor = (kind, reversible) =>
  ABSOLUTE_FLOOR[kind] ?? (kind === "write" && reversible ? "none" : DEFAULT_CONFIRMATION[kind]);

function normalizePort(port, index) {
  const path = `ports[${index}]`;
  if (!isPlainObject(port)) throw new HardwireError("hardwire_port_invalid", path, "expected an object");
  checkKeys(port, ["id", "kind", "summary", "confirmation", "reversible", "parameters", "preconditions", "expects", "endpoint"], path, "hardwire_port_invalid");

  const id = requireString(port.id, `${path}.id`, { max: LIMITS.maxIdLength, pattern: ID_PATTERN });
  if (!KINDS.includes(port.kind)) {
    throw new HardwireError("hardwire_port_invalid", `${path}.kind`, `expected one of ${KINDS.join(", ")}`);
  }
  const summary = requireString(port.summary, `${path}.summary`, { max: LIMITS.maxSummaryLength });

  if (port.reversible !== undefined && typeof port.reversible !== "boolean") {
    throw new HardwireError("hardwire_port_invalid", `${path}.reversible`, "expected a boolean");
  }
  const reversible = port.reversible === true;
  const declared = port.confirmation === undefined ? ABSOLUTE_FLOOR[port.kind] ?? DEFAULT_CONFIRMATION[port.kind] : port.confirmation;
  if (!CONFIRMATIONS.includes(declared)) {
    throw new HardwireError("hardwire_port_invalid", `${path}.confirmation`, `expected one of ${CONFIRMATIONS.join(", ")}`);
  }
  const floor = floorFor(port.kind, reversible);
  if (rank(declared) < rank(floor)) {
    throw new HardwireError(
      "hardwire_confirmation_weakened",
      `${path}.confirmation`,
      `${port.kind} requires at least "${floor}", got "${declared}"`,
    );
  }

  const rawParameters = port.parameters === undefined ? {} : port.parameters;
  if (!isPlainObject(rawParameters)) {
    throw new HardwireError("hardwire_schema_invalid", `${path}.parameters`, "expected an object");
  }
  if (rawParameters.type !== undefined && rawParameters.type !== "object") {
    throw new HardwireError("hardwire_schema_invalid", `${path}.parameters.type`, "port parameters must be an object schema");
  }
  // Pass every supported keyword through, rather than rebuilding a narrower
  // object: dropping `description` or `additionalProperties` here would change
  // what the panel promises without saying so.
  const parameters = normalizeSchema({ ...rawParameters, type: "object" }, `${path}.parameters`);

  const preconditions = port.preconditions === undefined ? [] : port.preconditions;
  if (!Array.isArray(preconditions)) {
    throw new HardwireError("hardwire_port_invalid", `${path}.preconditions`, "expected an array");
  }
  for (const entry of preconditions) {
    requireString(entry, `${path}.preconditions`, { max: 64, pattern: /^[a-z][a-z0-9-]*$/ });
  }

  const out = {
    id,
    kind: port.kind,
    summary,
    confirmation: declared,
    reversible,
    parameters,
    preconditions: [...new Set(preconditions)].sort(),
  };

  if (port.expects !== undefined) out.expects = normalizeSchema(port.expects, `${path}.expects`);
  if (port.endpoint !== undefined) {
    out.endpoint = normalizeEndpoint(port.endpoint, `${path}.endpoint`);
  }
  return out;
}

/**
 * An endpoint is either a single-slash site-relative path or an absolute https
 * URL. `//host` is a protocol-relative URL, not a path, and backslashes are
 * normalised as slashes by browsers, so both are rejected rather than left for
 * a caller to misinterpret.
 */
function normalizeEndpoint(value, path) {
  const endpoint = requireString(value, path, { max: 2048 });
  if (/[\u0000-\u0020\u007f\\]/.test(endpoint)) {
    throw new HardwireError("hardwire_port_invalid", path, "spaces, control characters and backslashes are not allowed");
  }
  if (endpoint.startsWith("//")) {
    throw new HardwireError("hardwire_port_invalid", path, "protocol-relative URLs are not allowed");
  }
  if (endpoint.includes("#")) throw new HardwireError("hardwire_port_invalid", path, "fragments are not sent to a server");
  if (endpoint.startsWith("/")) return endpoint;
  if (!endpoint.startsWith("https://")) throw new HardwireError("hardwire_port_invalid", path, "absolute endpoints must start with https://");
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new HardwireError("hardwire_port_invalid", path, "must be https or a site-relative path");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new HardwireError("hardwire_port_invalid", path, "must be https or a site-relative path");
  }
  return endpoint;
}

/** Bare HTTPS origin, with HTTP allowed only for local development. */
export function normalizeOrigin(origin) {
  if (typeof origin !== "string" || origin.length > 2048 || !/^https?:\/\//.test(origin) || /[\u0000-\u0020\u007f\\?#]/.test(origin)) {
    throw new HardwireError("hardwire_origin_invalid", "origin", "expected a bare http(s) origin");
  }
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new HardwireError("hardwire_origin_invalid", "origin", "not an absolute URL");
  }
  if (parsed.username || parsed.password) {
    throw new HardwireError("hardwire_origin_invalid", "origin", "credentials are not allowed");
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname))) {
    throw new HardwireError("hardwire_origin_invalid", "origin", "https is required outside local development");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new HardwireError("hardwire_origin_invalid", "origin", "must be a bare origin");
  }
  return parsed.origin;
}

/** Validate and canonicalise a panel. Throws HardwireError with a stable code. */
export function normalizePanel(input) {
  if (!isPlainObject(input)) throw new HardwireError("hardwire_panel_invalid", "", "expected an object");
  if (input.panel !== PANEL_VERSION) {
    throw new HardwireError("hardwire_version_unsupported", "panel", `expected ${PANEL_VERSION}`);
  }
  checkKeys(input, ["panel", "origin", "ports", "title", "revision", "auth"], "panel", "hardwire_panel_invalid");
  const origin = normalizeOrigin(input.origin);

  const ports = input.ports;
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new HardwireError("hardwire_ports_empty", "ports", "a panel with no ports is not callable");
  }
  if (ports.length > LIMITS.maxPorts) {
    throw new HardwireError("hardwire_ports_invalid", "ports", `more than ${LIMITS.maxPorts}`);
  }

  const normalized = ports
    .map((port, index) => normalizePort(port, index))
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));

  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].id === normalized[index - 1].id) {
      throw new HardwireError("hardwire_port_duplicate", "ports", normalized[index].id);
    }
  }

  const panel = { panel: PANEL_VERSION, origin, ports: normalized };
  if (input.title !== undefined) panel.title = requireString(input.title, "title", { max: 120 });
  if (input.revision !== undefined) panel.revision = requireString(input.revision, "revision", { max: 128 });
  if (input.auth !== undefined) {
    if (!isPlainObject(input.auth)) throw new HardwireError("hardwire_schema_invalid", "auth", "expected an object");
    checkKeys(input.auth, ["loginPort", "note"], "auth", "hardwire_schema_invalid");
    panel.auth = {};
    if (input.auth.loginPort !== undefined) {
      panel.auth.loginPort = requireString(input.auth.loginPort, "auth.loginPort", {
        max: LIMITS.maxIdLength,
        pattern: ID_PATTERN,
      });
      if (!normalized.some((port) => port.id === panel.auth.loginPort)) {
        throw new HardwireError("hardwire_schema_invalid", "auth.loginPort", "names an unknown port");
      }
    }
    if (input.auth.note !== undefined) {
      panel.auth.note = requireString(input.auth.note, "auth.note", { max: 500 });
    }
  }

  return panel;
}

function checkValue(schema, value, path, depth) {
  if (depth > LIMITS.maxSchemaDepth + 1) throw new HardwireError("hardwire_params_invalid", path, "too deep");
  if (schema.enum && !schema.enum.some((entry) => entry === value)) {
    throw new HardwireError("hardwire_params_invalid", path, `expected one of ${schema.enum.map(String).join(", ")}`);
  }

  switch (schema.type) {
    case "null":
      if (value !== null) throw new HardwireError("hardwire_params_invalid", path, "expected null");
      return value;
    case "string":
      if (typeof value !== "string") throw new HardwireError("hardwire_params_invalid", path, "expected a string");
      return value;
    case "boolean":
      if (typeof value !== "boolean") throw new HardwireError("hardwire_params_invalid", path, "expected a boolean");
      return value;
    case "integer":
      if (!Number.isInteger(value)) throw new HardwireError("hardwire_params_invalid", path, "expected an integer");
      return value;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new HardwireError("hardwire_params_invalid", path, "expected a finite number");
      }
      return value;
    case "array": {
      if (!Array.isArray(value)) throw new HardwireError("hardwire_params_invalid", path, "expected an array");
      if (!schema.items) return value;
      return value.map((entry, index) => checkValue(schema.items, entry, `${path}[${index}]`, depth + 1));
    }
    case "object": {
      if (!isPlainObject(value)) throw new HardwireError("hardwire_params_invalid", path, "expected an object");
      for (const name of schema.required ?? []) {
        if (!Object.hasOwn(value, name)) {
          throw new HardwireError("hardwire_params_invalid", `${path}.${name}`, "required");
        }
      }
      const out = {};
      for (const key of Object.keys(value).sort()) {
        if (RESERVED_KEYS.has(key)) throw new HardwireError("hardwire_params_invalid", `${path}.${key}`, "reserved property name");
        if (!Object.hasOwn(schema.properties, key)) {
          if (schema.additionalProperties === true) {
            out[key] = value[key];
            continue;
          }
          throw new HardwireError("hardwire_params_invalid", `${path}.${key}`, "unknown property");
        }
        out[key] = checkValue(schema.properties[key], value[key], `${path}.${key}`, depth + 1);
      }
      return out;
    }
    default:
      throw new HardwireError("hardwire_schema_invalid", path, `unsupported ${schema.type}`);
  }
}

/**
 * Check caller-supplied arguments against one port's declared parameters.
 * Returns a normalised copy with keys sorted, so a trace is deterministic.
 */
export function validateParams(port, params) {
  if (!port || typeof port !== "object" || !port.parameters || port.parameters.type !== "object") {
    throw new HardwireError("hardwire_panel_invalid", "port", "a normalised port is required");
  }
  if (!isPlainObject(params)) throw new HardwireError("hardwire_params_invalid", "", "expected an object");
  let copy;
  try {
    copy = JSON.parse(canonicalJson(params));
  } catch {
    throw new HardwireError("hardwire_params_invalid", "", "arguments must be bounded, plain JSON data");
  }
  return checkValue(port.parameters, copy, "", 0);
}

/** What an agent may do unattended, derived rather than asserted. */
export function auditPanel(panel) {
  panel = normalizePanel(panel);
  const mutating = panel.ports.filter((port) => port.kind !== "read");
  return {
    origin: panel.origin,
    ports: panel.ports.length,
    readable: panel.ports.length - mutating.length,
    mutating: mutating.length,
    needsUser: panel.ports.filter((port) => port.confirmation === "user").length,
    needsOwner: panel.ports.filter((port) => port.confirmation === "owner").length,
    unconfirmed: mutating
      .filter((port) => port.confirmation === "none")
      .map((port) => port.id)
      .sort(),
  };
}

export const PANEL_LIMITS = LIMITS;
