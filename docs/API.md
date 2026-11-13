# Public API

ES modules for Node.js and browsers. The MCP server uses the official SDK. Import from `hardwire` after a local
package install, or from `./src/index.mjs` inside the checkout. Subpath exports
are listed in `package.json`. Functions are synchronous unless marked async.

## Contracts and arguments

| Export | Inputs → result |
| --- | --- |
| `normalizePanel(input)` | Raw JSON object → validated, sorted panel with explicit defaults. Throws `HardwireError`. |
| `normalizeOrigin(origin)` | Bare HTTPS origin, or local HTTP origin → normalized origin. No network or private-host check. |
| `panelDigest(panel)` | Raw or normalized panel → `sha256:` plus 64 lowercase hex digits. Normalizes before hashing. |
| `auditPanel(panel)` | Raw or normalized panel → declared effect/confirmation counts and unconfirmed mutation IDs. |
| `validateParams(port, params)` | **Normalized** port and JSON arguments → independent validated copy; throws on mismatch. |
| `HardwireError` | Error with `code`, `path`, `detail`, `message`. See the spec's error table. |

Normalize panels at the trust boundary. Unknown panel, port, auth and schema
fields fail validation. This catches misspelled policy fields. The schema subset
is deliberately smaller than JSON Schema; unsupported constraints fail closed.
`expects` is descriptive only: no result-validation API exists yet.

Constants: `PANEL_VERSION`, `PANEL_FILENAME`, `DISCOVERY_PATH`, `PANEL_LIMITS`,
`KINDS`, `CONFIRMATIONS`.

## Tool descriptions

| Export | Result |
| --- | --- |
| `compilePanel(panel)` | Array of MCP-shaped tools with names, descriptions, input schemas and risk hints. |
| `toolsListResponse(panel)` | `{ tools: compilePanel(panel) }`, the result body of `tools/list`. |
| `findPort(panel, toolName)` | `{ tool, port }` with a normalized port, or `undefined`. Validates the panel. |
| `toolName(portId)` | Maps a valid port ID such as `search-catalogue` to `search_catalogue`. |

Tools contain no executable handler. `confirmation`, `preconditions`, endpoint
mapping and authentication must be enforced by a separate consumer. MCP hints
must not substitute for reading and validating the panel. In particular, a
payment is not emitted with a claim that it cannot be destructive.

## Traces

```js
const trace = buildTrace({
  panel, port: 'search-catalogue', params: { query: 'lamp' },
  outcome: { status: 'unknown' },
  actor: 'local-experiment', at: '2026-11-12T10:00:00.000Z'
});
verifyTrace(trace);            // digest and strict record-shape checks
verifyTrace(trace, { panel }); // also panel binding, argument shape and redaction
```

`buildTrace` accepts a raw or normalized panel and a port ID or port object. It
resolves the port from the panel; caller-supplied port metadata cannot override
it. Arguments are validated and declared write-only strings are redacted.
`at` defaults to now, `actor` to `agent`, and outcome status to `unknown`.

Outcome status is `succeeded`, `failed`, `unknown` or `refused`. Optional `code`
is a non-empty string of at most 128 characters. Optional `resultDigest` is a
SHA-256 digest string. No response body is recorded. All outcomes are assertions
by the caller; none are independently observed by this package.

`verifyTrace` returns false for a changed record or a mismatch with the supplied
panel. With a panel it validates the recorded argument shape, including required
fields, and requires `[redacted]` at declared write-only positions. Secret enums
are replaced by that marker for this check; original secrets cannot be recovered
or validated from the record. Unknown trace/outcome/port fields are rejected.
It does not establish identity, approval, execution, or authenticity.
It cannot reconstruct redacted values. Two otherwise identical records that
differ only in redacted secrets intentionally have the same digest.

Lower-level exports: `traceDigest(document)` hashes everything except its own
`digest` field; `redactParams(schema, value)` redacts without validating;
`canonicalJson(value)` serializes the documented bounded JSON subset.
`TRACE_VERSION` names the trace format. Low-level helpers are not validators.

## Inference, scoring and discovery

| Export | Inputs → result |
| --- | --- |
| `inferFromHtml(html, { origin })` | Static HTML → candidate report with evidence and limitations. No network. |
| `inferFromUrl(origin, options)` **async** | Fetch origin root once → inference report. |
| `toPanelDraft(inference)` | Candidate report → normalized draft panel; rejects empty or invalid drafts. |
| `comparePanels(expected, actual)` | Two panels → structural score, missing/invented ports and unsafe differences. |
| `passes(result, threshold = 80)` | True only if score meets threshold, origins match, and no error, invented mutation or unsafe difference exists. |
| `scoreCorpus(cases, { threshold = 80 })` | Non-empty array of `{ name, expected, html }` → aggregate and per-case results. |
| `probeOrigin(origin, options)` **async** | Fixed-path discovery report, score and network findings. |
| `assertPublicOrigin(origin, { allowPrivate = false })` | Bare origin → screened origin. Hostname/literal screening only, not DNS resolution or rebinding protection. |
| `fetchPage(url, options)` **async** | Low-level bounded GET → status, body, content type and optional error. **Does not screen the target**; validate it and apply network policy before use. |

Network options: `fetchImpl` (default global fetch), `timeoutMs` (default 6000,
integer 1–120000), and `allowPrivate` for `probeOrigin` / `inferFromUrl` only.
Bodies over 512 KiB fail instead of parsing a truncated prefix. Redirects are
not followed. DNS/network errors are findings for the probe; inference throws
if it cannot fetch usable HTML. Do not expose these developer helpers as an
untrusted multi-tenant URL-fetch service.

The probe validates the Hardwire panel only. Other discovery markers are weak
presence signals, not verified protocol implementations. The `webmcp` heuristic
matches source text, including older API spellings; it cannot see tools registered
at runtime. `robots.txt` handling reports a blanket wildcard disallow and caps
the score. It is not a complete robots policy engine or authorization check.

Scoring compares kind, confirmation, reversibility, endpoint and parameter
structure with equal weight. It ignores prose, preconditions, result schemas,
and business correctness. A score is a development diagnostic, not a full
contract equivalence test. Origin mismatches, effect changes, lower confirmation,
invented reversibility, and invented mutations always fail the pass predicate.

Other exports: `DEFAULT_THRESHOLD`, `INFERENCE_VERSION`, `SIGNALS`,
`ROBOTS_CAP`, `WEBMCP_WEIGHT`. Discovery paths and weights are experimental.

## Browser entry point

After installing the release package, a browser bundler can use:

```js
import { inferFromHtml, toPanelDraft, compilePanel, panelDigestAsync } from 'hardwire/browser';
const draft = toPanelDraft(inferFromHtml(html, { origin: 'https://example.com' }));
const tools = compilePanel(draft);
const digest = await panelDigestAsync(draft);
```

This entry point exports panel normalization, argument validation, auditing,
canonical JSON, static HTML inference, draft creation, MCP compilation and panel
comparison. It has no Node imports or runtime dependencies. Hashing is asynchronous
and requires Web Crypto in a secure browser context such as HTTPS or localhost.
There is no browser export for URL fetching, corpus filesystem reads or traces.
The Node API is unchanged. See [architecture](ARCHITECTURE.md) for the exact
module boundaries.
