# Development

Hardwire is MIT licensed. These instructions describe development; the same
licence covers contributions unless a file says otherwise.

Use Node 22 or newer (`nvm use` pins 24.16). The MCP transport uses the pinned
official SDK. The shared core is portable JavaScript. Node hashing and network adapters use
Node built ins. The playground needs no bundler or additional dependency.

```sh
npm ci --ignore-scripts
npm run check
```

This runs unit/CLI tests, real loopback HTTP integration tests, panel validation
and the offline API walkthrough, runnable consumer, MCP transport and package checks. The
package check builds a tarball, installs it with a fresh cache in a temporary project, then
checks its ESM exports, CLI binaries, consumer and actual MCP calls through the
installed symlink. The official SDK client is a development dependency. CI runs the
same command on Node 22 and 24. It also builds the static playground. All checks must pass before merging.
The standalone `npm run corpus`
command intentionally exits 1 on the current baseline; its expected scores and
failure modes are asserted inside the passing test suite.

When sockets are unavailable, `npm run test:unit` is a useful local subset, not
a replacement for integration tests. Never silently skip integration failures.

Keep changes small enough to review. Validate new behavior against the public
contract, add regression coverage for a real defect, and update the spec and
examples together. Do not add dependencies or an execution runtime without a
specific need and a documented boundary. Keep runtime effects out of inference
and validation modules.

For an inference fixture, add a directory with `page.html` and `expected.json`.
Label synthetic examples as synthetic. Real captures require provenance,
permission to include the content, redaction and ground truth from someone who
knows the application's behavior. Include failures rather than selecting only
pages the parser already understands.

Report a reproducible bug with the Node version, command, expected/actual output,
and the smallest sanitized panel/HTML sample. Never paste credentials or private
customer data. See `SECURITY.md` for sensitive reports.

## Playground development

Run `npm run demo` and open `http://127.0.0.1:8787/playground/`. Restart the server
after changing an asset, because it reads the allowlisted files at startup.
Walk the search, description and direct call journey. Check valid and invalid
arguments, cancellation after editing, the contract download and a narrow mobile
viewport. The fixed demo handler must reject changed panels before execution.
No endpoint should receive requests based on supplied input.

`npm run build:playground` writes the deployable site to `output/playground`.
The build contains only an explicit portable module graph and static assets.
See [architecture](docs/ARCHITECTURE.md) for deployment and rollback.
