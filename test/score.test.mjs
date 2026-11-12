import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inferFromHtml, toPanelDraft } from "../src/infer.mjs";
import { comparePanels, passes } from "../src/score.mjs";
import { clone, example } from "./fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCORE_DIR = join(HERE, "..", "examples", "corpus", "shop");
const expected = JSON.parse(await readFile(join(SCORE_DIR, "expected.json"), "utf8"));
const page = await readFile(join(SCORE_DIR, "page.html"), "utf8");

const inferred = () => toPanelDraft(inferFromHtml(page, { origin: expected.origin }));

test("a panel compared with itself scores 100", () => {
  const result = comparePanels(example, example);
  assert.equal(result.score, 100);
  assert.equal(result.matched, example.ports.length);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.extra, []);
  assert.equal(result.inventedMutations, 0);
});

test("the recorded fixture pair produces the documented number", () => {
  const result = comparePanels(expected, inferred());

  assert.equal(result.expected, 4);
  assert.equal(result.actual, 3);
  assert.equal(result.matched, 2);
  assert.deepEqual(result.missing, ["place-order", "sign-in"]);
  assert.deepEqual(result.extra, ["checkout"]);
  assert.equal(result.base, 50);
  assert.equal(result.penalty, 5);
  assert.equal(result.score, 45);
  assert.equal(result.inventedMutations, 1);
  assert.equal(passes(result), false);
});

test("a missing port scores zero and is named", () => {
  const actual = clone(example);
  actual.ports = actual.ports.filter((port) => port.id !== "place-order");
  const result = comparePanels(example, actual);

  assert.deepEqual(result.missing, ["place-order"]);
  assert.equal(result.ports.find((port) => port.id === "place-order").similarity, 0);
  assert.ok(result.score < 100);
});

test("an invented read is penalised but not treated as dangerous", () => {
  const actual = clone(example);
  actual.ports.push({ id: "browse", kind: "read", summary: "List everything." });
  const result = comparePanels(example, actual);

  assert.deepEqual(result.extra, ["browse"]);
  assert.equal(result.penalty, 5);
  assert.equal(result.inventedMutations, 0);
});

test("an invented mutation is counted separately", () => {
  const actual = clone(example);
  actual.ports.push({ id: "subscribe", kind: "write", summary: "Subscribe." });
  const result = comparePanels(example, actual);

  assert.equal(result.inventedMutations, 1);
  assert.equal(result.inventedPayments, 0);
  assert.equal(passes(result), false, "an invented mutation fails the gate regardless of score");
});

test("an invented payment or destructive port is named as such", () => {
  const actual = clone(example);
  actual.ports.push({ id: "charge", kind: "payment", summary: "Charge the card." });
  actual.ports.push({ id: "wipe", kind: "destructive", summary: "Delete everything." });
  const result = comparePanels(example, actual);

  assert.equal(result.inventedMutations, 2);
  assert.equal(result.inventedPayments, 1);
  assert.equal(result.inventedDestructive, 1);
  assert.deepEqual(
    result.extraPorts.map((port) => port.kind).sort(),
    ["destructive", "payment"],
  );
});

test("a changed field is reported by name, not just as a lower number", () => {
  const actual = clone(example);
  const port = actual.ports.find((entry) => entry.id === "place-order");
  port.kind = "write";
  port.confirmation = "user";

  const result = comparePanels(example, actual);
  const changed = result.ports.find((entry) => entry.id === "place-order");
  assert.deepEqual(changed.differences.map((difference) => difference.field), ["kind", "confirmation"]);
  assert.equal(changed.similarity, 0.6);
});

test("a different description is wording, not an inference error", () => {
  const actual = clone(example);
  const port = actual.ports.find((entry) => entry.id === "search-catalogue");
  port.parameters.properties.query.description = "Words to look for.";

  const result = comparePanels(example, actual);
  assert.equal(result.score, 100);
});

test("differing origins are reported rather than silently ignored", () => {
  const actual = { ...example, origin: "https://other.example.com" };
  assert.equal(comparePanels(example, actual).originMatch, false);
});

test("passing requires both a high score and no invented mutations", () => {
  const clean = comparePanels(example, example);
  assert.equal(passes(clean), true);
  assert.equal(passes({ score: 95, inventedMutations: 1 }), false);
  assert.equal(passes({ score: 60, inventedMutations: 0 }), false);
  assert.equal(passes({ score: 90, inventedMutations: 0 }, 95), false);
});
