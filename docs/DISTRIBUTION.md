# Distribution and first deployment

## What is ready now

0.4.1 is usable by the owner as a Node.js contract, validation, inference and
trace library. `npm run consumer` proves one fixed read operation can execute
through an application-owned handler. `npm run check` also installs the actual
packed artifact in a clean temporary project and exercises its exports and CLI.

It is not yet a product that can be connected to an agent client and operate
arbitrary websites. There is no transport, identity service or general executor.
Public GitHub visibility does not provide a reuse license: `UNLICENSED` and
`private: true` are deliberate release blockers, not installation bugs.

## First working deployment

Use one application we control and an existing backend operation. Do not start
by tagging every UI element, handling third-party credentials or building a registry.

1. Publish a reviewed panel for three useful read operations: search, fetch one
   record, and read status. Keep auth tokens and private data out of the panel.
2. Copy the consumer pattern into the app's trusted backend. Map each stable port
   ID to an existing service function; scope every read to the authenticated user.
   Bind the accepted panel revision to deployment configuration.
3. Add a small MCP adapter using a pinned official SDK. Implement initialization,
   `tools/list` with Hardwire descriptions, and `tools/call` with known handlers.
   Use stdio for the first local client; introduce remote hosting only when needed.
   Remote authentication and authorization are additional deployment work.
4. Connect one supported MCP client and complete actual user tasks. Record the
   client, adapter/SDK version, app revision, failures and observed results.
5. Add exactly one reversible write after the read path works. Require explicit
   authorization and approval bound to the user, port, arguments and panel digest.
   Implement idempotency, a checked result and read-back in the application.
6. Test denied access, cross-user access, a changed panel, invalid input, timeout,
   repeated calls and refused approval. Treat untrusted results as data.

Acceptance target for this owned-app pilot: at least 20 recorded read tasks with
checked results, all denial cases refused, and no duplicate effect under a retried
write. These are proposed targets, not measurements already achieved. This does
not replace the separate real-page inference evaluation in ROADMAP.md.

Login should use the app's established authentication flow and scoped session.
A declared login port is not a reason to collect passwords in prompts or traces.

## Release the library

1. **Choose the license.** The owner must choose the permissions granted to outside
   users. Add the matching LICENSE file and package metadata. This document does
   not select a license or grant those rights.
2. **Choose an owned npm scope.** Candidate: `@automatron-workflows/hardwire`.
   Availability and ownership are unverified; the GitHub organization does not
   automatically own that npm scope. Do not advertise `npm install hardwire`.
3. Update the package name and install examples, remove `private: true` only for
   the release, run `npm run check`, and inspect `npm pack --dry-run` for unintended
   files. Freeze canonicalization test vectors before interoperability claims.
4. Publish a versioned experimental release and tag it on GitHub. Verify installing
   that exact version from npm in a clean project; do not rely only on the checkout.
5. For ongoing releases, configure npm trusted publishing from the specific
   GitHub repository/workflow, with provenance and release checks. Account/scope
   ownership and first-package setup must be resolved before this can work.
   Keep release credentials out of the repository.

No publishing workflow is enabled by this audit. Publishing still requires the
license, package identity, account access and an explicit release action.

## Distribution to developers and agent users

| Audience | Deliverable | Evidence needed before promoting it |
| --- | --- | --- |
| Application developers | Licensed npm library, GitHub README and one small integration example | Fresh install and the owned-app pilot work end to end. |
| Agent users | Runnable MCP adapter with client setup instructions | Tested `tools/list` and `tools/call` in one real client. |
| Additional integrators | A concise case study and a reproducible failure report | Three independent teams can integrate without bespoke patches. |

The MCP Registry is a discovery layer for actual MCP servers; it does not host
the package or convert a JSON panel into a server. List the adapter only after
it exists and its artifact or remote endpoint is available. Do not list the
current core library as an operational MCP server.

Start with direct onboarding of three teams that own both an app and its agent
integration. Measure time to first successful task, integration code required,
task success, denied unauthorized calls and repeated use after one week. Publish
the measured before/after workflow and a short recording. Broader developer
announcements should link to that evidence and an installable artifact. Stars,
registry presence and a synthetic score are not adoption.

The initial promise should be narrow: **expose a few real application operations
as validated agent tools without teaching the agent to navigate the UI**. Avoid
claims of universal compatibility, automatic login or unmeasured speed gains.

## Sources checked on 2026-11-12

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/): OIDC-based
  release authentication and provider configuration.
- [MCP Registry publishing quickstart](https://modelcontextprotocol.io/registry/quickstart):
  metadata, underlying artifacts, identity verification and server publication.
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools):
  tool discovery and calls. Core Hardwire implements descriptions only.
