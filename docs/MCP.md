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

## Install and verify

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
VS Code check did not reach a running client. [Help verify a native client](https://github.com/Automatron-workflows/hardwire/issues/17).

## First task

Ask your connected agent:

> Use Hardwire to infer a panel from this HTML with origin https://example.com.
> Inspect the draft, then compile its tool descriptions. Explain what needs
> human review. Do not visit the website or execute an inferred operation.
>
> `<form action="/search" method="get"><input name="q" required><button>Search</button></form>`

Expected: one candidate read port with required string argument `q`, a draft and
a compiled description. The effect is inferred from markup and needs review
against actual behavior. The origin is a label; no request is sent to it.

Next validate arguments `{"q":42}` against the draft's port ID: expect
`isError: true`. Change GET to POST and infer again: expect a declared write with
user confirmation. This remains data; the toolkit cannot invoke that operation.

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
