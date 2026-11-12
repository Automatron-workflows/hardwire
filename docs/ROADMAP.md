# Foundation and next gates

## Foundation: implemented in 0.5.0

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

The library is ready for controlled experiments by the owner. It is not a
production executor or an open-source release. License selection is still open.

## Gate 1: real inference evidence — open

**Question:** does static inference save useful work on sites that did not
publish a panel?

Current baseline: **three synthetic fixtures**, blog 100, legacy 60, shop 45;
mean **68.3/100**, **1/3** pass at 80. Read structural error is **0% over two read
ports**. There is one invented mutation and no invented payment/destructive
label. Those latter labels are excluded by construction and are not evidence
that endpoints cannot pay or delete.

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
synthetic examples do not satisfy this gate. Resolve the license before inviting
external implementation contributions or promoting reusable packages.

## Release decisions still open

Follow [distribution and first deployment](DISTRIBUTION.md) for the ordered pilot,
package and client rollout. The toolkit can connect now; submitted panel operations
remain data until an application integration supplies trusted handlers.

- Choose a license; `UNLICENSED` and `private: true` remain unchanged.
- Decide whether npm distribution is useful and check/reserve an appropriate name.
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
