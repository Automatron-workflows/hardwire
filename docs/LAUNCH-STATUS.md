# Launch status

Evidence updated 17 November 2026. Dated measurements below retain their original
observation date. Public availability is not evidence of outside
adoption. The first invitation remains: run one action, change one input and share
the first confusing moment.

| Requirement | Evidence | Remaining work |
| --- | --- | --- |
| Three coherent examples | Sign in, invoice and settings share the film's artwork and one action journey | Observe five independent first attempts |
| One command | Versioned GitHub package includes `hardwire-experiment` and `hardwire-form`; fresh installation checked by CI. On 16 November, a clean `npm install github:Automatron-workflows/hardwire#v0.9.0` ran the three-action experiment and inferred a saved HTML form through `hardwire-form`; the no-checkout `npx` MCP configuration was checked with the official SDK client at release | npm shortcut after scope verification |
| Positive and negative input | All three local handlers reject invalid input; saved settings form checks boolean versus string; the six-case synthetic corpus pins the settings checkbox contract at 40/100, the sign-in reversibility gap at 80/100 and the invoice payment floor at 40/100 | Outside captures and bug reports |
| Keyboard path | Chrome 157 on macOS completed all three scenes by keyboard: selection, invalid input, approval, next example, reset, and the inspector's trap, Escape and focus return. Reduced-motion styles applied, 640 and 390 CSS pixel widths had no horizontal overflow, and Lighthouse 13.4.1 scored accessibility 100 | Named screen reader and outside report (issue 16) |
| Three MCP clients | Official SDK 2.4.0, Inspector 2.0.0 and Codex CLI 0.145.0 exercise the protocol; Codex discovered and called all five tools with synthetic data | Independent outside Codex report and two desktop host workflows remain unverified |
| README first experience | Actual GIF, exact release command, live experiment and adoption guide near the top | Observe comprehension with new visitors |
| Execution boundaries | Local fixtures disclosed; form inference never calls an endpoint | A consenting application integration |
| Community | Discussions enabled, welcome pinned, five scoped issues, templates and guidelines | Replies and reviewed outside contributions |
| Desktop distribution | MCPB includes locked production dependencies; extracted server and exact artifact digest checked | Native host installation feedback |
| MCP Registry | 0.9.0 is active as `io.github.Automatron-workflows/hardwire`; public entry matches the release bundle digest | Observe discovery and independent installations |
| npm | Separate optional distribution route | Authenticated publisher and verified scope |
| Discovery | Repository description, topics, release, Pages site and adoption guide in place. Glama listing is live; entries were submitted to [awesome-mcp-devtools #470](https://github.com/punkpeye/awesome-mcp-devtools/pull/470) and [awesome-mcp-servers #19588](https://github.com/punkpeye/awesome-mcp-servers/pull/19588), both passing their checks. | Directory acceptances and one independent report. A submitted listing is not adoption. |
| Outside evidence | GitHub traffic in the last 14 days: 42 views from 4 unique visitors, 860 clones from 237 unique cloners, 0 referrers. Clones are not users. | An outside person completes a run and reports it |

## Discovery baseline

The 15 November check still found zero stars and zero forks. Main CI and Pages
were passing, and the five open contribution issues had no outside replies. The public
saved-form invitation is
[discussion 28](https://github.com/Automatron-workflows/hardwire/discussions/28);
no independent completion has been recorded yet. The next evidence target is
five independent completions, rather than another packaging milestone. Follow
[the maintainer guide](../MAINTAINING.md) to continue daily work without previous
chat context.

The repository is publicly available, but discovery is not established. On 14
November 2026 it had zero stars and zero forks. GitHub reported 39 views from one
unique visitor, 232 clones from 69 unique cloners and no referrers. Most clones
are consistent with automated checks, not people. These numbers are a baseline,
not adoption evidence.

## Verified behavior

The three action runner checks invalid input, confirmation requirements, state
readback and duplicate rejection. The form runner checks inferred input types,
multiple form selection and failed negative samples. Packaging verifies both
installed binaries, ESM exports and actual MCP calls. Bundle checks validate the
manifest, dependency allowlist, licenses and settings task after extraction.
CI covers Linux on Node 22 and 24 and Windows on Node 24.

The 0.8.0 browser review exercised the three local outcomes, invalid requests, explicit
consent, exact invoice approval and keyboard activation. Desktop and 390px checks
retain one primary action and the same dark composition. Detailed JSON and input
editing remain optional. These checks do not establish complete accessibility or
first time comprehension. The 0.9.0 update preserves the interaction and artwork;
its preview metadata is checked in the built HTML. On 16 November, a maintainer
completed the three-scene journey in Chrome 157 by keyboard, confirmed the
inspector's focus trap and focus return, reduced motion, and no horizontal
overflow at 640 and 390 CSS pixel widths. The check also found and fixed
redundant live-region writes while typing. No screen reader was used. The design
harness collector could not run in the browser's restricted evaluation scope;
direct DOM checks are separate evidence.

VS Code did not become controllable through this session's native app interface.
On 14 November, a Codex 0.145.0 app-server attempt stopped before initialization.
On 16 November, a maintainer-run Codex CLI 0.145.0 check using a temporary MCP
override discovered and called all five tools with synthetic data. This is a
maintainer CLI protocol check, not an independent outside report or a desktop
UI compatibility claim.

## Owner steps for npm

Authenticate npm on the publishing machine and identify the Automatron owned
scope. Do not send a token in an issue or chat. The proposed
`@automatron-workflows/hardwire` identity is not yet verified. Keep `private: true`
and the current GitHub commands until ownership, scoped packaging and a fresh
registry installation have been checked.

The MCPB route can publish to the MCP Registry independently of npm. Registry
availability and stars must not be represented as proof of accuracy, safety or demand.

## Release recovery

The 0.7.1 release completed after the interrupted session resumed. Future
manually triggered release workflows create a draft, download and verify its
assets, test the uploaded package and then publish it in the same workflow.
Failed checks leave the draft unpublished. Existing version assets are never
replaced with a different build.

## 0.9.0 publication evidence

[Release](https://github.com/Automatron-workflows/hardwire/releases/tag/v0.9.0),
[registry publication](https://github.com/Automatron-workflows/hardwire/actions/runs/43634329672)
and [cross platform CI](https://github.com/Automatron-workflows/hardwire/actions/runs/43634230456)
completed successfully on 14 November 2026. The registry reports the version as
active and latest. Its bundle digest matches the public download. Both public
CLI experiments passed, and the downloaded bundle passed extraction and actual
MCP calls. Website preview metadata and its image URL are live.

The Windows check caught a silent saved form CLI failure caused by inconsistent
entry path resolution. Both entry paths now use the same resolver, and the
installed command passes Windows CI.

A direct npx client launch timed out while downloading in this environment.
Its subprocess did not inherit the network proxy settings used by the successful
terminal install. Forwarding the normal proxy settings made the same public npx
configuration pass all five MCP tool checks, including the settings task.
Desktop bundles and installed entry points avoid startup downloads. Native desktop host verification remains open.

## Maintainer continuity

The source checkout now includes `AGENTS.md`, a daily workflow, an ordered queue
and release recovery instructions. `npm run check:quick` runs the local suite;
`npm run check` adds the fresh installation and bundle checks. Both passed on
16 November, including 146 unit tests, five HTTP integration tests and actual
MCP calls. The browser workflow runs the playground tab-order, experiment and
film checks in headless Chrome; the local Chrome 157 check and the Ubuntu job
passed. The settings, sign-in and invoice corpus fixtures add regression tests
and keep the six-case baseline visible. The `npm run dev -- --port 0` entry point
was started and both page routes returned successfully. No screen reader, real
Windows machine or outside user was involved, so those evidence gates remain
open.

Weekly dependency proposals and completion feedback fields are configured. The
published 0.9.0 artifacts remain immutable; maintainer changes live on main and
are listed as unreleased. No promotional messages have been sent by this work.
