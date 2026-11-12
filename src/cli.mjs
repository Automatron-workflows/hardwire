#!/usr/bin/env node
// Hardwire command line. Zero dependencies.
//
//   hardwire validate <panel.json> [--json]
//   hardwire compile  <panel.json> [--json]
//   hardwire audit    <panel.json> [--json]
//   hardwire probe    <origin> [--json] [--allow-private] [--timeout <ms>]
//   hardwire infer    <origin> [--draft] [--json] [--allow-private] [--timeout <ms>]
//   hardwire trace    <panel.json> <port-id> [--params <json>] [--status <state>] [--json]
//   hardwire score    --expected <panel.json> (--actual <panel.json> | --infer <page.html>)
//                     [--fail-under <n>] [--json]
//   hardwire corpus   <directory> [--fail-under <n>] [--json]
//
// Exit codes: 0 ok, 1 a measured failure (probe, score or corpus gate), 2 usage
// or I/O.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { scoreCorpus } from "./corpus.mjs";
import { inferFromHtml, inferFromUrl, toPanelDraft } from "./infer.mjs";
import { compilePanel } from "./mcp.mjs";
import { auditPanel, HardwireError, normalizePanel } from "./panel.mjs";
import { probeOrigin } from "./probe.mjs";
import { comparePanels, DEFAULT_THRESHOLD, passes } from "./score.mjs";
import { buildTrace } from "./trace.mjs";

const USAGE = `usage:
  hardwire validate <panel.json> [--json]
  hardwire compile  <panel.json> [--json]
  hardwire audit    <panel.json> [--json]
  hardwire probe    <origin> [--json] [--allow-private] [--timeout <ms>]
  hardwire infer    <origin> [--draft] [--json] [--allow-private] [--timeout <ms>]
  hardwire trace    <panel.json> <port-id> [--params <json>] [--status <state>] [--json]
  hardwire score    --expected <panel.json> (--actual <panel.json> | --infer <page.html>)
                    [--fail-under <n>] [--json]
  hardwire corpus   <directory> [--fail-under <n>] [--json]`;

const STATUSES = new Set(["succeeded", "failed", "unknown", "refused"]);
const VALUE_FLAGS = new Set(["--timeout", "--params", "--status", "--expected", "--actual", "--infer", "--fail-under"]);

class UsageError extends Error {}

function parse(argv) {
  const positional = [];
  const flags = { json: false, allowPrivate: false, draft: false };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--json") flags.json = true;
    else if (item === "--allow-private") flags.allowPrivate = true;
    else if (item === "--draft") flags.draft = true;
    else if (VALUE_FLAGS.has(item)) {
      const value = argv[++index];
      if (value === undefined) throw new UsageError(`${item} needs a value`);
      if (item === "--timeout") {
        const ms = Number(value);
        if (!Number.isFinite(ms) || ms <= 0) throw new UsageError("--timeout needs a positive number");
        flags.timeoutMs = ms;
      } else if (item === "--fail-under") {
        const threshold = Number(value);
        if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
          throw new UsageError("--fail-under needs a number between 0 and 100");
        }
        flags.failUnder = threshold;
      } else if (item === "--status") {
        if (!STATUSES.has(value)) throw new UsageError(`--status must be one of ${[...STATUSES].join(", ")}`);
        flags.status = value;
      } else if (item === "--params") {
        try {
          flags.params = JSON.parse(value);
        } catch (error) {
          throw new UsageError(`--params is not JSON: ${error.message}`);
        }
      } else {
        flags[item.slice(2)] = value;
      }
    } else if (item.startsWith("--")) throw new UsageError(`unknown flag ${item}`);
    else positional.push(item);
  }
  return { positional, flags };
}

async function readText(path, label) {
  if (typeof path !== "string" || path.length === 0) throw new UsageError(`${label} is required`);
  try {
    return await readFile(path, "utf8");
  } catch {
    throw new UsageError(`cannot read ${path}`);
  }
}

async function loadJson(path, label) {
  const text = await readText(path, label);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new UsageError(`${path} is not JSON: ${error.message}`);
  }
}

