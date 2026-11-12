# Roadmap and gates

Hardwire is a hypothesis with tests, not a product. This file lists what would
have to be true before it deserves an adopter, in the order that matters.

---

## Gate 1 — Inference accuracy

**Claim under test:** a panel can be derived from a page well enough to be
useful without cooperation.

**Measurement:** take N real sites with forms. Infer a panel. Hand-write the
panel a competent engineer would publish. Score the difference: ports missed,
ports invented, wrong effect class, wrong parameter type, wrong required set.

**Pass condition:** zero invented `payment` or `destructive` ports across the
sample (guaranteed by construction), and under 20% structural error on `read`
ports.

**State:** harness built (`hardwire score`), one recorded fixture at **45/100**.
The corpus does not exist yet, so there is no error rate to report.

## Gate 2 — One real traversal

**Claim under test:** an agent can complete an actual task through a panel.

**Measurement:** one task on a surface we control — log in, read a value, perform
one reversible write, read it back — executed through compiled tools, with every
step traced.

**Pass condition:** the task completes without the agent reading the DOM, and
the traces verify against the panel digest.

**State:** not started. The repository contains no executor by design.

## Gate 3 — External demand

**Claim under test:** someone who does not own this repository wants either to
publish a panel or to consume one.

**Measurement:** a request from a third party, or a published panel not written
by us.

**Pass condition:** one. Not a star, not a message of encouragement — an
implementation or a question with a real site behind it.

**State:** none.

## Gate 4 — Legal review

**Claim under test:** the format cannot be used as a ToS workaround.

**Measurement:** a written assessment of whether publishing a panel changes any
obligation a site already has toward automated access.

**Pass condition:** a review, by someone qualified, that says the format is
neutral with respect to access permission.

**State:** reasoning only.

---

## Between now and Gate 1

Cheap work that reduces uncertainty without committing to a direction:

- [x] A scoring harness: run `infer` on a captured page, diff it against a
      hand-written panel, emit a score. `hardwire score --expected … --infer …`.
- [ ] A corpus loader: capture pages, hold the expected panel next to each, and
      aggregate the scores into one report.
- [ ] A `probe --batch` mode over a list of origins, producing one JSON report.
- [ ] Publish a panel for one surface we control and serve it at the discovery
      path, so `probe` can be validated against something real.
- [ ] Decide the licence.

## Explicitly not planned

- A browser driver. If Hardwire needed a browser it would have failed.
- Credential storage or a session vault.
- Payment execution.
- A crawler. `probe` checks fixed paths; it does not enumerate.
- A hosted registry, until Gate 3 passes.
- Any claim of standards status. WebMCP is the standards track; Hardwire should
  compile into it if it wins, not compete with it.

## Version policy

`0.x` means the format may change without notice. After Gate 2, treat
`hardwire.panel/1` as frozen and add `hardwire.panel/2` for breaking changes;
never mutate a version that has been published.
