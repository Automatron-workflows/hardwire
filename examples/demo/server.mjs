#!/usr/bin/env node
// A local origin that publishes a panel. Zero dependencies.
//
//   node examples/demo/server.mjs [--port 8787]
//
// It serves a panel at the discovery path, a page with forms for inference, and
// a robots.txt that allows the probe. Endpoints answer GET with a fixed demo
// response; nothing is written, stored or executed.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const ASSETS = [
  ...['index.html', 'styles.css', 'app.mjs', 'art.mjs', 'model.mjs', 'worker.mjs', 'samples.mjs', 'comparison.mjs', 'experiment.html', 'experiment.css', 'experiment.mjs', 'experiment-model.mjs'].map(name => `playground/${name}`),
  ...['browser', 'panel-schema', 'canonical', 'infer-html', 'mcp', 'score'].map(name => `src/${name}.mjs`),
];
const DEFAULT_PORT = 8787;
const HOST = "127.0.0.1";

const JSON_HEADERS = Object.freeze({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
const HTML_HEADERS = Object.freeze({ "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
const TEXT_HEADERS = Object.freeze({ "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });

const ROBOTS = "User-agent: *\nAllow: /\n";
const LLMS = `# Hardwire demo shop

This is a local demonstration origin for Hardwire. It publishes a panel at
/.well-known/hardwire.json and a page with ordinary HTML forms. Nothing here
executes a write, stores credentials or charges anything.

Run the probe and inference commands printed by examples/demo/server.mjs.
`;

/**
 * Create the demo HTTP server without starting it. Tests use port 0; the CLI
 * uses 8787. The panel's origin is rewritten to the address the server is
 * actually listening on, so the panel validates on any port.
 */
export async function createDemoServer({
  panelPath = join(HERE, "panel.json"),
  pagePath = join(HERE, "page.html"),
} = {}) {
  const [panel, page] = await Promise.all([
    readFile(panelPath, "utf8").then((text) => JSON.parse(text)),
    readFile(pagePath, "utf8"),
  ]);

  const assets = new Map(await Promise.all(ASSETS.map(async path => [`/${path}`, await readFile(join(ROOT, path))])));
  const server = createServer((request, response) => {
    const send = (status, headers, body) => {
      response.writeHead(status, headers);
      response.end(request.method === "HEAD" ? undefined : body);
    };

    let url;
    try { url = new URL(request.url ?? "/", `http://${HOST}`); }
    catch { send(400, TEXT_HEADERS, "invalid request URL\n"); return; }

    if (request.method !== "GET" && request.method !== "HEAD") {
      send(405, { ...TEXT_HEADERS, allow: "GET, HEAD" }, "the demo does not execute writes\n");
      return;
    }

    const assetPath = url.pathname === '/playground/' ? '/playground/index.html' : url.pathname;
    if (assets.has(assetPath)) {
      const type = assetPath.endsWith('.mjs') ? 'text/javascript' : assetPath.endsWith('.css') ? 'text/css' : 'text/html';
      send(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, assets.get(assetPath));
      return;
    }

    if (url.pathname === "/.well-known/hardwire.json") {
      const address = server.address();
      const body = JSON.stringify({ ...panel, origin: `http://${HOST}:${address.port}` }, null, 2);
      send(200, JSON_HEADERS, body);
      return;
    }

    if (url.pathname === "/") {
      send(200, HTML_HEADERS, page);
      return;
    }
    if (url.pathname === "/robots.txt") {
      send(200, TEXT_HEADERS, ROBOTS);
      return;
    }
    if (url.pathname === "/llms.txt") {
      send(200, TEXT_HEADERS, LLMS);
      return;
    }
    if (url.pathname === "/search") {
      send(200, JSON_HEADERS, JSON.stringify({ demo: true, query: url.searchParams.get("q") ?? "" }));
      return;
    }
    if (url.pathname === "/subscribe" || url.pathname === "/api/session") {
      send(200, JSON_HEADERS, JSON.stringify({
        demo: true,
        note: "This endpoint is a fixed response. Nothing was created or stored.",
      }));
      return;
    }

    send(404, TEXT_HEADERS, "not found\n");
  });

  return server;
}

/** Start the demo on an ephemeral or explicit port and return its origin. */
export async function startDemo({ port = DEFAULT_PORT, host = HOST } = {}) {
  const server = await createDemoServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return { server, origin: `http://${host}:${address.port}` };
}

function parsePort(argv) {
  const index = argv.indexOf("--port");
  const raw = index === -1 ? process.env.PORT ?? String(DEFAULT_PORT) : argv[index + 1];
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`--port must be an integer between 0 and 65535, got ${raw ?? "nothing"}`);
  }
  return port;
}

async function main() {
  const { server, origin } = await startDemo({ port: parsePort(process.argv.slice(2)) });
  process.stdout.write(`Hardwire demo serving ${origin}\n`);
  process.stdout.write(`  playground  ${origin}/playground/\n`);
  process.stdout.write(`  experiment  ${origin}/playground/experiment.html\n`);
  process.stdout.write(`  panel  ${origin}/.well-known/hardwire.json\n`);
  process.stdout.write("\nTry, in another terminal:\n");
  process.stdout.write(`  node src/cli.mjs probe ${origin} --allow-private --fail-under 30\n`);
  process.stdout.write(`  node src/cli.mjs infer ${origin} --allow-private\n`);
  process.stdout.write(`  node src/cli.mjs infer ${origin} --allow-private --draft > /tmp/hardwire-draft.json\n`);
  process.stdout.write(`  node src/cli.mjs compile /tmp/hardwire-draft.json\n`);
  process.stdout.write("\nCtrl-C to stop. The film is illustrative. The experiment changes browser memory only. The server performs no writes.\n");

  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}
