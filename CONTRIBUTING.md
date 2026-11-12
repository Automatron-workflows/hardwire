# Development

The repository's license has not been chosen. These instructions describe the
owner's development workflow; they do not grant outside reuse rights or invite
code contributions under an unspecified license.

Use Node 24.16+ (`nvm use`). The MCP transport uses the pinned official SDK.
The core format modules still use only Node built-ins; no build step is needed.

```sh
npm ci --ignore-scripts
npm run check
```

This runs unit/CLI tests, real loopback HTTP integration tests, panel validation
and the offline API walkthrough, runnable consumer, MCP transport and package checks. The
package check builds a tarball, installs it offline in a temporary project, then
checks its ESM exports, CLI binaries, consumer and actual MCP calls through the
installed symlink. The official SDK client is a development dependency. CI runs the
same command on the exact `.nvmrc` version. All checks must pass before merging.
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
