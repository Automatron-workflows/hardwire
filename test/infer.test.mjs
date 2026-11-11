import assert from "node:assert/strict";
import test from "node:test";

import { inferFromHtml, inferFromUrl, toPanelDraft } from "../src/infer.mjs";
import { normalizePanel } from "../src/panel.mjs";
import { site } from "./fixtures.mjs";

const PAGE = `<!doctype html>
<html><body>
  <form id="order" action="/api/orders" method="post" aria-label="place an order">
    <input name="sku" type="text" required>
    <input name="quantity" type="number" required>
    <input name="gift" type="checkbox">
    <input type="hidden" name="token" value="opaque">
    <button type="submit">Order</button>
  </form>
  <form action="/search" method="get">
    <input name="q" type="search">
  </form>
  <form>
    <input name="note" type="text">
  </form>
  <script type="application/ld+json">
    {"@context":"https://schema.org","potentialAction":{
      "@type":"SearchAction",
      "target":"https://shop.example.com/search?q={search_term_string}",
      "query-input":"required name=search_term_string"}}
  </script>
</body></html>`;

const infer = (html = PAGE) => inferFromHtml(html, { origin: "https://shop.example.com" });

test("forms become candidate ports with typed parameters", () => {
  const { candidates } = infer();
  const order = candidates.find((candidate) => candidate.id === "order");

  assert.equal(order.kind, "write");
  assert.equal(order.confidence, "low");
  assert.equal(order.endpoint, "/api/orders");
  assert.deepEqual(order.parameters.properties, {
    gift: { type: "boolean" },
    quantity: { type: "number" },
    sku: { type: "string" },
  });
  assert.deepEqual(order.parameters.required, ["quantity", "sku"]);
  assert.ok(!("token" in order.parameters.properties), "hidden inputs are not agent parameters");
});

test("a GET form is a read and a POST form is a write", () => {
  const byId = Object.fromEntries(infer().candidates.map((candidate) => [candidate.id, candidate]));
  assert.equal(byId.search.kind, "read");
  assert.equal(byId.order.kind, "write");
});

test("inference never proposes payment or destructive ports", () => {
  const { candidates } = infer();
  for (const candidate of candidates) {
    assert.ok(["read", "write"].includes(candidate.kind), `${candidate.id} is ${candidate.kind}`);
  }
});

test("a form without an action is marked very-low confidence and gets no endpoint", () => {
  const formless = infer().candidates.find((candidate) => candidate.id === "form");
  assert.equal(formless.confidence, "very-low");
  assert.equal(formless.endpoint, undefined);
});

test("a form wins over structured data with the same name", () => {
  const ids = infer().candidates.map((candidate) => candidate.id);
  assert.equal(ids.filter((id) => id === "search").length, 1);
  assert.ok(!ids.includes("search-2"));
});

test("structured data alone still yields a read port", () => {
  const html = `<script type="application/ld+json">{"potentialAction":{"@type":"SearchAction","target":"/find?q={q}"}}</script>`;
  const { candidates } = infer(html);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].kind, "read");
  assert.deepEqual(candidates[0].parameters.required, ["query"]);
});

test("the draft is a valid panel and keeps writes behind user confirmation", () => {
  const draft = toPanelDraft(infer());
  const panel = normalizePanel(draft);

  assert.equal(panel.origin, "https://shop.example.com");
  for (const port of panel.ports.filter((entry) => entry.kind === "write")) {
    assert.equal(port.confirmation, "user");
    assert.equal(port.reversible, false);
  }
});

test("a page with nothing to infer produces no draft", () => {
  assert.equal(infer("<html><body><p>Hello</p></body></html>").candidates.length, 0);
  assert.throws(
    () => toPanelDraft(infer("<html></html>")),
    (error) => error.code === "hardwire_infer_failed",
  );
});

test("inferFromUrl fetches once and reports a non-200 page", async () => {
  const ok = await inferFromUrl("https://shop.example.com", {
    fetchImpl: site({ "/": { body: PAGE, type: "text/html" } }),
  });
  assert.equal(ok.candidates.length, 3);

  await assert.rejects(
    () => inferFromUrl("https://shop.example.com", { fetchImpl: site({}) }),
    (error) => error.code === "hardwire_infer_failed",
  );
});
