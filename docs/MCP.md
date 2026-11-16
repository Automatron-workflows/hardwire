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

For a host that supports MCPB, [the desktop bundle](DESKTOP-BUNDLE.md) includes
the runtime dependencies and avoids package downloads during client startup.

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
        "--package=https://github.com/Automatron-workflows/hardwire/releases/download/v0.9.0/hardwire-0.9.0.tgz",
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

This launch path may fetch package metadata even with a populated cache. A slow
network can exceed the client startup timeout. If your network requires a proxy,
the client subprocess must receive its normal proxy configuration. Do not disable
TLS verification. Use the bundle or an installed entry point below when package
downloads at startup are unsuitable.

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

### Codex CLI

On 16 November 2026, a maintainer-run check used Codex CLI 0.145.0 on macOS
26.3.0 with Node 24.16.0 and synthetic data. Codex discovered all five
`hardwire_*` tools and completed these actual calls:

| Tool | Observed result |
| --- | --- |
| `hardwire_inspect_panel` | Three ports: `start-session` (user), `pay-invoice` (owner), `set-preferences` (none); `audit.readable: 0` |
| `hardwire_compile_panel` | `pay_invoice`, `set_preferences`, `start_session`; the `pay_invoice` schema includes `amount` |
| `hardwire_infer_html` | `preferences`, kind `write`, confirmation `user` |
| `hardwire_validate_params` | Amount `2500` rejected with `hardwire_params_invalid`; amount `2400` valid with `executed: false` |
| `hardwire_verify_trace` | Valid, `provesExecution: false` |

No payment ran, no account was connected, and the prompt limited the client to
Hardwire tools. Codex used an existing ChatGPT login; Hardwire received no
credentials. Reproduce the configuration from a checkout:

```sh
codex mcp add hardwire -- "$(command -v node)" "$PWD/src/mcp-server.mjs"
codex mcp list
```

To leave existing client entries untouched, use `codex exec` with
`--ignore-user-config` and temporary `mcp_servers.hardwire` overrides instead
of `codex mcp add`:

```sh
codex exec --ignore-user-config --ephemeral --json -s read-only \
  -c 'approval_policy="never"' \
  -c "mcp_servers.hardwire.command=\"$(command -v node)\"" \
  -c "mcp_servers.hardwire.args=[\"$PWD/src/mcp-server.mjs\"]" \
  -C "$PWD" - < prompt.txt
```

The prompt inspected the panel from `playground/comparison.mjs`, inferred from
the synthetic settings form above, validated the `pay-invoice` amounts and
verified a trace built from that panel. This is a maintainer CLI check, not an
independent outside report or a claim that the Codex desktop UI, VS Code or
every host UI works. The earlier 14 November Codex app-server attempt stopped
before initialization; this CLI result is separate evidence.
[Help verify a native client](https://github.com/Automatron-workflows/hardwire/issues/17).

For hosts supporting MCPB, [the desktop bundle](DESKTOP-BUNDLE.md) includes all
runtime dependencies. Its extracted server is checked through actual stdio calls.
This does not change the native host verification limits above.

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
| Startup times out while downloading | Use the desktop bundle or installed entry point. Check whether the host subprocess receives required network proxy settings. |
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
