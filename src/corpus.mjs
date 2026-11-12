// Aggregate inference error across captured pages.
//
// One fixture tells you nothing. Gate 1 in docs/ROADMAP.md asks for an error
// rate, which means many pages, each with the panel a human would have
// published next to it, scored the same way every time.
import { HardwireError } from "./panel.mjs";
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

    const expectedIds = Array.isArray(entry.expected.ports)
      ? entry.expected.ports.map((port) => port.id).sort()
      : [];

    let actual;
    try {
      actual = toPanelDraft(inferFromHtml(entry.html, { origin: entry.expected.origin }));
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
        inventedMutations: 0,
        // There is no inferred panel to compare against, so origin is unknown.
        originMatch: null,
        ports: [],
      };
    }

    return { name, ...comparePanels(entry.expected, actual) };
  });

  const scores = results.map((result) => result.score);
  const mean = scores.reduce((total, score) => total + score, 0) / scores.length;

  return {
    corpus: "hardwire.corpus/1",
    threshold,
    cases: results.length,
    mean: round1(mean),
    min: Math.min(...scores),
    max: Math.max(...scores),
    passed: results.filter((result) => passes(result, threshold)).length,
    inventedMutations: results.reduce((total, result) => total + result.inventedMutations, 0),
    missing: results.reduce((total, result) => total + result.missing.length, 0),
    results,
  };
}
