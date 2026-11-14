# Connect Hardwire to an agent

Use Hardwire to understand and check an application's action descriptions before
building an integration. Its five local tools help you inspect required inputs,
review declared effects and approvals, and catch arguments that do not match the
contract.

You supply HTML, JSON action descriptions or call records. Hardwire returns
drafts, validation results and tool descriptions through Model Context Protocol
(MCP). Your client can then explain the results. The toolkit does not visit the
website or execute the described actions.

You can start with the example below. No app ownership, hosting or API key is
required for Hardwire itself. The code is MIT licensed.

## Use the release without a checkout

Add this entry to a client that supports local stdio servers:

```json
{
  "mcpServers": {
    "hardwire": {
      "command": "npx",
      "args": [
        "--yes",
        "--ignore-scripts",
        "--package=https://github.com/Automatron-workflows/hardwire/releases/download/v0.8.1/hardwire-0.8.1.tgz",
        "hardwire-mcp"
      ]
    }
  }
}
```

This downloads the versioned tarball into npx's cache and launches the server.
It was verified with the official SDK 2.4.0 client: five tools, real calls and a
clean shutdown. If `npx` is not on the client's PATH, use its absolute path. A
client that accepts only remote HTTP URLs cannot launch this local stdio server.

## Install from a checkout

Use Node 22 or newer and npm. From a checkout:

```sh
npm ci --ignore-scripts
npm run test:mcp
npm run --silent mcp:config
```

Installation downloads the pinned dependencies. The five tools then run offline.
No service account, API key, app or hosting is required. The smoke check launches
a real server process and uses the official SDK client to list and call all five
tools, test refusals and close the connection. This is a protocol check, not a
claim that every host UI has been tested.

## Configure a client

`mcp:config` prints JSON with the exact Node and server paths on your machine:

```json
{
  "mcpServers": {
    "hardwire": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/hardwire/src/mcp-server.mjs"]
    }
  }
}
```

Merge the `hardwire` entry into a client using the `mcpServers` convention. Keep
existing entries intact, reload the client and check for five `hardwire_*` tools.
An absolute Node path avoids desktop applications missing nvm's shell PATH.

In VS Code, use **MCP: Add Server**, choose command/stdio and enter the same
command and script argument. Its JSON uses `servers` rather than `mcpServers`,
with `type: "stdio"` on the entry. Review the command before trusting it. A client
that supports only remote URLs cannot connect to this local stdio server.

Launch `node src/mcp-server.mjs` directly from clients. `npm run mcp` without
`--silent` can print npm's banner to the protocol stream. A terminal waiting
quietly is expected: the server waits for an MCP client, not a browser.

## Verified client checks

On 13 November 2026, the official SDK 2.4.0 client listed and called all five tools
through a fresh installed package. MCP Inspector 2.0.0 independently listed all
five tools and called `hardwire_validate_params` against the experiment invoice:
2400 cents returned `valid: true` and `executed: false`; 2500 cents returned
`isError: true` and Inspector exit 5.

Reproduce discovery from a checkout with Node 24.16 or a compatible Node version:

```sh
npx --yes --ignore-scripts @modelcontextprotocol/inspector@2.0.0 --cli node src/mcp-server.mjs --method tools/list
```

This pins the Inspector version actually tested. Its CLI is a second protocol
client, not proof of a successful conversational workflow in a desktop agent.
VS Code and native Codex setup remain unverified in their host UIs. The attempted
VS Code check did not reach a running client. On 14 November, Codex 0.145.0
app server verification also stopped before initialization completed. No native
client success is claimed. [Help verify a native client](https://github.com/Automatron-workflows/hardwire/issues/17).

## First task

Use the email preference from the third demo scene. Ask your connected agent:

> Use Hardwire to infer a panel from this HTML with origin https://example.com.
> Inspect the draft. Validate {"marketingEmails":false}, then test
> {"marketingEmails":"false"}. Compile the MCP tool description and explain
> what needs human review. Do not visit the origin or execute the action.
>
> `<form action="/preferences" method="post"><input type="checkbox" name="marketingEmails"><button>Save</button></form>`

Expected: the `preferences` candidate is a write requiring user confirmation.
The boolean passes; the string returns `isError: true`. The compiled input schema
contains a boolean `marketingEmails`. No endpoint is called. Inference cannot
establish reversibility or inherit the reviewed visual fixture's approval rules.

The [saved form experiment](FORM-EXPERIMENT.md) reproduces the same task without
an agent or account. Use synthetic input when testing a connected model client.

## Tool arguments

| Tool | Arguments |
| --- | --- |
| `hardwire_inspect_panel` | `panel_json`: serialized panel |
| `hardwire_compile_panel` | `panel_json`: serialized panel |
| `hardwire_infer_html` | `origin`: bare HTTP(S) origin; `html`: static HTML |
| `hardwire_validate_params` | `panel_json`, `port_id`, `params_json`: serialized arguments |
| `hardwire_verify_trace` | `panel_json`, `trace_json`: serialized trace |

JSON is supplied as text so the toolkit can validate its own contract and return
bounded errors. Unknown outer arguments are rejected. Validation returns no
argument values. Trace verification does not establish authorship, execution or
human approval. Use sanitized HTML and fake arguments; your host/model provider
determines where chat content goes. Hardwire itself has no telemetry.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `npx: command not found` | Use the absolute path from `which npx`, or install from a checkout. |
| Tarball returns 404 | Check the version in the no-checkout config against the published release. |
| `ERR_MODULE_NOT_FOUND` | Run `npm ci --ignore-scripts` in the checkout. |
| Node cannot be found | Regenerate `mcp:config` with the intended Node version. |
| No tools appear | Run `npm run test:mcp`, check host logs and reload configuration. |
| Terminal waits silently | Expected for stdio; configure a client to launch it. |
| Unknown tool such as `search_catalogue` | Only the five toolkit tools are callable. Compiled descriptions are data. |
| `hardwire_input_invalid` | Supply valid JSON text within 256 KiB, with no extra arguments. |
| `hardwire_infer_failed` | Check origin and HTML size (512 KiB UTF-8); dynamic rendering is unsupported. |
| Trace returns `valid: false` | Shape, digest, arguments or panel binding failed validation. |

The checks use official server/client SDK 2.4.0. The SDK handles initialization
and protocol negotiation. There is no hosted HTTP endpoint or browser dependency.

Sources checked 2026-11-12: [SDK stdio](https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio),
[SDK tools](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools),
[VS Code setup](https://code.visualstudio.com/docs/agent-customization/mcp-servers).
