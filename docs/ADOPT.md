# Adopt Hardwire

Hardwire is a small toolkit, not a platform. You can evaluate it in a browser,
install it from a pinned GitHub tag, or connect its local MCP server to an agent.
No account, hosted service, model or API key is required for Hardwire itself.

## Choose a path

| If you want to... | Start here | Time |
| --- | --- | --- |
| See the idea before installing anything | [Run the three action experiment](https://automatron-workflows.github.io/hardwire/experiment.html) | 2 minutes |
| Check one action in your own code | Install the pinned tag and run the snippet below | 10 minutes |
| Give an agent the five inspection tools | Add the no-checkout MCP configuration | 5 minutes |
| Contribute a fixture, fix or client report | Pick a [good first issue](https://github.com/Automatron-workflows/hardwire/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22) | varies |

## Evaluate without installing

Open the [live experiment](https://automatron-workflows.github.io/hardwire/experiment.html).
It runs the real validator against three fixed local handlers. Change an input to
see a rejection before local state changes. Nothing is sent to a server, no
account is connected and no money moves.

Then read [what remains experimental](../README.md#what-remains-experimental).
The benchmark contains three synthetic fixtures. It does not establish accuracy
on arbitrary websites.

## Add it to a project

Hardwire is not published on npm. The bare `hardwire` name on npm belongs to an
unrelated package, so do not run `npm install hardwire`. Install the pinned GitHub
tag instead:

```sh
npm install github:Automatron-workflows/hardwire#v0.8.1
```

Use the library on one action you already understand:

```js
import { auditPanel, compilePanel, normalizePanel, validateParams } from 'hardwire';

const panel = normalizePanel({
  panel: 'hardwire.panel/1',
  origin: 'https://shop.example.com',
  ports: [{
    id: 'search-catalogue',
    kind: 'read',
    summary: 'Search the product catalogue.',
    parameters: {
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  }]
});

const audit = auditPanel(panel);
const tools = compilePanel(panel);
const port = panel.ports.find((entry) => entry.id === 'search-catalogue');

console.log(audit);            // declared effects and approval counts
console.log(tools);            // MCP tool descriptions
console.log(validateParams(port, { query: 'lamp' })); // accepted arguments
```

A rejected argument throws a `HardwireError` with a stable code and field path.
`compilePanel` returns MCP tool descriptions; it does not register or execute
them. Use a trusted handler and real authorization for execution.

### What to check first

- Does the audit match the effects and approvals you intended?
- Does an invalid argument fail with a field path you can act on?
- Does the compiled tool description say enough for an agent to choose it?
- Did you verify the endpoint's actual behavior, not only its declaration?

### What not to assume

- A valid declaration does not prove the endpoint is safe or correct.
- Inference reads static HTML; it does not render JavaScript or establish
  reversibility.
- Approval values are caller assertions, not verified identities.
- The benchmark is three synthetic fixtures, not a production accuracy claim.

## Connect an agent without a checkout

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
clean shutdown. If the client cannot find `npx`, use the absolute path from
`which npx`. A client that accepts only remote HTTP URLs cannot launch this
local stdio server.

The server exposes exactly five fixed inspection tools. It has no browse, file,
shell, login or mutation tool. [The MCP guide](MCP.md) has the checkout
alternative, a first task and troubleshooting.

## First integration checklist

1. Pick one action with a clear input and a known effect.
2. Write the smallest panel that describes it.
3. Run `auditPanel`; confirm the effect and approval floor.
4. Call `validateParams` with one accepted and one rejected sample.
5. Compile the tool description and review it with the handler owner.
6. Only then connect a trusted handler with real authorization.

Do not start with a payment, delete or account recovery action.

## Report what happened

Open an [experiment report](https://github.com/Automatron-workflows/hardwire/issues/new?template=experiment.yml)
or start a [discussion](https://github.com/Automatron-workflows/hardwire/discussions).
A successful first run is useful evidence too. Include the action, the input, the
output and the first confusing moment. Use synthetic data only. Never include
credentials, private captures or personal data.

## Distribution state

As of 14 November 2026:

| Channel | State |
| --- | --- |
| GitHub prerelease | [v0.8.1](https://github.com/Automatron-workflows/hardwire/releases/tag/v0.8.1), MIT, `private: true` |
| GitHub tag install | `npm install github:Automatron-workflows/hardwire#v0.8.1` works without publishing |
| npm | Not published. The scoped `@automatron-workflows/hardwire` is unclaimed; the bare name is an unrelated placeholder. Publication needs the owner's npm login and a separate release decision. |
| MCP Registry | Not listed. Registry submission depends on a public package. |
| Independently confirmed users | Zero. Stars, clones and CI runs are not adoption evidence. |

The honest next evidence is one person outside this repository completing the
experiment or checking one action in their own project and reporting what
happened. Until that exists, treat reach as unproven.
