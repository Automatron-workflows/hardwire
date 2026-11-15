# Working on Hardwire

Read [README.md](README.md) for the product, [MAINTAINING.md](MAINTAINING.md) for
the development loop, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before
changing module boundaries. This repository is self contained. No previous chat,
sibling repository, paid model, API key or hosted backend is needed to develop it.

## Scope and evidence

Hardwire describes and validates application actions. Inference produces a
candidate contract for review. The MCP server exposes five inspection tools;
supplied operations never become callable handlers. The three action experiment
uses fixed local handlers for sign in, an invoice and a preference.

Do not add a general executor, real authentication, payment integration, telemetry
or a hosted service as incidental cleanup. Use [the roadmap](docs/ROADMAP.md) to
choose the next bounded improvement. Keep measured evidence separate from claims:
synthetic fixtures are not real site accuracy, protocol tests are not native host
verification, and the film is not a speed benchmark.

## Work loop

1. Inspect `git status`, the current branch and recent commits. Preserve unrelated
   work. Fetch before comparing with main; do not reset someone else's changes.
2. Reproduce the problem and state the intended result before editing. Prefer
   one issue and one reviewable change.
3. Use Node 22 or newer; `.nvmrc` pins the development version. Install with
   `npm ci --ignore-scripts`. Do not change dependencies to bypass a failed check.
4. Run `npm run check:quick` while editing. It uses local dependencies and covers
   unit and integration tests, the three fixtures, saved form, API examples,
   actual MCP calls and the static site build.
5. Run `npm run check` before merge or release. It also checks a fresh installed
   package and an extracted desktop bundle. It needs registry network access.
   A quick check alone is not release evidence.
6. Record the result and any verification limit in the PR. Update documentation
   when behavior changes. Leave the next concrete task, not a vague promise.

`npm run corpus` intentionally fails the current synthetic baseline. Keep its
failures visible; the passing tests assert the known scores. Add regression tests
for behavior changes. Do not add tests that only repeat documentation wording.

## Architecture rules

Keep normalization, schema validation, inference, compilation and canonical JSON
portable and free of side effects. Node filesystem, network and hashing adapters
stay at the edge. `src/browser.mjs` must remain free of Node imports and package
dependencies. Update the static asset allowlists if a portable module is added.

Maintain closed object schemas, bounded inputs, confirmation floors and normalized
digests. Never infer reversibility or treat a digest as proof of identity,
execution or approval. Keep submitted data out of transport error messages.
Secrets and private captures do not belong in fixtures, logs or issue reports.

Fixture approvals must remain bound to the exact request and panel revision.
Cancellation, edits and duplicate calls must not dispatch. The public film must
never invoke fixture handlers. Keep the browser and terminal experiments on the
same validator and fixed handlers.

## Design rules

Preserve the approved dark composition and plain Hardwire wordmark. Keep the
headline: **Agentic actions. Without the clicks.** Show the three familiar actions
through motion and state. One primary action should be obvious at each stage.
Keep technical output behind optional inspection. Remove repetitive explanation
before useful labels, consequences, errors or recovery instructions. Use no dash
punctuation in prose; preserve syntax in commands, identifiers and URLs.

For UI changes, use `npm run dev` and check both `/playground/` and
`/playground/experiment.html`. Restart after asset edits. Inspect desktop and
390px layouts, keyboard focus, dialogs, invalid input, approval cancellation,
success, reset, pause/replay, hidden page behavior and reduced motion. A passing
source test is not browser verification. State explicitly when a browser check
was unavailable. Existing art and CSS are the visual reference.

## Publication

Use a branch and passing CI. Never replace a published tag or release asset.
Follow the release steps in `MAINTAINING.md`; record the new registry result
separately from the package release. Keep `private: true` until the owner has
verified an npm identity and intentionally chosen that distribution route.
The unscoped npm package called `hardwire` is unrelated.

Draft launch material is in `docs/LAUNCH-KIT.md`. Sending promotional messages
requires explicit outreach instructions. Do not buy stars, coordinate votes,
invent user results or equate automated downloads with adoption.
