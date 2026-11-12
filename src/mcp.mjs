// Compile a validated panel into MCP-style tool declarations.
//
// This is the whole point of the format: one file a site already had to write
// for itself becomes a tool list any agent runtime can consume. Nothing here
// executes anything and nothing is fetched.
import { HardwireError, normalizePanel } from "./panel.mjs";

const MAX_TOOL_NAME = 64;

/** MCP tool names are conventionally [A-Za-z0-9_-]; map ids deterministically. */
export function toolName(id) {
  const name = id.replace(/-/g, "_");
  return name.length <= MAX_TOOL_NAME ? name : name.slice(0, MAX_TOOL_NAME).replace(/_+$/, "");
}

function describe(port, origin) {
  const effect = port.kind === "read" ? "read-only" : port.kind;
  const risk = port.confirmation === "none"
      ? `${effect}, no confirmation`
      : `${effect}, requires ${port.confirmation} confirmation`;
  return `${port.summary} (${origin}; ${risk})`;
}

/** Compile ports to tools. Throws if two ids would collapse onto one name. */
export function compilePanel(input) {
  const panel = normalizePanel(input);
  const seen = new Map();

  return panel.ports.map((port) => {
    const name = toolName(port.id);
    if (seen.has(name)) {
      throw new HardwireError("hardwire_port_duplicate", "ports", `${port.id} collides with ${seen.get(name)}`);
    }
    seen.set(name, port.id);

    return {
      name,
      description: describe(port, panel.origin),
      inputSchema: port.parameters,
      annotations: {
        readOnlyHint: port.kind === "read",
        // A write may replace data and a payment may debit a balance. Neither
        // is known to be additive, so retain MCP's conservative default.
        destructiveHint: port.kind !== "read",
        idempotentHint: port.kind === "read",
      },
    };
  });
}

/** The exact document an MCP server returns from tools/list. */
export function toolsListResponse(input) {
  return { tools: compilePanel(input) };
}

/**
 * Resolve a compiled tool name back to its port. Returns undefined rather than
 * throwing so a server can answer "no such tool" without echoing the panel.
 */
export function findPort(panel, name) {
  panel = normalizePanel(panel);
  const port = panel.ports.find((candidate) => toolName(candidate.id) === name);
  if (!port) return undefined;
  return { tool: compilePanel(panel).find((entry) => entry.name === name), port };
}
