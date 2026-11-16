# Foundation and next gates

## Next work in order

Use [the maintainer guide](../MAINTAINING.md) for the daily loop. This is the
provisional queue as of 16 November 2026. A reproducible outside user blocker
takes priority. The existing contribution issues are deliberately small enough
for a newcomer; check whether someone has claimed one before starting it.
Start recruiting the first five developers now. New synthetic fixtures are not a
prerequisite for trying the published toolkit.

The settings fixture from [issue 14](https://github.com/Automatron-workflows/hardwire/issues/14)
is implemented in [`examples/corpus/settings/`](../examples/corpus/settings/). It
has a reviewed panel and a deterministic 40/100 score; the provenance note
records which contract fields the checkbox cannot establish. The
[sign-in fixture from issue 12](https://github.com/Automatron-workflows/hardwire/issues/12)
is implemented in [`examples/corpus/signin/`](../examples/corpus/signin/) with a
measured 80/100; inference matches the reviewed effect, approval requirement,
endpoint and fields, but cannot establish that the session can be ended.

| Order | Work | Done when |
| --- | --- | --- |
| 1 | [Invoice fixture, issue 13](https://github.com/Automatron-workflows/hardwire/issues/13) | The scene has synthetic HTML and independently authored ground truth. Payment effect and approval mismatches stay visible. No payment provider is connected. |
| 2 | Five independent first attempts | Five outside developers try the saved form task. Record completion without help, first confusion and usefulness. Fix the first repeated blocker. The maintainer's own runs do not count. |
| 3 | [Native client, issue 17](https://github.com/Automatron-workflows/hardwire/issues/17), then a second desktop host | Record host, version, installation steps and actual tool results from the public release. SDK transport checks alone do not close the task. |
| 4 | [Accessibility, issue 16](https://github.com/Automatron-workflows/hardwire/issues/16) and [public Windows first use, issue 15](https://github.com/Automatron-workflows/hardwire/issues/15) | A person completes the journey and records any barriers. Automated Windows CI is already passing; independent installation and assistive technology evidence remain separate. |
| 5 | Permitted real captures and one application partner | Establish provenance and reviewed behavior for the evidence gates below before building a general execution runtime. |

Adding synthetic cases improves regression coverage. Publish the new sample
count and failure breakdown without presenting it as evidence about real sites.
The historical three-case baseline was blog 100, legacy 60, shop 45; mean 68.3,
1/3 pass. The settings case adds a deliberate 40 and moves the baseline to four
cases, mean 61.3 and 1/4 pass. The sign-in case adds a measured 80 and moves the
baseline to five cases, mean 65.0 and 2/5 pass.

## Foundation: implemented through 0.8.1

- Strict panel and schema validation, argument checks and normalized digests.
- MCP tool descriptions with the same closed-object semantics as validation.
- Static inference with evidence, draft validation and secret annotations.
- Per-case and corpus scoring with explicit failure conditions.
- Fixed-path discovery diagnostics with bounded network responses.
- Trace creation, redaction, verification and exact panel binding.
- Offline walkthrough, local HTTP demo, CLI/API guides and automated checks.
- An application-owned read-handler example and automated packed-install checks.
- A standalone offline MCP toolkit with five fixed tools, official SDK transport,
  actual client calls, installed-command tests and generated client configuration.

The library is MIT licensed and ready for controlled experiments. It is not a
production executor; application execution remains gated below.

## Distribution: implemented in 0.9.0

A versioned desktop bundle includes the inspection server and locked runtime
dependencies. It is tested after extraction, alongside the installed tarball.
A separate GitHub Actions workflow publishes its exact digest to the MCP Registry
using repository OIDC. npm publication remains optional and requires a verified
scope. None of these packaging steps satisfies the evidence gates below.

## Gate 1: real inference evidence — open

**Question:** does static inference save useful work on sites that did not
publish a panel?

Current baseline: **five synthetic fixtures**, blog 100, legacy 60, settings 40,
shop 45 and signin 80; mean **65.0/100**, **2/5** pass at 80. Read structural
error is **0% over two read ports**. There is one invented mutation and no
invented payment/destructive label. Those latter labels are excluded by
construction and are not evidence that endpoints cannot pay or delete. The
earlier three-case baseline was 68.3/100 with 1/3 passing; the settings case adds
three reviewed differences and the sign-in case adds one conservative
reversibility difference rather than regressions.

A passing case needs the numeric threshold, matching origins, no inference
error, no invented mutation, and no effect mismatch, weakened confirmation or
invented reversibility. The separate read-error metric is a structural average,
not a task-success rate or safety certification.

Next experiment: capture **30–50 permitted real pages** across multiple independent
apps, including failures and forms of different kinds. Keep a manifest with
origin, capture date, permission/provenance, redactions and human-reviewed
expected operations. Never include real credentials, private user data or
unlicensed page content in a public corpus. Author ground truth from actual app
behavior, not from the inference result.

Proposed gate: under 20% structural error on read ports, no unsafe effect or
approval downgrades in reviewed matches, and a published failure breakdown.
Report sample size and limitations; this gate alone does not authorize execution.
The synthetic baseline must stay separate from a real-site evaluation.

## Gate 2: controlled traversal — open

With a consenting application partner, complete login, read, one reversible write, and
read-back without UI navigation. Every action must have a known handler,
authorization, explicit approval policy, idempotency behavior, a checked result
and a trace bound to the reviewed panel. Inject failures and retry scenarios.

The offline consumer proves one fixed read-handler mapping, result check and
trace. It has no authentication or mutation support and does not satisfy this
gate. The local HTTP demo proves discovery, inference and a read response.
It deliberately refuses POST. It does not satisfy the traversal gate.
Before adding a generic executor, define method/serialization/credential rules
and bind approval to exact arguments and panel revision. Prefer an explicit
allowlist of local handlers for the first experiment.

## Gate 3: demand — open

First recruit users for the standalone toolkit; no app ownership is required.
Separately, find one consenting application team that wants to publish a panel or
consume one. Measure the integration work and task reliability. Stars and
synthetic examples do not satisfy this gate. The licence is resolved (MIT), so
external implementation contributions are open under it.

## Release decisions still open

Follow [distribution and first deployment](DISTRIBUTION.md) for the ordered pilot,
package and client rollout. The toolkit can connect now; submitted panel operations
remain data until an application integration supplies trusted handlers.

- Decide whether npm distribution is useful and check/reserve an appropriate name.
  The source licence is settled; removing `private: true` is a separate step.
- Design browser/WebMCP integration only against a pinned, reviewed API version.
- Review access permissions, privacy and retention for the actual deployment.
  A file format cannot grant access rights or guarantee compliance by itself.

No browser driver, credential vault, payment executor, registry or hosted service
is required for the current experiment.

## Version policy

The project is pre-1.0. Breaking behavior is documented in `CHANGELOG.md`.
0.4.0 explicitly closes object schemas and normalizes inputs before digesting;
normalized bytes and panel digests therefore change from 0.3.0. Regenerate
experimental fixtures, retain old panels with old traces, and never silently
reinterpret old records.

Before external adoption, freeze the format and canonicalization, publish fixed
test vectors, and use a new format identifier for later semantic changes. The
current `hardwire.panel/1` is still a draft, not a stable interoperability claim.
