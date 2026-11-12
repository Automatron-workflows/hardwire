# Hardwire

**Sites expose ports. Agents plug in.**

[![Tests](https://github.com/Automatron-workflows/hardwire/actions/workflows/test.yml/badge.svg)](https://github.com/Automatron-workflows/hardwire/actions/workflows/test.yml)

Hardwire describes an application's operations in a small JSON file called a
**panel**. Each operation is a **port**: named arguments, an effect such as
`read` or `payment`, and a declared confirmation requirement. An agent
integration can inspect that contract instead of guessing which UI to click.

**Status: 0.4.0 experimental foundation.** This Node.js library validates panels
and arguments, compiles MCP tool descriptions, proposes panels from static HTML,
and creates verifiable trace digests. It does **not** execute operations, provide
an MCP server, log anyone in, or enforce human approval. No React dependency.

## Start in two minutes

Use **Node 24.16 or newer** (`nvm use` if you use nvm). No dependencies, API keys,
accounts, installation step, or paid services are needed.

```sh
git clone https://github.com/Automatron-workflows/hardwire.git
cd hardwire
node --version
npm run walkthrough
npm test
```

The offline walkthrough exercises the public API, verifies a trace, demonstrates
password redaction, and scores a sample inference. `npm test` also starts a
short-lived server on the loopback interface. In a sandbox that forbids listening
sockets, run `npm run test:unit`; the integration suite must still pass in CI.

**Next:** [step-by-step experiments](docs/GETTING-STARTED.md),
[API reference](docs/API.md), or [adding a panel to your app](docs/INTEGRATION.md).

## What a panel looks like

```json
{
  "panel": "hardwire.panel/1",
  "origin": "https://shop.example.com",
  "ports": [{
    "id": "search-catalogue",
    "kind": "read",
    "summary": "Search the product catalogue.",
    "parameters": {
      "properties": { "query": { "type": "string" } },
      "required": ["query"]
    },
    "endpoint": "/api/search"
  }]
}
```

Publish a reviewed panel at `/.well-known/hardwire.json`. That discovery path is
Hardwire's own convention. The endpoint is a locator; the format does not yet
specify HTTP methods, argument serialization, authentication or retries. A
consumer needs an explicit implementation for each port it will call.

| Term | Meaning |
| --- | --- |
| Panel | The versioned description of an application's operations. |
| Port | One operation, its argument schema and declared policy. |
| Consumer / plug | Your integration that maps ports to real handlers. Not included. |
| Trace | A record of a caller's assertion, bound to a panel digest. Not proof of execution. |

## Try the commands

```sh
node src/cli.mjs --help
node src/cli.mjs validate examples/example-panel.json
node src/cli.mjs audit examples/example-panel.json
node src/cli.mjs compile examples/example-panel.json --json
node src/cli.mjs infer https://blog.example.com --html examples/corpus/blog/page.html --draft
```

The last command is **offline**; the origin identifies the captured page. It does
not contact that fictional host. Without `--html`, inference fetches the root
page of the supplied origin. `compile --json` emits a `tools/list` **result body**,
not a running MCP server or a complete JSON-RPC message.

| Command | Purpose |
| --- | --- |
| `validate <panel>` | Validate; add `--json` for normalized JSON. |
| `audit <panel>` | Summarize declared effects and confirmation requirements. |
| `compile <panel> --json` | Produce MCP tool descriptions. |
| `probe <origin>` | Check a fixed set of discovery paths; heuristic, not certification. |
| `infer <origin> [--html <file>]` | Propose candidates; `--draft` emits a validated draft. |
| `trace <panel> <port> --params '<json>' --json` | Record validated arguments; executes nothing. |
| `verify <trace> [--panel <panel>]` | Check digest consistency and optionally panel binding. |
| `score --expected <panel> --infer <html>` | Compare one capture with hand-written ground truth. |
| `corpus <directory>` | Aggregate inference results across fixture pairs. |

Exit codes: **0** success, **1** validation or measured failure, **2** usage or I/O
error. `--json` puts machine-readable successful results on stdout; errors go to
stderr. Use `--params-file` instead of command-line arguments for sensitive
inputs; redaction cannot remove secrets from shell history or process listings.

## Use the API

From a script inside this checkout:

```js
import { normalizePanel, compilePanel, validateParams } from './src/index.mjs';
import { readFile } from 'node:fs/promises';

const panel = normalizePanel(JSON.parse(
  await readFile('./examples/example-panel.json', 'utf8')
));
const tools = compilePanel(panel);
const port = panel.ports.find(p => p.id === 'search-catalogue');
const args = validateParams(port, { query: 'lamp' });
console.log(tools.length, args); // 5, { query: 'lamp' }
```

The package name is not published or reserved on npm. See the
[local package setup](docs/GETTING-STARTED.md#use-it-from-another-local-project)
and the current license before reuse.

## What the foundation checks

| Declared kind | Default confirmation | Lowest accepted declaration |
| --- | --- | --- |
| `read` | `none` | `none` |
| `write` | `user` | `user`, or `none` only with `reversible: true` |
| `payment` | `owner` | `owner` |
| `destructive` | `owner` | `owner` |

These rules reject contradictory **declarations**. They cannot prove what an
endpoint actually does, that a write is reversible, or that approval happened.
MCP annotations are hints; the consumer must enforce authorization and approvals.

Schemas reject unsupported keywords and validate arguments, including nested
objects. Unknown arguments are rejected by default. Traces redact strings
explicitly marked `writeOnly` before hashing, including array items. Unmarked
secrets are not detected. Anyone can rewrite a trace and recompute its digest;
verification is a consistency check, not a signature or receipt.

## Inference is an experiment

Inference reads static forms and JSON-LD `SearchAction` declarations. It does
not render JavaScript, reconstruct arbitrary browser forms, or know business
semantics. A GET form may still change state. Every candidate needs review.

```sh
npm run corpus
```

The **three synthetic fixtures** currently score 100, 60 and 45, with a mean of
68.3/100. This command intentionally exits **1**: only one fixture passes the
80-point threshold, and the shop inference invents a mutation. Read error is 0%
across just **two read ports**. That is a regression baseline, not evidence of
accuracy on real websites. See [measurement and next gates](docs/ROADMAP.md).

## Where it fits

Hardwire is a small contract and validation experiment alongside existing APIs.
It exports MCP-shaped tool descriptions; it does not replace MCP or OpenAPI.
There is no WebMCP adapter yet. The [standards notes](docs/INTEGRATION.md#relationship-to-existing-standards)
link the primary specifications and distinguish implemented features from ideas.

[Format specification](docs/SPEC.md) · [Safety boundaries](docs/SAFETY.md) ·
[Development](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

## License

**Not selected.** The existing `UNLICENSED` / `private: true` status is retained.
This repository is publicly visible, but it is not an open-source release and
visibility does not grant a reuse license. Outside reuse and npm publication
remain pending the owner's license decision.
