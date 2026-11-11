import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const example = JSON.parse(
  await readFile(join(HERE, "..", "examples", "example-panel.json"), "utf8"),
);

export const clone = (value) => JSON.parse(JSON.stringify(value));

/** Minimal Response-shaped fake so probes never touch the network. */
export const site = (routes) => async (url) => {
  const path = new URL(url).pathname;
  const handler = routes[path];
  if (!handler) return new Response(null, { status: 404 });
  const { status = 200, body = "", type = "application/json" } = handler;
  return new Response(status === 200 ? body : null, { status, headers: { "content-type": type } });
};

export const cooperative = (panel = example) => ({
  "/.well-known/hardwire.json": { body: JSON.stringify(panel) },
  "/.well-known/mcp.json": { body: "{}" },
  "/openapi.json": { body: "{}" },
  "/.well-known/agent-card.json": { body: "{}" },
  "/llms.txt": { body: "read me", type: "text/plain" },
  "/.well-known/x402": { body: "{}" },
  "/robots.txt": { body: "User-agent: *\nAllow: /", type: "text/plain" },
  "/": { body: '<html><meta name="webmcp" content="1"></html>', type: "text/html" },
});
