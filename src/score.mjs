// Score an inferred panel against the panel a human would have published.
//
// This exists because "inference works" is not a claim anyone can check. Gate 1
// in docs/ROADMAP.md asks for a number: how far is the guess from the truth,
// and which kind of mistake dominates. The function is deliberately boring and
// explainable rather than clever, so two people scoring the same pair of panels
// get the same result.
import { canonicalJson } from "./canonical.mjs";
import { CONFIRMATIONS, HardwireError, normalizePanel } from "./panel.mjs";

// Fields compared per port. `summary` is excluded on purpose: two people will
// never word it identically, and a wording difference is not an inference bug.
const FIELDS = Object.freeze(["kind", "confirmation", "reversible", "endpoint", "parameters"]);

const EXTRA_PORT_PENALTY = 5;
const DEFAULT_THRESHOLD = 80;

// Descriptions are prose, like `summary`. Two reviewers will phrase them
// differently, and a wording difference is not a structural inference error.
function structural(schema) {
  if (!schema) return schema;
  const { description: _description, ...out } = schema;
  // Strip only schema annotations, never a property named "description".
  if (schema.properties) out.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, structural(value)]));
  if (schema.items) out.items = structural(schema.items);
  return out;
}

/**
 * Compare an expected panel with an inferred one.
 * Returns a score in 0..100 plus the specific differences that produced it.
 */
export function comparePanels(expectedInput, actualInput) {
  const expected = normalizePanel(expectedInput);
  const actual = normalizePanel(actualInput);

  const actualById = new Map(actual.ports.map((port) => [port.id, port]));
  const expectedIds = new Set(expected.ports.map((port) => port.id));

  const ports = expected.ports.map((wanted) => {
    const found = actualById.get(wanted.id);
    if (!found) {
      return {
        id: wanted.id,
        similarity: 0,
        differences: [{ field: "port", expected: wanted.kind, actual: "missing" }],
      };
    }

    const differences = [];
    for (const field of FIELDS) {
      const left = canonicalJson(field === "parameters" ? structural(wanted[field] ?? null) : (wanted[field] ?? null));
      const right = canonicalJson(field === "parameters" ? structural(found[field] ?? null) : (found[field] ?? null));
      if (left !== right) differences.push({ field, expected: wanted[field], actual: found[field] });
    }

    return {
      id: wanted.id,
      similarity: (FIELDS.length - differences.length) / FIELDS.length,
      differences,
    };
  });

  const missing = expected.ports.filter((port) => !actualById.has(port.id)).map((port) => port.id).sort();
  const extra = actual.ports.filter((port) => !expectedIds.has(port.id)).map((port) => port.id).sort();
  const mean = ports.length === 0
    ? 0
    : ports.reduce((total, port) => total + port.similarity, 0) / ports.length;

  const base = Math.round(mean * 100);
  const penalty = extra.length * EXTRA_PORT_PENALTY;
  const extraPorts = extra.map((id) => ({ id, kind: actualById.get(id).kind }));
  const invented = (kind) => extraPorts.filter((port) => port.kind === kind).length;
  const unsafeDifferences = expected.ports.flatMap((wanted) => {
    const found = actualById.get(wanted.id);
    if (!found) return [];
    const reasons = [];
    if (wanted.kind !== found.kind) reasons.push("kind");
    if (CONFIRMATIONS.indexOf(found.confirmation) < CONFIRMATIONS.indexOf(wanted.confirmation)) reasons.push("confirmation");
    if (!wanted.reversible && found.reversible) reasons.push("reversible");
    return reasons.length ? [{ id: wanted.id, reasons }] : [];
  });

  return {
    score: Math.max(0, Math.min(100, base - penalty)),
    base,
    penalty,
    originMatch: expected.origin === actual.origin,
    expected: expected.ports.length,
    actual: actual.ports.length,
    matched: ports.filter((port) => port.similarity === 1).length,
    missing,
    extra,
    extraPorts,
    unsafeDifferences,
    // An invented mutating port is worse than an invented read.
    inventedMutations: extraPorts.filter((port) => port.kind !== "read").length,
    inventedPayments: invented("payment"),
    inventedDestructive: invented("destructive"),
    ports,
  };
}

/** True when a score passes the adoption threshold. */
export function passes(result, threshold = DEFAULT_THRESHOLD) {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) throw new HardwireError("hardwire_score_invalid", "threshold", "expected 0–100");
  return !result.error && result.originMatch === true && result.score >= threshold && result.inventedMutations === 0 && result.unsafeDifferences?.length === 0;
}

export { DEFAULT_THRESHOLD };
