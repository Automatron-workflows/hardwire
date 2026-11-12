import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { scoreCorpus } from "../src/corpus.mjs";
import { passes } from "../src/score.mjs";
import { example } from "./fixtures.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = join(HERE, "..", "examples", "corpus");

const cases = [];
for (const name of (await readdir(CORPUS_DIR)).sort()) {
  cases.push({
    name,
    expected: JSON.parse(await readFile(join(CORPUS_DIR, name, "expected.json"), "utf8")),
    html: await readFile(join(CORPUS_DIR, name, "page.html"), "utf8"),
  });
}

test("the recorded corpus produces the documented numbers", () => {
  const report = scoreCorpus(cases);

  assert.equal(report.cases, 3);
  assert.equal(report.mean, 68.3);
  assert.equal(report.min, 45);
  assert.equal(report.max, 100);
  assert.equal(report.passed, 1);
  assert.equal(report.inventedMutations, 1);
  assert.equal(report.inventedPayments, 0);
  assert.equal(report.inventedDestructive, 0);
  assert.equal(report.readPorts, 2);
  assert.equal(report.readError, 0);
  assert.deepEqual(
    report.results.map((result) => [result.name, result.score]),
    [["blog", 100], ["legacy", 60], ["shop", 45]],
  );
});

test("a case whose capture yields nothing scores zero instead of aborting the run", () => {
  const report = scoreCorpus([
    { name: "empty", expected: example, html: "<p>no affordances here</p>" },
    ...cases,
  ]);

  assert.equal(report.cases, 4);
  assert.equal(report.results[0].score, 0);
  assert.equal(report.results[0].error, "hardwire_infer_failed");
  assert.equal(report.results[0].expected, example.ports.length);
  assert.deepEqual(report.results[0].missing, example.ports.map((port) => port.id).sort());
  assert.equal(report.results[0].originMatch, null);
  assert.equal(report.readPorts, 3, "the failed case's read port is still measured");
  assert.equal(report.readError, 33.3, "a missing read port is full structural error");
  assert.equal(report.results.length, 4, "the remaining cases still ran");
});

test("the threshold is a parameter, not a constant", () => {
  const report = scoreCorpus(cases, { threshold: 50 });

  assert.equal(report.threshold, 50);
  assert.equal(report.passed, 2, "blog and legacy clear 50; shop does not");
  assert.equal(passes(report.results[2], 50), false);
});

test("an empty corpus is refused rather than reported as perfect", () => {
  assert.throws(() => scoreCorpus([]), { code: "hardwire_corpus_invalid" });
});

test("a case without a name is refused", () => {
  assert.throws(
    () => scoreCorpus([{ expected: example, html: "<p></p>" }]),
    { code: "hardwire_corpus_invalid" },
  );
});

test("duplicate case names are refused rather than counted twice", () => {
  const one = { name: "same", expected: example, html: "<p></p>" };
  assert.throws(() => scoreCorpus([one, { ...one }]), { code: "hardwire_corpus_invalid" });
});
