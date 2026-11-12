import assert from "node:assert/strict";
import test from "node:test";

import { normalizePanel, panelDigest } from "../src/panel.mjs";
import { buildTrace, verifyTrace } from "../src/trace.mjs";
import { clone, example } from "./fixtures.mjs";

const AT = "2026-11-11T10:00:00.000Z";

function placeOrder(panel) {
  return panel.ports.find((port) => port.id === "place-order");
}

test("traces are deterministic, order-independent and tamper-evident", () => {
  const panel = normalizePanel(example);
  const port = placeOrder(panel);

  const first = buildTrace({
    panel, port, at: AT,
    params: { idempotencyKey: "k1", shippingAddressId: "a1" },
    outcome: { status: "succeeded", resultDigest: "sha256:" + "a".repeat(64) },
  });
  const second = buildTrace({
    panel, port, at: AT,
    params: { shippingAddressId: "a1", idempotencyKey: "k1" },
    outcome: { status: "succeeded", resultDigest: "sha256:" + "a".repeat(64) },
  });

  assert.equal(first.digest, second.digest);
  assert.match(first.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(verifyTrace(first), true);

  const tampered = clone(first);
  tampered.params.idempotencyKey = "k2";
  assert.equal(verifyTrace(tampered), false);
});

test("a trace is bound to one panel revision", () => {
  const panel = normalizePanel(example);
  const port = panel.ports.find((entry) => entry.id === "search-catalogue");
  const before = buildTrace({ panel, port, params: { query: "x" }, at: AT });

  const revised = normalizePanel({ ...example, revision: "2026-11-12T00:00:00Z" });
  const revisedPort = revised.ports.find((entry) => entry.id === "search-catalogue");
  const after = buildTrace({ panel: revised, port: revisedPort, params: { query: "x" }, at: AT });

  assert.equal(before.panelDigest, panelDigest(panel));
  assert.notEqual(before.panelDigest, after.panelDigest);
  assert.notEqual(before.digest, after.digest);
});

test("a trace refuses an outcome it cannot name and params it cannot check", () => {
  const panel = normalizePanel(example);
  const port = placeOrder(panel);

  assert.throws(() => buildTrace({ panel, port, outcome: { status: "probably" } }), (error) => error.code === "hardwire_trace_invalid");
  assert.throws(() => buildTrace({ panel, port, params: {} }), (error) => error.code === "hardwire_params_invalid");
  assert.throws(() => buildTrace({ panel, port, at: "yesterday" }), (error) => error.code === "hardwire_trace_invalid");
});

test("a trace refuses a port that is not in the panel", () => {
  const panel = normalizePanel(example);
  assert.throws(
    () => buildTrace({ panel, port: "charge-everything", at: AT }),
    (error) => error.code === "hardwire_panel_invalid",
  );
});

test("a trace uses the panel's port, not a caller-supplied impostor", () => {
  const panel = normalizePanel(example);
  const trace = buildTrace({
    panel,
    port: { id: "place-order", kind: "read", confirmation: "none" },
    at: AT,
    params: { idempotencyKey: "k1", shippingAddressId: "a1" },
  });

  assert.equal(trace.port.kind, "payment");
  assert.equal(trace.port.confirmation, "owner");
  assert.equal(verifyTrace(trace), true);
});

test("a port id is enough to build a trace", () => {
  const panel = normalizePanel(example);
  const trace = buildTrace({ panel, port: "search-catalogue", at: AT, params: { query: "lamp" } });
  assert.equal(trace.port.id, "search-catalogue");
});

test("write-only parameters never reach the trace", () => {
  const panel = normalizePanel(example);
  const port = panel.ports.find((entry) => entry.id === "sign-in");
  const trace = buildTrace({
    panel, port, at: AT,
    params: { email: "a@b.c", password: "hunter2" },
    outcome: { status: "succeeded" },
  });

  assert.equal(trace.params.email, "a@b.c");
  assert.equal(trace.params.password, "[redacted]");
  assert.equal(JSON.stringify(trace).includes("hunter2"), false);
  assert.equal(verifyTrace(trace), true);
});
