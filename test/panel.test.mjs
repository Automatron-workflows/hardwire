import assert from "node:assert/strict";
import test from "node:test";

import {
  auditPanel,
  HardwireError,
  normalizePanel,
  PANEL_VERSION,
  panelDigest,
  validateParams,
} from "../src/panel.mjs";
import { example } from "./fixtures.mjs";

const minimal = (ports) => ({ panel: PANEL_VERSION, origin: "https://example.com", ports });
const bare = (overrides) => ({ id: "look", kind: "read", summary: "Look something up.", ...overrides });

function rejects(fn, code) {
  assert.throws(fn, (error) => error instanceof HardwireError && error.code === code);
}

test("the example panel normalises and sorts deterministically", () => {
  const panel = normalizePanel(example);
  assert.equal(panel.origin, "https://shop.example.com");
  assert.deepEqual(
    panel.ports.map((port) => port.id),
    ["add-to-cart", "delete-account", "place-order", "search-catalogue", "sign-in"],
  );
});

test("confirmation defaults follow the effect of the port", () => {
  const byId = Object.fromEntries(normalizePanel(example).ports.map((port) => [port.id, port]));
  assert.equal(byId["search-catalogue"].confirmation, "none");
  assert.equal(byId["place-order"].confirmation, "owner");
  assert.equal(byId["delete-account"].confirmation, "owner");
  assert.equal(byId["add-to-cart"].confirmation, "none");
});

test("a payment can never be downgraded to no confirmation", () => {
  rejects(
    () => normalizePanel(minimal([{ id: "charge", kind: "payment", summary: "Charge the card.", confirmation: "none" }])),
    "hardwire_confirmation_weakened",
  );
});

test("a destructive port needs an owner even when its author disagrees", () => {
  rejects(
    () => normalizePanel(minimal([{ id: "drop", kind: "destructive", summary: "Drop data.", confirmation: "user" }])),
    "hardwire_confirmation_weakened",
  );
});

test("an irreversible write keeps the user floor", () => {
  rejects(
    () => normalizePanel(minimal([{ id: "send", kind: "write", summary: "Send the invoice.", confirmation: "none" }])),
    "hardwire_confirmation_weakened",
  );
});

test("a reversible write may opt out, but does not do so by default", () => {
  const explicit = minimal([{ id: "toggle", kind: "write", summary: "Toggle.", reversible: true, confirmation: "none" }]);
  assert.equal(normalizePanel(explicit).ports[0].confirmation, "none");

  const implicit = minimal([{ id: "toggle", kind: "write", summary: "Toggle.", reversible: true }]);
  assert.equal(normalizePanel(implicit).ports[0].confirmation, "user");
});

test("version and origin are checked before anything else", () => {
  rejects(() => normalizePanel({ ...minimal([bare()]), panel: "hardwire.panel/2" }), "hardwire_version_unsupported");
  rejects(() => normalizePanel({ ...minimal([bare()]), origin: "http://example.com" }), "hardwire_origin_invalid");
  rejects(() => normalizePanel({ ...minimal([bare()]), origin: "https://example.com/path" }), "hardwire_origin_invalid");
  rejects(() => normalizePanel("not a panel"), "hardwire_panel_invalid");
});

test("an empty or duplicated port list is rejected rather than repaired", () => {
  rejects(() => normalizePanel(minimal([])), "hardwire_ports_empty");
  rejects(() => normalizePanel(minimal([bare(), bare()])), "hardwire_port_duplicate");
});

test("required parameters must exist in the declared properties", () => {
  rejects(
    () => normalizePanel(minimal([{
      ...bare(),
      parameters: { properties: { query: { type: "string" } }, required: ["query", "page"] },
    }])),
    "hardwire_schema_invalid",
  );
});

test("unsupported schema keywords fail loudly instead of being ignored", () => {
  rejects(
    () => normalizePanel(minimal([{ ...bare(), parameters: { properties: { q: { type: "geo" } } } }])),
    "hardwire_schema_invalid",
  );
});

test("write-only is restricted to strings so redaction is unambiguous", () => {
  rejects(
    () => normalizePanel(minimal([{
      ...bare(),
      parameters: { properties: { count: { type: "integer", writeOnly: true } } },
    }])),
    "hardwire_schema_invalid",
  );
});

test("loginPort must name a port that exists", () => {
  rejects(() => normalizePanel({ ...minimal([bare()]), auth: { loginPort: "sign-in" } }), "hardwire_schema_invalid");
});

test("parameters are enforced, not merely described", () => {
  const panel = normalizePanel(example);
  const search = panel.ports.find((port) => port.id === "search-catalogue");

  assert.deepEqual(validateParams(search, { query: "lamp", limit: 5 }), { limit: 5, query: "lamp" });
  rejects(() => validateParams(search, {}), "hardwire_params_invalid");
  rejects(() => validateParams(search, { query: "lamp", limit: 5, sort: "price" }), "hardwire_params_invalid");
  rejects(() => validateParams(search, { query: "lamp", limit: 1.5 }), "hardwire_params_invalid");
  rejects(() => validateParams(search, { query: 42 }), "hardwire_params_invalid");
  rejects(() => validateParams(search, "query=lamp"), "hardwire_params_invalid");

  const remove = panel.ports.find((port) => port.id === "delete-account");
  rejects(() => validateParams(remove, { confirmationPhrase: "delete" }), "hardwire_params_invalid");
  assert.deepEqual(validateParams(remove, { confirmationPhrase: "DELETE" }), { confirmationPhrase: "DELETE" });
});

test("audit counts only real mutations as unconfirmed", () => {
  assert.deepEqual(auditPanel(normalizePanel(example)), {
    origin: "https://shop.example.com",
    ports: 5,
    readable: 1,
    mutating: 4,
    needsUser: 0,
    needsOwner: 2,
    unconfirmed: ["add-to-cart", "sign-in"],
  });
});

test("the panel digest is stable and changes with the revision", () => {
  const panel = normalizePanel(example);
  const same = normalizePanel(JSON.parse(JSON.stringify(example)));
  const revised = normalizePanel({ ...example, revision: "2026-11-12T00:00:00Z" });

  assert.equal(panelDigest(panel), panelDigest(same));
  assert.match(panelDigest(panel), /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(panelDigest(panel), panelDigest(revised));
});
