#!/usr/bin/env node
// Hardwire command line. Zero dependencies.
//
//   hardwire validate <panel.json> [--json]
//   hardwire compile  <panel.json> [--json]
//   hardwire audit    <panel.json> [--json]
//   hardwire probe    <origin> [--json] [--allow-private] [--timeout <ms>]
//   hardwire infer    <origin> [--draft] [--json] [--allow-private] [--timeout <ms>]
//   hardwire trace    <panel.json> <port-id> [--params <json>] [--status <state>] [--json]
//
// Exit codes: 0 ok, 1 invalid input or a probed origin below the threshold, 2 usage or I/O.
import { readFile } from "node:fs/promises";

import { inferFromUrl, toPanelDraft } from "./infer.mjs";
import { compilePanel } from "./mcp.mjs";
import { auditPanel, HardwireError, normalizePanel } from "./panel.mjs";
import { probeOrigin } from "./probe.mjs";
import { buildTrace } from "./trace.mjs";

const USAGE = `usage:
  hardwire validate <panel.json> [--json]
  hardwire compile  <panel.json> [--json]
  hardwire audit    <panel.json> [--json]
  hardwire probe    <origin> [--json] [--allow-private] [--timeout <ms>]
  hardwire infer    <origin> [--draft] [--json] [--allow-private] [--timeout <ms>]
  hardwire trace    <panel.json> <port-id> [--params <json>] [--status <state>] [--json]`;

const STATUSES = new Set(["succeeded", "failed", "unknown", "refused"]);

class UsageError extends Error {}

function parse(argv) {
  const positional = [];
  const flags = { json: false, allowPrivate: false, draft: false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--json") flags.json = true;
    else if (item === "--allow-private") flags.allowPrivate = true;
    else if (item === "--draft") flags.draft = true;
    else if (item === "--timeout" || item === "--params" || item === "--status") {
      const value = argv[++index];
      if (value === undefined) throw new UsageError(`${item} needs a value`);
      if (item === "--timeout") {
        const ms = Number(value);
        if (!Number.isFinite(ms) || ms <= 0) throw new UsageError("--timeout needs a positive number");
        flags.timeoutMs = ms;
      } else if (item === "--status") {
        if (!STATUSES.has(value)) throw new UsageError(`--status must be one of ${[...STATUSES].join(", ")}`);
        flags.status = value;
      } else {
        try {
          flags.params = JSON.parse(value);
        } catch (error) {
          throw new UsageError(`--params is not JSON: ${error.message}`);
        }
      }
    } else if (item.startsWith("--")) throw new UsageError(`unknown flag ${item}`);
    else positional.push(item);
  }
  return { positional, flags };
}

async function loadPanel(path) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch {
    throw new UsageError(`cannot read ${path}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new UsageError(`${path} is not JSON: ${error.message}`);
  }
  return normalizePanel(parsed);
}

async function run(argv) {
  const { positional, flags } = parse(argv);
  const [command, target, extra] = positional;
  if (!command || !target) throw new UsageError("missing command or target");
  const out = (text = "") => process.stdout.write(`${text}\n`);
  const network = {
    allowPrivate: flags.allowPrivate,
    ...(flags.timeoutMs ? { timeoutMs: flags.timeoutMs } : {}),
  };

  if (command === "probe") {
    const report = await probeOrigin(target, network);
    if (flags.json) {
      out(JSON.stringify(report, null, 2));
    } else {
      out(`${report.origin}  score ${report.score}/100${report.cappedByRobots ? " (capped by robots.txt)" : ""}`);
      for (const probe of report.probes) {
        out(`  ${(probe.ok ? "ok" : String(probe.status || "err")).padEnd(4)} ${probe.id.padEnd(10)} ${probe.path}${probe.note ? ` — ${probe.note}` : ""}`);
      }
      const discovered = report.probes.find((probe) => probe.id === "hardwire")?.panel;
      if (discovered?.valid) out(`  panel: ${discovered.ports} ports, origin ${discovered.origin}`);
      out(`\n${report.note}`);
    }
    return report.score >= 40 ? 0 : 1;
  }

  if (command === "infer") {
    const inference = await inferFromUrl(target, network);
    if (flags.draft) {
      const draft = normalizePanel(toPanelDraft(inference));
      out(JSON.stringify(draft, null, 2));
      return 0;
    }
    if (flags.json) {
      out(JSON.stringify(inference, null, 2));
      return 0;
    }
    out(`${inference.origin}: ${inference.candidates.length} candidate ports`);
    for (const candidate of inference.candidates) {
      out(`  ${candidate.id.padEnd(24)} ${candidate.kind.padEnd(6)} ${candidate.confidence.padEnd(9)} ${candidate.summary}`);
    }
    for (const note of inference.notes) out(`\n! ${note}`);
    return inference.candidates.length > 0 ? 0 : 1;
  }

  const panel = await loadPanel(target);

  if (command === "validate") {
    if (flags.json) out(JSON.stringify(panel, null, 2));
    else out(`valid: ${panel.origin}, ${panel.ports.length} ports`);
    return 0;
  }

  if (command === "compile") {
    const tools = compilePanel(panel);
    if (flags.json) out(JSON.stringify({ tools }, null, 2));
    else for (const tool of tools) out(`${tool.name.padEnd(28)} ${tool.description}`);
    return 0;
  }

  if (command === "audit") {
    const report = auditPanel(panel);
    if (flags.json) out(JSON.stringify(report, null, 2));
    else {
      out(`${report.origin}: ${report.readable} read-only, ${report.mutating} mutating`);
      out(`  needs user confirmation: ${report.needsUser}`);
      out(`  needs owner confirmation: ${report.needsOwner}`);
      out(`  mutating without confirmation: ${report.unconfirmed.join(", ") || "none"}`);
    }
    return 0;
  }

  if (command === "trace") {
    if (!extra) throw new UsageError("trace needs a port id");
    const port = panel.ports.find((candidate) => candidate.id === extra);
    if (!port) throw new UsageError(`no such port: ${extra}`);
    const trace = buildTrace({
      panel,
      port,
      params: flags.params ?? {},
      outcome: { status: flags.status ?? "unknown" },
    });
    if (flags.json) out(JSON.stringify(trace, null, 2));
    else {
      out(`port      ${trace.port.id} (${trace.port.kind}, ${trace.port.confirmation})`);
      out(`panel     ${trace.panel} @ ${trace.panelDigest.slice(0, 19)}…`);
      out(`params    ${JSON.stringify(trace.params)}`);
      out(`outcome   ${trace.outcome.status}`);
      out(`digest    ${trace.digest}`);
      out("\nThis is a digest, not a signed receipt. Nothing was executed.");
    }
    return 0;
  }

  throw new UsageError(`unknown command ${command}`);
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error) {
  if (error instanceof HardwireError) {
    process.stderr.write(`${error.code}: ${error.message}\n`);
    process.exitCode = 1;
  } else if (error instanceof UsageError) {
    process.stderr.write(`${error.message}\n\n${USAGE}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 2;
  }
}
