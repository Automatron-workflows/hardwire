# Changelog

## Unreleased

Restores the dark public demo under “Agentic actions. Without the clicks.” Three
interactive comparisons show sign in, invoice payment and settings through
cursor navigation beside direct typed actions. Explicit local approval applies
to sign in and payment; fixed handlers validate contracts and arguments before
changing fixture state. Adds replay, reset, cancellation, reduced motion support
and regression coverage for approval, duplicate dispatch and input isolation.
The cursor timing is illustrative and no external service is connected.

Preserves the calendar workflow as `examples/calendar.mjs`, including conflict
resolution, exact approval, atomic changes, undo and its existing tests. Updates
the static build, server allowlist and guides. The published 0.6.0 tag and package
remain unchanged.

## 0.6.0: 13 November 2026

Adds a browser demo with one guided journey from a catalogue search to an
inferred action contract and a direct call. Invalid inputs stop before the fixed
fake data handler runs. The new `hardwire/browser` entry point shares the same core as
Node and uses platform Web Crypto for asynchronous digests. Node APIs and format
versions remain unchanged. Adds static builds, GitHub Pages deployment, runtime
parity tests, packaged demo checks and an architecture guide. The local demo
serves the playground at `/playground/` through an explicit asset allowlist.

## Documentation update: 13 November 2026

Clarifies the purpose, mission, vision, audience and value proposition across the
README, setup guides and public release copy. Adds a concrete explanation of why
action descriptions matter and how to experiment without owning an app. Updates
distribution status to reflect the published GitHub prerelease. Runtime behavior,
format versions and the existing release assets are unchanged.

## 0.5.0 — 2026-11-12

Standalone agent access without an owned application.

- Adds `hardwire-mcp`: five fixed offline tools for panel inspection/compilation,
  HTML inference, parameter validation and panel-bound trace verification.
- Uses official MCP server SDK 2.4.0, with a separate official client dependency
  for transport tests. Core format helpers retain their built-in-only imports.
- Adds exact-path client configuration, first-task examples and troubleshooting.
- Tests actual discovery/calls, invalid inputs and installed-command startup.
  The clean-install test caught and fixed symlink-based executable detection.
- Replaces the owned-app prerequisite with a standalone toolkit distribution path.

Existing panel and trace formats are unchanged. Install dependencies with
`npm ci --ignore-scripts` before running the full checks. The toolkit does not
execute submitted ports or fetch websites. MIT licensed as of 13 November 2026;
`private: true` keeps npm publication a separate decision. Requires Node 22 or
newer; CI tests Node 22 and 24.

## 0.4.1 — 2026-11-12

Final use-readiness audit and runnable consumer pattern.

- Trace verification now rejects malformed outcome metadata and unknown record
  fields even if the digest was recomputed. With a panel it also checks argument
  shape and declared redaction. It still does not establish authenticity.
- Explicit invalid inference network options are no longer silently defaulted.
- `npm run consumer` invokes a pinned, allowlisted demo read handler, checks its
  result and records a success trace. It is not a general executor or MCP server.
- `npm run test:package` packs and installs the actual artifact offline, testing
  ESM exports, the installed CLI binary and the included consumer example.
- CI runs these checks on the exact supported Node version, uses current pinned
  actions, disables credential persistence and fixes the Ubuntu image version.
- Distribution guide distinguishes an owned-app pilot, licensed npm release and
  a future tested MCP adapter. Package name/scope availability is unverified.

Valid 0.4.0 panels and trace bytes are unchanged. Malformed traces previously
accepted by the partial verifier now fail. Extra outcome fields supplied to
`buildTrace` are rejected rather than silently discarded. License and npm
publication remain unchanged.

## 0.4.0 — 2026-11-12

Experimental foundation audit and onboarding pass.

### Added

- Offline `npm run walkthrough`, documented local demo and npm scripts.
- CLI `infer --html`, `verify --panel`, and `trace --params-file`.
- Getting-started guide, API reference, integration boundaries, development and
  security reporting instructions.
- Regression tests for contract validation, redaction, inference, scoring,
  network handling and CLI behavior; real HTTP integration checks in CI.

### Fixed

- Unsupported schema keywords are rejected rather than lost during normalization.
- Unknown contract fields, ambiguous origins/endpoints, invalid policy values,
  incompatible enums and prototype-sensitive keys fail validation.
- Closed-object defaults are emitted in MCP schemas, including nested objects.
- Trace ports resolve from their panel; optional verification binds the trace to
  the supplied panel revision. Passwords and write-only array items are redacted.
- Inference no longer treats arbitrary JSON-LD actions as reads. Password fields
  are marked write-only; candidate IDs cannot collide; unsafe endpoints are omitted.
- Scoring rejects origin mismatches and weakened effect/approval declarations.
  A property named `description` is no longer accidentally ignored.
- Invalid ground truth fails corpus validation; invalid captures cannot pass a
  zero threshold. Oversized responses are rejected instead of truncated.
- Private-host screening handles IPv6 literals without rejecting public domains
  merely starting with `fc` or `fd`. Redirect/non-text bodies are cancelled.
- CLI rejects irrelevant/duplicate flags and unexpected positional arguments.
- Documentation no longer claims execution, approval enforcement, authenticated
  receipts, real-site benchmark results or standards compatibility not implemented.

### Compatibility

Normalized panels now emit `additionalProperties: false` explicitly; panel
hashing normalizes its input. **Digests may change from 0.3.0.** Unknown panel,
port and auth fields are rejected. Invalid trace timestamps and malformed
result digests are rejected. Keep original panels/traces when testing older
versions. The draft format is not frozen.

License remains `UNLICENSED` at this point (resolved to MIT in 0.5.0); npm
publication remains disabled. No executor,
MCP transport, React SDK, WebMCP adapter or real-site accuracy claim is added.

## 0.3.0

Corpus aggregation, CLI exit-code checks and separate read-port error metrics.
