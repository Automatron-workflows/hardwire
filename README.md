# Hardwire

**Make software understandable to AI agents.**

Hardwire is an open source toolkit that helps developers describe application
actions and check their inputs, declared effects and approval requirements
before connecting those actions to an AI agent.

Start with saved HTML or an existing action description. You can inspect and
validate it locally without owning an app, hosting a service or providing an
API key.

[Try the browser playground](https://automatron-workflows.github.io/hardwire/)
· [Download the release](https://github.com/Automatron-workflows/hardwire/releases/tag/v0.6.0)
· [Connect an agent](docs/MCP.md) · [Explore without an agent](docs/GETTING-STARTED.md)

[![Tests](https://github.com/Automatron-workflows/hardwire/actions/workflows/test.yml/badge.svg)](https://github.com/Automatron-workflows/hardwire/actions/workflows/test.yml)

## Why Hardwire exists

An interface shows a person where to click. An agent integration also needs to
know what an action expects, what it changes and which approvals apply. When
that information is missing or inconsistent, developers have to reconstruct it
for each integration.

Hardwire puts those declarations into a shared format and provides tools to
check them. Use it to find invalid inputs and contradictory rules,
review inferred actions and prepare tool descriptions before connecting them to
real application code.

**Mission:** Make application actions explicit, reviewable and reusable for
people building AI agents.

**Vision:** A web where people can delegate tasks to agents through clear
operations, while applications retain control over access and approvals.

## What you can use today

Version 0.6.0 includes a browser playground, portable library, Node.js CLI and local
MCP server. Model Context Protocol, or MCP, lets an agent client call tools.
Hardwire exposes five tools for inspecting and checking supplied data.

| Tool | What you get |
| --- | --- |
| `hardwire_infer_html` | A draft action description extracted from static HTML, ready for human review. |
| `hardwire_inspect_panel` | Validation results and a summary of declared effects and approvals. |
| `hardwire_validate_params` | A check that arguments match an action's declared input schema. |
| `hardwire_compile_panel` | MCP tool descriptions to use when designing an integration. |
| `hardwire_verify_trace` | A consistency check between a call record and its action description. |

The toolkit inspects descriptions. It does not browse websites, log in or
execute the application actions it describes. Connecting an action to a real
service still requires a trusted handler, authorization and approval enforcement.

## How it works

1. **Describe an action.** Supply saved HTML to infer a draft, or write a JSON
   description of operations you already understand.
2. **Review the contract.** Check required inputs, declared effects and approval
   requirements. Confirm inferred declarations against the application's actual
   behavior.
3. **Check an integration before execution.** Validate example arguments,
   generate MCP tool descriptions and check records against the reviewed contract.

For example, a search form with a required `q` field can become a draft search
action with a required string input. Hardwire can reject `{"q": 42}` and show the
declared policy. A developer still needs to confirm what the search endpoint
does and connect it to application code.

## Who it is for

**Agent developers** can turn supplied markup or action descriptions into a
contract they can inspect and test.

**Application teams** can describe operations in one place and check the
arguments their integrations intend to send.

**Researchers and experimenters** can compare inferred descriptions with reviewed
examples and measure where inference fails. App ownership is not required to
start with the included examples or permitted HTML captures.

## Try it

**[Open the playground](https://automatron-workflows.github.io/hardwire/)** to
move Friday's meetings to Monday. Hardwire validates the calendar's typed
actions; the example finds available times, previews the changes, requires your
approval and reads the result back. Undo restores the original meetings.
No installation or account connection is needed. The calendar is sample data
held in the current tab, driven by a scripted agent. Expand “See the actions” to
inspect the actual contract and calls.

The live demo follows main. To run that version locally, check out main after
cloning and installing, then use
`npm run demo` and open `http://127.0.0.1:8787/playground/`.

Use **Node 22 or newer**. CI tests Node 22 and 24.

```sh
git clone --branch v0.6.0 --depth 1 https://github.com/Automatron-workflows/hardwire.git
cd hardwire
npm ci --ignore-scripts
npm run test:mcp
npm run --silent mcp:config
```

The smoke check starts a server and calls all five tools with the official MCP
client. The last command prints configuration with the exact paths on your
machine. Add its `hardwire` entry to your local MCP client's configuration.
The [setup guide](docs/MCP.md) includes a first prompt and troubleshooting.

To explore without an agent, run `npm run walkthrough`. To see a fixed read
handler search fake catalogue data, run `npm run consumer`. This example shows
how an application integration could work; the toolkit does not execute arbitrary
panel operations.

The [GitHub release](https://github.com/Automatron-workflows/hardwire/releases/tag/v0.6.0)
also provides an installable package and checksum. Hardwire is not published on
npm or listed in the MCP Registry. Do not use `npm install hardwire` to obtain
this project.

## The format in one example

A **panel** is a JSON description of an application's actions. Each action is a
**port** with a name, input schema, declared effect and confirmation requirement.

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

A reviewed panel can be served at `/.well-known/hardwire.json`, Hardwire's own
discovery convention. An endpoint identifies a location. The format does not yet
define HTTP methods, authentication, argument serialization or retry behavior.

A **trace** records a caller's assertions and binds them to a particular panel
revision through a digest. It can reveal inconsistent records, but it does not
prove execution, authorship or approval.

## What remains experimental

Validation checks declarations, not application behavior. Inference reads static
forms and JSON-LD search descriptions; it does not render JavaScript or establish
whether an endpoint is safe. Even a GET form can change state.

The current benchmark contains **three synthetic fixtures**, with scores of
100, 60 and 45. Only one passes the threshold of 80. These examples exercise the
code; they do not establish accuracy on real websites or performance gains.
See [the roadmap](docs/ROADMAP.md) for the open evidence and integration gates.

Hardwire works alongside APIs and MCP. There is no WebMCP adapter or general
website executor. [Integration notes](docs/INTEGRATION.md) explain the boundaries.

## Go deeper

| Goal | Guide |
| --- | --- |
| Connect an agent and complete a first task | [MCP setup](docs/MCP.md) |
| Explore commands and local examples | [Getting started](docs/GETTING-STARTED.md) |
| Use the library in your code | [API reference](docs/API.md) |
| Understand the runtime boundaries and deployment | [Architecture](docs/ARCHITECTURE.md) |
| Understand the action format | [Specification](docs/SPEC.md) |
| Design an application integration | [Integration](docs/INTEGRATION.md) |
| Review limits and trust assumptions | [Safety](docs/SAFETY.md) |
| Contribute or run the full checks | [Development](CONTRIBUTING.md) |
| Understand distribution and next steps | [Distribution](docs/DISTRIBUTION.md) |

## License

[MIT](LICENSE). You may use, modify and redistribute the software under its
license terms. Package publication on npm remains separate from this public
GitHub release. See the [release decision](docs/RELEASE-DECISION.md).
