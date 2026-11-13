# Distribution and product positioning

## What we are offering

**Make software understandable to AI agents.**

Hardwire helps developers describe application actions and check their inputs,
declared effects and approval requirements before connecting those actions to
an agent. The first product is a local toolkit for inspecting and validating
these descriptions. It works with supplied HTML and JSON, so trying it requires
no app ownership or hosted service.

**Mission:** Make application actions explicit, reviewable and reusable for
people building AI agents.

**Vision:** A web where people can delegate tasks to agents through clear
operations, while applications retain control over access and approvals.

**Value proposition:** Developers get a shared action contract they can inspect
and test. They can catch invalid arguments and contradictory declarations before
connecting an agent to application code. The toolkit helps prepare an integration;
it does not establish that a described endpoint behaves safely.

The [README](../README.md) is the public overview. [MCP setup](MCP.md) takes a
reader from installation to a concrete experiment.

## Public description

Use this description in directories and repository summaries:

> Describe and validate application actions for AI agents. Open source tools for
> reviewing inputs, declared effects and approval requirements.

For a longer introduction, explain why, what and how in that order:

1. An agent integration needs to know what an action expects, what it changes and
   which approvals apply.
2. Hardwire provides a JSON action format, validation tools and a local MCP server
   for inspecting those declarations.
3. Supply HTML or an action description, review the draft and check example
   arguments before connecting trusted application code.

Use ordinary language first. Introduce a panel as an action description and a
port as one action. Keep the vision distinct from features that exist today.
Write prose without dash punctuation. Preserve required syntax in commands,
identifiers and links.

## Current distribution

| Item | State |
| --- | --- |
| Browser playground | [Try it without installation](https://automatron-workflows.github.io/hardwire/) |
| GitHub prerelease | [0.6.0](https://github.com/Automatron-workflows/hardwire/releases/tag/v0.6.0) |
| Download | Installable package and SHA256SUMS attached to the release |
| Verification | The uploaded package was downloaded, checked and installed with real MCP calls |
| Source license | MIT |
| MCP transport | Local stdio server using official SDK 2.4.0 |
| npm package | Not published; `private: true`; package identity is not reserved |
| MCP Registry listing | Not submitted |
| External adoption | Not yet established |

## First experiment to share

Share the [playground](https://automatron-workflows.github.io/hardwire/) as the
first experience. A visitor requests a calendar change, reviews a conflict free
proposal, approves the batch and sees the meetings move. Undo and an expandable
action log make the outcome inspectable. This uses local sample data and needs no
installation. Developers already using an MCP client can then follow
[the setup guide](MCP.md#first-task). They should infer a draft, review its declared
rules and test invalid arguments. This demonstrates a useful workflow without
requiring an application integration.

The release page contains installation instructions and a downloadable package.
Use its exact version link when sharing a reproducible experiment. Public
availability is established; independent usage and demand still need evidence.

## Preparing later releases

`npm run release:prepare` builds a package and checksum locally. The GitHub Actions
`prepare-release` workflow runs the full checks on main, creates a draft release,
downloads its assets, verifies the checksum and tests the downloaded package in a
fresh installation. Publish the draft after the workflow passes. This process
uses GitHub and does not publish to npm.

Use a new version for a changed package. Editorial changes to a release page do
not replace its existing tag or downloadable assets.

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
toolkit without controlling a website. Use the published release and the setup
example to seek three independent evaluations.

Measure whether people connect without help, complete the first task, understand
limitations and return for a second project. Record client/version, setup time,
failed commands and useful findings. Use voluntary feedback; there is no built in
tracking. Downloads, directory presence and stars do not establish demand.

Obtain explicit outreach instructions before sending promotional messages.
Potential channels are the MCP Registry, relevant developer directories and a
technical demo post. Describe supported features and measured results. Do not promise universal
compatibility, automatic login, proven safety or speed gains without evidence.

## Application execution after a partner exists

With a consenting app team, start with three explicit read handlers behind its
existing authorization. Add one reversible write with approval bound to exact arguments,
idempotency and verification of the resulting state. The partner owns handlers and credentials.
Inspecting a contract does not grant permission to execute it.

Sources checked 2026-11-12:
[MCP Registry](https://modelcontextprotocol.io/registry/quickstart),
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[MIT license](https://choosealicense.com/licenses/mit/).
