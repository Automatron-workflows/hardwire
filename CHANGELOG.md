# Changelog

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

License remains `UNLICENSED`; npm publication remains disabled. No executor,
MCP transport, React SDK, WebMCP adapter or real-site accuracy claim is added.

## 0.3.0

Corpus aggregation, CLI exit-code checks and separate read-port error metrics.
