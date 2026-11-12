# Add a panel to an application

Hardwire's useful boundary is the application's real operations. Start with one
read operation on a site you control. Do not tag every button or infer that an
inferred draft is permission to call a third party.

## Publisher setup

1. Copy `examples/example-panel.json` and keep only your real operations.
2. Set the bare origin. Use stable port IDs; describe effects honestly.
3. Specify argument types and required fields. Mark secret strings `writeOnly`.
4. Validate with `node src/cli.mjs validate path/to/hardwire.panel.json`.
5. Serve that file as JSON at `/.well-known/hardwire.json` from the same origin.
6. Probe your origin and review the result. Missing unrelated markers need not
   be added just to inflate a diagnostic score.

For a React app, this can be a static asset in the app's public directory,
e.g. `public/.well-known/hardwire.json` in builds that copy public assets to the
site root. Confirm your host actually serves dot-prefixed paths and does not
replace the response with an SPA HTML fallback. No component wrapper is needed.
The library itself uses Node.js APIs and is not a browser bundle.

The format has no transport contract yet. An endpoint does not specify HTTP
method, headers, CSRF handling, body serialization or session requirements.
`auth.loginPort` is a reference to a declared port, not a login implementation.
`expects` describes a response shape but is not enforced by this release.

## Consumer setup

A trusted Node consumer can use this explicit sequence:

1. Fetch the panel under your own access and network policy. Validate it.
2. Check its origin and compare its digest with the revision you reviewed.
3. Compile descriptions, retaining the original panel alongside the tools.
4. Resolve the requested tool with `findPort`; validate arguments.
5. Apply your application's authorization, precondition and approval checks.
6. Map that port ID to a known handler. Implement retries and idempotency there.
7. Observe the result, build a trace, and retain the exact panel for verification.

The repository implements steps 2–4's format helpers and step 7's record helper.
It does not implement a generic runtime for steps 1, 5 or 6. Do not implement a
consumer as “fetch whatever endpoint the untrusted panel says.” Absolute HTTPS
endpoints can be cross-origin; a real consumer needs an explicit destination
allowlist and must never forward credentials automatically.

A reviewed `read` handler is a useful first experiment. A login + reversible
write + read-back demonstration remains a separate roadmap gate. Human approval
must bind to the port, arguments and reviewed panel revision; a string saying
`owner` is not an approval token.

## Relationship to existing standards

Checked against primary sources on 2026-11-12:

| System | Relationship |
| --- | --- |
| [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) | Hardwire produces the tool-list result shape. It implements no transport, initialization or `tools/call` handler. |
| [MCP annotation guidance](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/) | Annotations are untrusted hints unless backed by a trusted publisher and enforcement. They do not prove safety. |
| [WebMCP draft](https://webmachinelearning.github.io/webmcp/) | Browser-side JavaScript tool registration. The 2026-11-11 draft uses `document.modelContext`; older proposals used `navigator.modelContext`. No adapter is implemented here. |
| OpenAPI | Existing HTTP interface descriptions. Hardwire does not convert OpenAPI documents; the probe only checks a conventional discovery path. |

The WebMCP document explicitly identifies itself as a Community Group draft,
not a W3C Standard or a standards-track specification. Hardwire is an independent
experiment, not a competing web standard or an official extension of any of the
above. Its own discovery file and metadata vocabulary may change.
