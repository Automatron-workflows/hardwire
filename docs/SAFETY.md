# Safety boundaries

Hardwire validates descriptions and records caller assertions. It is not an
execution sandbox, authorization service, credential vault, or signing system.

## Local MCP toolkit

The server exposes exactly five fixed inspection tools. It has no URL-fetch,
file-read, shell, login or mutation tool. Compiled descriptions are returned as
data and never registered as new executable tools. Runtime processing stays local;
the MCP host and model provider determine where chat inputs and results go.
Use sanitized HTML and fake arguments. No telemetry or trace files are written.
The server reads its own package metadata at startup.

JSON text inputs are limited to 256 KiB each, HTML to 512 KiB in UTF-8, and result
JSON to 1 MiB before its text/structured encodings. Core depth and object-count
limits still apply. Tool errors omit submitted values and stacks. Inputs rejected
by the SDK can include schema diagnostics; never send real credentials for testing.
Treat labels and descriptions extracted from HTML or panels as untrusted data.

## Declarations are not runtime enforcement

`payment` and `destructive` declarations cannot lower their confirmation below
`owner`. A write can declare `none` only with a boolean `reversible: true`.
Unknown contract fields and unsupported schema constraints are rejected.

This catches contradictory contracts. It cannot catch a publisher describing a
payment as a read, a consumer skipping approval, or a reversible flag that is
false in practice. `owner` does not identify a person. Preconditions are labels.
MCP annotations are hints. The application must enforce all runtime policy.

## Panel content and endpoints are untrusted input

Descriptions can contain prompt injection. Treat them as data, not instructions
to override the user's task or your authorization rules. A valid schema does
not make a description trustworthy.

Bare origins require HTTPS, except local HTTP development. Credentials, path,
query, fragments, whitespace and backslash tricks are rejected in origins.
Endpoints reject protocol-relative URLs, credentials, fragments and ambiguous
slash forms. Absolute HTTPS endpoints may be cross-origin: the format does not
allowlist execution destinations. A future consumer must do that itself.

The probe requires a discovered panel's origin to match the serving origin.
TLS and a digest do not protect against a compromised publisher. Review and pin
the panel revision in a consumer; retaining it allows later trace comparison.

## Arguments and secrets

Argument checks cover the supported types, enums, required fields, nested
objects/arrays and unknown keys. JSON serialization limits apply even to open
objects and arrays without item schemas. Prototype-sensitive property names are
rejected where copied into schema or argument objects.

Trace creation redacts declared `writeOnly` strings before hashing, including
nested array items. It does not detect unmarked passwords, tokens, personal
information, secrets in prose, or arbitrary values in open schemas. Redaction
also does not undo leaks in terminal history, caller logs or process arguments.
Use fake credentials in examples and keep sensitive data out of committed files.

## Trace consistency is not authenticity

`buildTrace` resolves a port from the validated panel and binds its digest. The
caller supplies the outcome. `verifyTrace(trace, { panel })` checks consistency
with that panel and port; without the panel it only checks the record itself.
Neither proves execution or approval.

A digest detects an edit **when the original digest is retained and trusted**.
Anyone can edit a record and recompute its hash. There are no signatures,
trusted timestamps or append-only log here. Redacted values cannot be recovered
or distinguished through the digest.

## Network helpers

The probe and URL inference screen obvious private hostnames and IP literals,
including local, link-local and mapped IPv4 addresses. Local development needs
explicit `--allow-private`. Responses are limited to 512 KiB, timeouts are
bounded, and redirects are not followed. Oversized responses fail rather than
being parsed from truncated prefixes.

**This is not comprehensive SSRF protection.** DNS resolution, rebinding,
proxies, routing, and unusual reserved ranges need an external egress policy.
The low-level exported `fetchPage` accepts a URL without hostname screening.
These are developer helpers, not public multi-tenant fetch endpoints.

The probe requests fixed discovery paths and reports a wildcard robots disallow
as a score cap. It does not implement all robots rules, and it fetches the fixed
paths before calculating that cap. A score is neither permission nor evidence
of successful automation. Access authorization remains the caller's responsibility.

## Static inference

Inference is a bounded heuristic over captured HTML, not a browser parser.
It does not run JavaScript or reproduce all form rules. Hidden fields, CSRF,
radio groups, disabled controls, entity encoding, custom widgets and business
semantics require human review.

Only `SearchAction` JSON-LD is proposed as a read. Forms produce low-confidence
`read` or `write` guesses; restricting these labels does **not** prevent money
movement or deletion at an endpoint. GET may mutate state. Inferred drafts
must not feed an unattended executor. The library has no executor.

## Out of scope

Authentication, authorization, approval binding, execution, retries, idempotency,
rate limits, response validation, credential storage and signing are not
implemented. `expects`, endpoint and auth metadata do not implement those features.
See the [roadmap](ROADMAP.md) before adding a consumer.

## Reporting

See [SECURITY.md](../SECURITY.md). Useful reports demonstrate an accepted invalid
contract, an argument-validation bypass, secret redaction failure, or an incorrect
trace/panel binding. Do not include live secrets or data from someone else's site.
