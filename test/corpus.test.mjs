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

  assert.equal(report.cases, 6);
  assert.equal(report.mean, 60.8);
  assert.equal(report.min, 40);
  assert.equal(report.max, 100);
  assert.equal(report.passed, 2);
  assert.equal(report.inventedMutations, 1);
  assert.equal(report.inventedPayments, 0);
  assert.equal(report.inventedDestructive, 0);
  assert.equal(report.unsafeDifferences, 1);
  assert.equal(report.readPorts, 2);
  assert.equal(report.readError, 0);
  assert.deepEqual(
    report.results.map((result) => [result.name, result.score]),
    [["blog", 100], ["invoice", 40], ["legacy", 60], ["settings", 40], ["shop", 45], ["signin", 80]],
  );
});

test("the settings fixture records the checkbox-to-boolean contract gaps", () => {
  const report = scoreCorpus(cases);
  const settings = report.results.find((result) => result.name === "settings");

  assert.equal(settings.score, 40);
  assert.deepEqual(settings.ports, [
    {
      id: "set-preferences",
      similarity: 0.4,
      differences: [
        { field: "confirmation", expected: "none", actual: "user" },
        { field: "reversible", expected: true, actual: false },
        {
          field: "parameters",
          expected: {
            type: "object",
            properties: { marketingEmails: { type: "boolean" } },
            required: ["marketingEmails"],
            additionalProperties: false,
          },
          actual: {
            type: "object",
            properties: { marketingEmails: { type: "boolean" } },
            required: [],
            additionalProperties: false,
          },
        },
      ],
    },
  ]);
  assert.equal(settings.unsafeDifferences.length, 0, "a conservative draft is wrong here, not unsafe");
  assert.equal(passes(settings), false);
});

test("the sign-in fixture records the session reversibility gap", () => {
  const report = scoreCorpus(cases);
  const signin = report.results.find((result) => result.name === "signin");

  assert.equal(signin.score, 80);
  assert.deepEqual(signin.ports, [
    {
      id: "sign-in",
      similarity: 0.8,
      differences: [
        { field: "reversible", expected: true, actual: false },
      ],
    },
  ]);
  assert.equal(signin.unsafeDifferences.length, 0, "a draft that declines to claim reversibility is conservative");
  assert.equal(passes(signin), true, "the reviewed case clears the default threshold");
});

test("the invoice fixture preserves the payment confirmation floor", () => {
  const report = scoreCorpus(cases);
  const invoice = report.results.find((result) => result.name === "invoice");

  assert.equal(invoice.score, 40);
  assert.deepEqual(invoice.ports, [
    {
      id: "pay-invoice",
      similarity: 0.4,
      differences: [
        { field: "kind", expected: "payment", actual: "write" },
        { field: "confirmation", expected: "owner", actual: "user" },
        {
          field: "parameters",
          expected: {
            type: "object",
            properties: {
              invoiceId: { type: "string", enum: ["demo001"] },
              amount: { type: "integer", enum: [2400] },
              currency: { type: "string", enum: ["EUR"] },
            },
            required: ["amount", "currency", "invoiceId"],
            additionalProperties: false,
          },
          actual: {
            type: "object",
            properties: {
              amount: { type: "number" },
              currency: { type: "string" },
            },
            required: ["amount", "currency"],
            additionalProperties: false,
          },
        },
      ],
    },
  ]);
  assert.deepEqual(invoice.unsafeDifferences, [
    { id: "pay-invoice", reasons: ["kind", "confirmation"] },
  ]);
  assert.equal(invoice.inventedPayments, 0, "the parser must not invent a payment");
  assert.equal(passes(invoice), false);
});

test("a case whose capture yields nothing scores zero instead of aborting the run", () => {
  const report = scoreCorpus([
    { name: "empty", expected: example, html: "<p>no affordances here</p>" },
    ...cases,
  ]);

  assert.equal(report.cases, 7);
  assert.equal(report.results[0].score, 0);
  assert.equal(report.results[0].error, "hardwire_infer_failed");
  assert.equal(report.results[0].expected, example.ports.length);
  assert.deepEqual(report.results[0].missing, example.ports.map((port) => port.id).sort());
  assert.equal(report.results[0].originMatch, null);
  assert.equal(report.readPorts, 3, "the failed case's read port is still measured");
  assert.equal(report.readError, 33.3, "a missing read port is full structural error");
  assert.equal(report.results.length, 7, "the remaining cases still ran");
});

test("the threshold is a parameter, not a constant", () => {
  const report = scoreCorpus(cases, { threshold: 50 });

  assert.equal(report.threshold, 50);
  assert.equal(report.passed, 3, "blog, legacy and signin clear 50; invoice, settings and shop do not");
  assert.equal(passes(report.results[1], 50), false, "invoice stays below 50");
  assert.equal(passes(report.results[3], 50), false, "settings stays below 50");
  assert.equal(passes(report.results[4], 50), false, "shop stays below 50");
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
