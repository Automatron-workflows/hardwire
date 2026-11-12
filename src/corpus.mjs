// Aggregate inference error across captured pages.
//
// One fixture tells you nothing. Gate 1 in docs/ROADMAP.md asks for an error
// rate, which means many pages, each with the panel a human would have
// published next to it, scored the same way every time.
import { HardwireError, normalizePanel } from "./panel.mjs";
import { inferFromHtml, toPanelDraft } from "./infer.mjs";
import { comparePanels, DEFAULT_THRESHOLD, passes } from "./score.mjs";

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * Score a set of cases. Each case is `{ name, expected, html }` where `expected`
 * is a panel document and `html` is a captured page from the same origin.
 *
 * A case whose page yields no usable candidates scores zero rather than
 * aborting the run: a corpus is a measurement, and one broken capture must not
 * hide the other twenty.
 */
export function scoreCorpus(cases, { threshold = DEFAULT_THRESHOLD } = {}) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) throw new HardwireError("hardwire_corpus_invalid", "threshold", "expected 0–100");
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new HardwireError("hardwire_corpus_invalid", "cases", "expected a non-empty array");
  }

  const seen = new Set();
  const results = cases.map((entry) => {
    const name = entry?.name;
    if (typeof name !== "string" || name.length === 0) {
      throw new HardwireError("hardwire_corpus_invalid", "cases", "every case needs a name");
    }
    if (seen.has(name)) {
      throw new HardwireError("hardwire_corpus_invalid", `cases.${name}`, "duplicate case name");
    }
    seen.add(name);
    if (typeof entry.html !== "string") {
      throw new HardwireError("hardwire_corpus_invalid", `cases.${name}.html`, "expected captured HTML");
    }
    if (!entry.expected || typeof entry.expected !== "object") {
      throw new HardwireError("hardwire_corpus_invalid", `cases.${name}.expected`, "expected a panel document");
    }

    // Bad ground truth is misuse, never a zero-scoring capture.
    const expected = normalizePanel(entry.expected);
    const expectedIds = expected.ports.map((port) => port.id);

    let actual;
    try {
      actual = toPanelDraft(inferFromHtml(entry.html, { origin: expected.origin }));
    } catch (error) {
      if (!(error instanceof HardwireError)) throw error;
      return {
        name,
        score: 0,
        base: 0,
        penalty: 0,
        error: error.code,
        expected: expectedIds.length,
        actual: 0,
        matched: 0,
        // Every expected port is absent; saying `[]` would hide the failure.
        missing: expectedIds,
        extra: [],
        extraPorts: [],
        unsafeDifferences: [],
        inventedMutations: 0,
        inventedPayments: 0,
        inventedDestructive: 0,
        // There is no inferred panel to compare against, so origin is unknown.
        originMatch: null,
        ports: [],
      };
    }

    return { name, ...comparePanels(entry.expected, actual) };
  });

  const scores = results.map((result) => result.score);
  const mean = scores.reduce((total, score) => total + score, 0) / scores.length;

  // Gate 1 is stated as structural error on read ports, not as an all-port
  // mean, so it is reported separately. A missing port is full error.
  const readSimilarities = [];
  for (const [index, result] of results.entries()) {
    const expectedPorts = Array.isArray(cases[index].expected.ports) ? cases[index].expected.ports : [];
    const similarity = new Map(result.ports.map((port) => [port.id, port.similarity]));
    for (const port of expectedPorts) {
      if (port.kind === "read") readSimilarities.push(similarity.get(port.id) ?? 0);
    }
  }
  const readError = readSimilarities.length === 0
    ? null
    : round1((1 - readSimilarities.reduce((total, value) => total + value, 0) / readSimilarities.length) * 100);

  return {
    corpus: "hardwire.corpus/1",
    threshold,
    cases: results.length,
    mean: round1(mean),
    min: Math.min(...scores),
    max: Math.max(...scores),
    passed: results.filter((result) => passes(result, threshold)).length,
    inventedMutations: results.reduce((total, result) => total + result.inventedMutations, 0),
    inventedPayments: results.reduce((total, result) => total + result.inventedPayments, 0),
    inventedDestructive: results.reduce((total, result) => total + result.inventedDestructive, 0),
    unsafeDifferences: results.reduce((total, result) => total + result.unsafeDifferences.length, 0),
    readPorts: readSimilarities.length,
    readError,
    missing: results.reduce((total, result) => total + result.missing.length, 0),
    results,
  };
}
