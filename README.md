# Hardwire

**Sites expose ports. Agents plug in.**

[![Tests](https://github.com/Automatron-workflows/hardwire/actions/workflows/test.yml/badge.svg)](https://github.com/Automatron-workflows/hardwire/actions/workflows/test.yml)

Hardwire describes an application's operations in a small JSON file called a
**panel**. Each operation is a **port**: named arguments, an effect such as
`read` or `payment`, and a declared confirmation requirement. An agent
integration can inspect that contract instead of guessing which UI to click.

**Status: 0.5.0 experimental MCP toolkit and Node.js library.** Connect an agent
to five local tools for HTML inference, panel inspection, tool-description
compilation, argument validation and trace verification. You do not need an app,
a website, an API key or hosting. The toolkit processes supplied data; it does
not browse websites, log in or execute the operations described in a panel.

License selection is pending. The setup below is for the owner or users with
separate permission; the public repository currently grants no reuse license.

## Connect in five minutes

Use **Node 24.16 or newer** (`nvm use` if you use nvm).

```sh
git clone https://github.com/Automatron-workflows/hardwire.git
cd hardwire
npm ci --ignore-scripts
npm run test:mcp
npm run --silent mcp:config
```

The smoke check launches a real server, discovers all five tools and calls them
with the official MCP client. The last command prints a client configuration
with exact paths for this machine. Merge its `hardwire` entry into your MCP
client's configuration. [Full setup, a first prompt and troubleshooting](docs/MCP.md).

| Tool | What it does |
| --- | --- |
| `hardwire_inspect_panel` | Validates a panel and summarizes declared effects. |
| `hardwire_compile_panel` | Produces MCP descriptions as data, without registering them. |
| `hardwire_infer_html` | Turns supplied static HTML into a draft that needs review. |
| `hardwire_validate_params` | Checks arguments against a port without executing it. |
| `hardwire_verify_trace` | Checks trace consistency and binding to a supplied panel. |

To explore the library without an agent, run `npm run walkthrough` and
`npm run consumer`. The consumer calls one fixed function on fake catalogue data.
Run `npm run check` for all tests, including a clean package installation and
MCP calls through the installed command. HTTP integration tests need loopback
sockets; restricted sandboxes can run `npm run test:unit` as a partial check.

**Next:** [MCP setup](docs/MCP.md), [library experiments](docs/GETTING-STARTED.md),
[API reference](docs/API.md), [application integration](docs/INTEGRATION.md),
or [release and distribution](docs/DISTRIBUTION.md).

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
| Consumer / plug | An integration mapping application ports to real handlers. See the demo consumer. |
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
