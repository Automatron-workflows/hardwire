# Distribution without owning an app

## The first product

Hardwire 0.5.0 is a local MCP toolkit for inspecting agent interfaces. Its five
fixed tools process supplied HTML, panels, arguments and traces. A user can
connect it to a local MCP host without building an app or running a service.
See [MCP setup](MCP.md) for a first task and exact-path client configuration.

Application execution remains a later partner integration. The toolkit does not
log in, operate arbitrary websites or make inferred descriptions executable.
Keep this distinction in every listing.

## Release status

| Item | State |
| --- | --- |
| GitHub source | Public under Automatron-workflows/hardwire |
| MCP transport | Implemented with official SDK 2.4.0 |
| Clean installation | CI installs the packed artifact and exercises its MCP command |
| Public reuse license | MIT, chosen by the owner on 13 November 2026 |
| npm package | Not published; `private: true`; unscoped name is not reserved |
| MCP Registry listing | Not submitted |
| External users or measured demand | Not established |

## First distribution: GitHub

GitHub is already available and needs no new npm account or paid hosting.

1. The license is resolved: MIT. The release proposal and decision are recorded
   in [the release decision](RELEASE-DECISION.md).
2. Run the checks from the committed lockfile. Create the experimental `v0.5.0`
   tag and a GitHub prerelease with the tested package and SHA-256 checksum.
   Use [the prepared release notes](releases/v0.5.0.md).
3. Verify the exact downloaded asset in a fresh directory with an MCP client.
   Link the source, license, setup and limitations.
4. Offer one concrete experiment: infer a panel from a small saved HTML page,
   inspect it, and identify which declarations need review.

This document does not publish a release. Do not advertise a tag, asset URL,
package name or registry listing before it exists and has been verified.

`npm run release:prepare` builds a local package and checksum for owner review.
Run the GitHub Actions `prepare-release` workflow on main. It checks the license,
runs the full suite and creates a **draft** prerelease with assets. It then
downloads those assets, verifies the checksum and tests the downloaded package
in a fresh installation, including actual MCP calls. Publish the draft only
after this workflow passes. This does not publish to npm or require an
npm account. The workflow refuses a package with no reuse license.

## Then npm and discovery

Verify an npm account/scope controlled by the owner. `@automatron-workflows/hardwire`
is a candidate, not a verified identity. Rename the package and regenerate its
lockfile, retain MIT license metadata, and remove `private: true` only for the
intentional package release. Never direct users to `npm install hardwire`, which
can resolve to unrelated software.

Publish an experimental exact version and verify installing it from the registry.
Then configure trusted publishing for the specific repository and workflow.
Keep npm tokens out of source, examples and issue reports.

The MCP Registry lists server metadata, not package artifacts. The npm route
needs a published package, matching `mcpName`, `server.json` and verified namespace
ownership. A GitHub source link alone is insufficient. MCPB bundles are a possible
later alternative; do not claim a bundle exists until its installation is tested.
No hosted endpoint is needed for a local package.

## Reach the first users

Start with developers already using MCP and browser automation. They can try the
toolkit without controlling a website. Publish the release and a reproducible
demo, then seek three independent evaluations.

Measure whether people connect without help, complete the first task, understand
limitations and return for a second project. Record client/version, setup time,
failed commands and useful findings. Use voluntary feedback; there is no built-in
tracking. Downloads, directory presence and stars do not establish demand.

Obtain explicit outreach instructions before sending promotional messages.
Potential channels are the MCP Registry, relevant developer directories and a
technical demo post. Avoid universal-compatibility, automatic-login, proven-safety
or unmeasured-speed claims.

## Application execution after a partner exists

With a consenting app team, start with three explicit read handlers behind its
existing authorization. Add one reversible write with argument-bound approval,
idempotency and read-back verification. The partner owns handlers and credentials.
Inspecting a contract does not grant permission to execute it.

Sources checked 2026-11-12:
[MCP Registry](https://modelcontextprotocol.io/registry/quickstart),
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[MIT license](https://choosealicense.com/licenses/mit/).
