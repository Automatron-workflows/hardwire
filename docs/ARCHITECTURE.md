# Architecture

Hardwire turns application action descriptions into data that an integration can
review and validate. The same core serves the browser playground, Node library,
CLI and local MCP server. The panel and trace formats remain version 1.

## Boundaries

```mermaid
flowchart TD
  A["Browser playground"] --> B["Portable core"]
  C["CLI and Node API"] --> B
  D["MCP toolkit"] --> B
  C --> E["Network and filesystem adapters"]
  D --> F["Node trace and digest helpers"]
  C --> F
```

| Module | Responsibility | Allowed effects |
| --- | --- | --- |
| `panel-schema.mjs` | Normalize contracts, enforce confirmation floors, validate arguments, summarize declarations | None |
| `infer-html.mjs` | Extract candidate actions from static HTML and create reviewable drafts | None |
| `mcp.mjs`, `score.mjs`, `canonical.mjs` | Compile descriptions, compare contracts and encode bounded JSON | None |
| `browser.mjs` | Export portable functions and async panel hashing through Web Crypto | Platform hashing only |
| `panel.mjs`, `trace.mjs` | Preserve the synchronous Node API and build or check trace digests | Node cryptography |
| `probe.mjs`, `infer.mjs`, `corpus.mjs` | Explicit network and filesystem operations | Bounded reads through documented adapters |
| `toolkit.mjs`, `mcp-server.mjs` | Expose five fixed inspection tools through the official MCP SDK | Stdio transport; no supplied action execution |
| `playground/model.mjs` | Coordinate inspection and the fixed demo search handler | Fake data lookup only |
| `playground/worker.mjs`, `app.mjs` | Isolate processing, show results and download selected JSON | Browser worker and explicit local download |

The Node entry points remain compatible. `hardwire/browser` has no Node imports,
polyfills, package dependencies, filesystem or network adapter. Its
`panelDigestAsync` produces the same SHA256 value as Node's synchronous
`panelDigest`. Both hash the same canonical normalized panel. Platform crypto
provides hashing in both environments.

## Playground data flow

A visitor searches a tiny sample catalogue, asks Hardwire to describe its form,
and calls the resulting action directly. A module worker runs the same portable
inference, normalization and validation functions as the Node library. The UI
shows one step at a time.

The direct call is a fixed application owned handler. It compares the supplied
panel digest with the original demo contract, validates arguments, then searches
fake catalogue data. The browser and Node consumer examples share that catalogue
function. No supplied endpoint chooses executable code, a URL or credentials.
This demo is deliberately capable of one real local read operation. It is not a
general action executor.

Editing arguments cancels pending work and clears old results. Each worker has
a five second deadline and can be terminated. JSON and HTML limits apply before
processing. Outputs use text nodes; the demo does not render supplied HTML.
Inputs are not persisted or sent to a server. Ordinary page delivery still uses
the hosting provider. The downloaded contract remains an inferred draft.

## Serving and distribution

`npm run demo` serves the playground at `/playground/` and keeps the original
fixture origin at `/` for probe and inference experiments. The server serves an
explicit asset allowlist. It does not expose repository files through arbitrary
paths. The packaged demo includes the same assets as the checkout.

`npm run build:playground` copies only portable source modules, static assets and
the license into `output/playground`. There is no bundler or third party script.
The public GitHub Pages workflow runs the full checks before deploying this
artifact from main. GitHub Pages must use GitHub Actions as its publishing source.
The workflow uses pinned actions and grants deployment permissions only to the
deploy job. It needs no persistent publishing token.

Rollback the demo by reverting a change on main and letting the workflow deploy
again. Package releases use immutable version tags and checksummed tarballs;
publish a new version to change a package. Do not replace existing assets.

## Verification and remaining scope

Tests cover cross runtime output and digest parity, schema enforcement, malformed
and oversized inputs, inference limits, static packaging, local HTTP serving and
installed package exports. Existing tests also cover the official MCP transport,
trace consistency and known corpus failures. Browser acceptance checks cover
valid and invalid arguments, the complete journey, changed inputs, rejection before handler execution
and responsive layout.

This is a complete foundation for describing and experimenting with actions. A
general execution system remains outside the implementation: it would need
application owned handlers, authentication, authorization, real approval checks,
result validation and retry policies. An inferred effect is a guess. A matching
digest establishes consistency, not authenticity or execution. See
[the roadmap](ROADMAP.md) for the evidence required before expanding that scope.
