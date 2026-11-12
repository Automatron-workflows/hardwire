# Hardwire

**Sites expose ports. Agents plug in.**

Hardwire is an open panel format for agent-operable software. Instead of an
agent guessing which element is "submit", an application publishes its real
operations as typed ports with a declared effect and confirmation floor. One
file, one digest, no DOM.

```json
{
  "panel": "hardwire.panel/1",
  "origin": "https://shop.example.com",
  "ports": [
    {
      "id": "place-order",
      "kind": "payment",
      "summary": "Convert the current cart into a paid order.",
      "parameters": {
        "properties": {
          "shippingAddressId": { "type": "string" },
          "idempotencyKey": { "type": "string" }
        },
        "required": ["shippingAddressId", "idempotencyKey"]
      },
      "endpoint": "/api/orders"
    }
  ]
}
```

That file is the whole idea. It compiles to MCP tools, it validates arguments
before anything happens, and it cannot be downgraded into an unattended payment.

## Why

Cursor emulation is the worst part of agent browsing. It is slow, it breaks on
every redesign, and it turns a deterministic operation into a vision problem.
The fix is not a smarter cursor; it is for software to say what it does.

That idea is not new. WebMCP is a W3C Community Group draft for browser-side
tool APIs, and MCP servers are already the dominant server-side pattern. Hardwire
does not compete with either. It takes the part they leave to each implementer —
**what is safe to expose, and what may run without a human** — and makes it a
validated file with stable error codes.

## Install

Node 24.16 or newer. Zero dependencies, nothing to install.

```sh
git clone https://github.com/Automatron-workflows/hardwire.git
cd hardwire
npm test
```

Use it as a library:

```js
import { normalizePanel, compilePanel, buildTrace } from "hardwire";
```

Or from the command line:

```sh
node src/cli.mjs validate examples/example-panel.json
node src/cli.mjs audit    examples/example-panel.json
node src/cli.mjs compile  examples/example-panel.json
node src/cli.mjs probe    https://shop.example.com
node src/cli.mjs infer    https://shop.example.com --draft
```

## Commands

| Command | What it does |
| --- | --- |
| `validate <panel.json>` | Check the panel and print the normalised form. |
| `audit <panel.json>` | Report what an agent may do unattended. |
| `compile <panel.json>` | Emit an MCP `tools/list` document. |
| `probe <origin>` | Score an origin's agent-readiness from public endpoints. |
| `infer <origin>` | Derive candidate ports from forms and structured data. |
| `trace <panel.json> <port>` | Validate arguments and emit a digested record. |
| `score --expected … --infer …` | Measure how far an inference is from a hand-written panel. |

Exit codes: `0` ok, `1` invalid input or an origin below the probe threshold,
`2` usage or I/O.

## Three rules that do the work

**1. Effect classes have floors that cannot be lowered.**

| `kind` | Default | Floor | Overridable |
| --- | --- | --- | --- |
| `read` | `none` | `none` | — |
| `write` | `user` | `none` if `reversible: true` | yes, to `none` |
| `destructive` | `owner` | `owner` | **no** |
| `payment` | `owner` | `owner` | **no** |

A panel declaring `payment` with `confirmation: "none"` is rejected with
`hardwire_confirmation_weakened`. It does not silently pass. Reversibility is
never inferred; a publisher has to assert it.

**2. Description is not enforcement.**

`validateParams` checks real arguments against the declared schema: types,
required fields, enums, array items and unknown keys. Unknown properties are
rejected unless the panel opts into `additionalProperties: true`. Declaring a
shape that nothing checks is worse than declaring nothing.

**3. A trace binds to one revision.**

Every trace carries the digest of the exact panel it came from. "The agent did
X" becomes checkable against "this is what the site published at the time."
Write-only parameters are redacted before hashing, so a login never lands in a
log.

## Inference: working with sites that published nothing

`infer` reads forms, field types, `required` attributes and JSON-LD
`potentialAction` blocks to propose candidate ports. It is deliberately
conservative:

- it may only propose `read` and `write` — **never** `payment` or `destructive`;
- every candidate is labelled `low` or `very-low` confidence with its evidence;
- `--draft` emits a valid panel where every write still needs user confirmation.

A candidate is a starting point for a reviewer, not a contract. The point is
that an agent gets something useful on day one and a publisher gets a concrete
thing to correct.

### Measuring inference instead of asserting it

`score` compares an inferred panel with the panel a careful engineer would have
published. Differences are named by field, invented ports cost points, and an
invented **mutating** port fails outright regardless of score.

```sh
npm run score
# score 45/100 (50 - 5 for invented ports)
#   expected 4 ports, inferred 3, identical 2
#   missing:  place-order, sign-in
#   invented: checkout
```

The number is the product. Gate 1 in [docs/ROADMAP.md](docs/ROADMAP.md) asks for
an error rate across a corpus; one recorded fixture is a smoke test, not a
result.

## Probe scoring

`probe` fetches a bounded set of public paths. Weights sum to 100:

| Signal | Path | Weight | Status |
| --- | --- | --- | --- |
| panel | `/.well-known/hardwire.json` | 30 | proposed here |
| WebMCP declaration | in-page `<meta>`/`<link>` | 20 | draft, weak |
| MCP descriptor | `/.well-known/mcp.json` | 15 | convention |
| OpenAPI | `/openapi.json` | 15 | convention |
| agent card | `/.well-known/agent-card.json` | 10 | deployed |
| `llms.txt` | `/llms.txt` | 5 | convention |
| x402 | `/.well-known/x402` | 5 | deployed |

A panel that fails validation scores nothing. A blanket `robots.txt` disallow
caps the total at 25 and sets `cappedByRobots`. The number is a diagnostic for
finding work, not a grade or a certification.

## What this does not do

- **It does not make unauthorised automation authorised.** A panel is
  cooperation. `probe` reports a blanket `robots.txt` disallow as a gate instead
  of pretending the score is fine.
- **It does not execute.** `trace` validates and digests. Calling the endpoint,
  holding credentials and deciding whether to proceed belong to the caller.
- **It does not sign.** A digest proves a record is unmodified, not that anyone
  with authority asserted it.
- **It is not a standard.** One implementation, no adopters, no registry. A
  format with a single author is a proposal.

## Status

`0.1.0`, unpublished, unadopted. The format may change. See
[docs/ROADMAP.md](docs/ROADMAP.md) for the gates that would have to pass before
anyone should depend on it, and [docs/SAFETY.md](docs/SAFETY.md) for the threat
model.

## License

Not decided. `package.json` is `"private": true` and `"license": "UNLICENSED"`
until the owner chooses. Do not assume permission to reuse.
