import assert from "node:assert/strict";
import test from "node:test";

import { compilePanel, findPort, toolName, toolsListResponse } from "../src/mcp.mjs";
import { normalizePanel } from "../src/panel.mjs";
import { example } from "./fixtures.mjs";

test("compile produces MCP-shaped tools with risk annotations", () => {
  const tools = compilePanel(example);
  assert.equal(tools.length, 5);

  const payment = tools.find((tool) => tool.name === "place_order");
  assert.equal(payment.annotations.readOnlyHint, false);
  assert.deepEqual(payment.inputSchema.required, ["idempotencyKey", "shippingAddressId"]);
  assert.match(payment.description, /payment, requires owner confirmation/);

  const read = tools.find((tool) => tool.name === "search_catalogue");
  assert.equal(read.annotations.readOnlyHint, true);
  assert.match(read.description, /read-only/);

  const unattended = tools.find((tool) => tool.name === "add_to_cart");
  assert.match(unattended.description, /write, no confirmation/);
});

test("tools list is a plain MCP document", () => {
  const response = toolsListResponse(example);
  assert.deepEqual(Object.keys(response), ["tools"]);
  assert.equal(response.tools.length, 5);
});

test("tool names round-trip back to their port", () => {
  const panel = normalizePanel(example);
  assert.equal(toolName("place-order"), "place_order");
  assert.equal(findPort(panel, "place_order").port.id, "place-order");
  assert.equal(findPort(panel, "nope"), undefined);
});

test("compilation is deterministic across runs", () => {
  assert.deepEqual(compilePanel(example), compilePanel(example));
});