async function score(flags, out) {
  const expected = await loadJson(flags.expected, "--expected");
  if (!flags.actual && !flags.infer) throw new UsageError("score needs --actual or --infer");
  if (flags.actual && flags.infer) throw new UsageError("use either --actual or --infer, not both");

  let actual;
  if (flags.infer) {
    const html = await readText(flags.infer, "--infer");
    actual = toPanelDraft(inferFromHtml(html, { origin: expected.origin }));
  } else {
    actual = await loadJson(flags.actual, "--actual");
  }

  const result = comparePanels(expected, actual);
  const threshold = flags.failUnder ?? DEFAULT_THRESHOLD;
  // `passes` also fails an invented mutating port. A high score must not excuse
  // an operation the site never offered.
  const pass = passes(result, threshold);

  if (flags.json) {
    out(JSON.stringify({ ...result, threshold, pass }, null, 2));
    return pass ? 0 : 1;
  }

  out(`score ${result.score}/100${result.penalty ? ` (${result.base} - ${result.penalty} for invented ports)` : ""}`);
  out(`  expected ${result.expected} ports, inferred ${result.actual}, identical ${result.matched}`);
  if (result.missing.length) out(`  missing:  ${result.missing.join(", ")}`);
  if (result.extra.length) out(`  invented: ${result.extra.join(", ")}`);
  for (const port of result.ports) {
    if (port.similarity === 1) continue;
    // Missing ports are already listed above; repeating them adds noise.
    if (port.differences.length === 1 && port.differences[0].field === "port") continue;
    out(`  ${port.id.padEnd(20)} ${port.differences.map((difference) => difference.field).join(", ")}`);
  }
  if (!result.originMatch) out("  warning: the two panels declare different origins");
  out(`\n${pass ? "pass" : "fail"} (threshold ${threshold})`);
  return pass ? 0 : 1;
}

/**
 * Load a corpus directory: one subdirectory per case, each holding the captured
 * page and the panel a human would have published for it. Sorted by name so a
 * run is reproducible.
 */
async function loadCorpus(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    throw new UsageError(`cannot read ${directory}`);
  }

  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (names.length === 0) throw new UsageError(`${directory} contains no case directories`);

  const cases = [];
  for (const name of names) {
    const dir = join(directory, name);
    cases.push({
      name,
      expected: await loadJson(join(dir, "expected.json"), `${name}/expected.json`),
      html: await readText(join(dir, "page.html"), `${name}/page.html`),
    });
  }
  return cases;
}

async function corpus(flags, target, out) {
  const cases = await loadCorpus(target);
  const options = flags.failUnder === undefined ? {} : { threshold: flags.failUnder };
  const report = scoreCorpus(cases, options);

  if (flags.json) {
    out(JSON.stringify(report, null, 2));
  } else {
    for (const result of report.results) {
      const mark = passes(result, report.threshold) ? "pass" : "fail";
      out(`  ${result.name.padEnd(16)} ${String(result.score).padStart(3)}/100  ${mark}${result.error ? `  ${result.error}` : ""}`);
    }
    out(`\n${report.cases} cases, mean ${report.mean}/100, min ${report.min}, max ${report.max}`);
    out(`${report.passed}/${report.cases} pass at threshold ${report.threshold}; ${report.inventedMutations} invented mutating port(s)`);
    const read = report.readError === null
      ? "read error n/a (no read ports);"
      : `read error ${report.readError}% across ${report.readPorts} read port(s);`;
    out(`${read} ${report.inventedPayments} invented payment(s), ${report.inventedDestructive} destructive`);
  }

  return report.passed === report.cases ? 0 : 1;
}

async function run(argv) {
  const { positional, flags } = parse(argv);
  const [command, target, extra] = positional;
  if (!command) throw new UsageError("missing command");
  const out = (text = "") => process.stdout.write(`${text}\n`);
  const network = {
    allowPrivate: flags.allowPrivate,
    ...(flags.timeoutMs ? { timeoutMs: flags.timeoutMs } : {}),
  };

  if (command === "score") return score(flags, out);

  if (command === "corpus") {
    if (!target) throw new UsageError("corpus needs a directory");
    return corpus(flags, target, out);
  }

  if (!target) throw new UsageError("missing target");

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
      out(JSON.stringify(normalizePanel(toPanelDraft(inference)), null, 2));
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

  const panel = normalizePanel(await loadJson(target, "panel"));

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
