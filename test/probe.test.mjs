import assert from "node:assert/strict";
import test from "node:test";

import { probeOrigin } from "../src/probe.mjs";
import { cooperative, example, site } from "./fixtures.mjs";

test("a cooperative site scores full marks and its panel is inspected", async () => {
  const report = await probeOrigin("https://shop.example.com", { fetchImpl: site(cooperative()) });

  assert.equal(report.score, 100);
  assert.deepEqual(report.signals, ["agent-card", "hardwire", "llms", "mcp", "openapi", "webmcp", "x402"]);
  assert.deepEqual(report.missing, []);
  assert.equal(report.page.declaresWebMcpMeta, true);

  const hardwire = report.probes.find((probe) => probe.id === "hardwire");
  assert.equal(hardwire.panel.valid, true);
  assert.equal(hardwire.panel.ports, 5);
});

test("probe output is ordered deterministically", async () => {
  const first = await probeOrigin("https://shop.example.com", { fetchImpl: site(cooperative()) });
  const second = await probeOrigin("https://shop.example.com", { fetchImpl: site(cooperative()) });
  assert.deepEqual(
    first.probes.map((probe) => `${probe.path}#${probe.id}`),
    second.probes.map((probe) => `${probe.path}#${probe.id}`),
  );
});

test("an uncooperative site scores zero without throwing", async () => {
  const report = await probeOrigin("https://closed.example.com", { fetchImpl: site({}) });
  assert.equal(report.score, 0);
  assert.equal(report.signals.length, 0);
  assert.equal(report.missing.length, 6);
  assert.match(report.note, /not a certification/);
});

test("a panel that does not validate is not a surface", async () => {
  const routes = { ...cooperative(), "/.well-known/hardwire.json": { body: '{"panel":"hardwire.panel/1"}' } };
  const report = await probeOrigin("https://shop.example.com", { fetchImpl: site(routes) });

  const hardwire = report.probes.find((probe) => probe.id === "hardwire");
  assert.equal(hardwire.ok, false);
  assert.equal(hardwire.panel.valid, false);
  assert.match(hardwire.note, /did not validate/);
  assert.equal(report.score, 70);
  assert.ok(report.missing.includes("hardwire"));
});

test("a panel published for another origin does not count as this site's surface", async () => {
  const report = await probeOrigin("https://other.example.com", { fetchImpl: site(cooperative(example)) });
  const hardwire = report.probes.find((probe) => probe.id === "hardwire");

  assert.equal(hardwire.ok, false);
  assert.equal(hardwire.panel.valid, false);
  assert.equal(hardwire.panel.code, "hardwire_origin_mismatch");
  assert.equal(report.score, 70);
});

test("a blanket robots disallow caps the score and is reported as a gate", async () => {
  const routes = { ...cooperative(), "/robots.txt": { body: "User-agent: *\nDisallow: /", type: "text/plain" } };
  const report = await probeOrigin("https://hostile.example.com", { fetchImpl: site(routes) });

  assert.equal(report.blockedByRobots, true);
  assert.equal(report.cappedByRobots, true);
  assert.equal(report.score, 25);

  const robots = report.probes.find((probe) => probe.id === "robots");
  assert.equal(robots.ok, false);
  assert.equal(robots.gate, true);
  assert.match(robots.note, /blanket disallow/);
});

test("network failure is a finding, not an exception", async () => {
  const fetchImpl = async () => {
    throw Object.assign(new Error("offline"), { name: "TypeError" });
  };
  const report = await probeOrigin("https://gone.example.com", { fetchImpl });
  assert.equal(report.score, 0);
  assert.ok(report.probes.every((probe) => probe.status === 0 && probe.error === "network"));
});

test("private hosts are refused unless explicitly allowed, and near-misses are public", async () => {
  await assert.rejects(
    () => probeOrigin("https://127.0.0.1:8443", { fetchImpl: site({}) }),
    (error) => error.code === "hardwire_origin_private",
  );
  await assert.rejects(
    () => probeOrigin("https://printer.internal", { fetchImpl: site({}) }),
    (error) => error.code === "hardwire_origin_private",
  );

  // A public hostname that merely starts with the octet 10 is still public.
  const report = await probeOrigin("https://10.example.com", { fetchImpl: site({}) });
  assert.equal(report.origin, "https://10.example.com");

  const local = await probeOrigin("http://localhost:3000", { fetchImpl: site({}), allowPrivate: true });
  assert.equal(local.origin, "http://localhost:3000");
});
