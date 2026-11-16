# Build Hardwire tomorrow

The repository contains the code, examples, checks, publication workflows and
launch material. Development does not require ChatGPT, an AI subscription, an app
you own or an API key. GitHub hosts the source, releases, community and static
site. The runtime experiments work locally after dependency installation.

## Start here

Use Node 22 or newer. If you use nvm, run `nvm use` in the checkout to select the
version pinned in `.nvmrc`.

```sh
git clone https://github.com/Automatron-workflows/hardwire.git
cd hardwire
npm ci --ignore-scripts
npm run check:quick
npm run dev
```

Open http://127.0.0.1:8787/playground/experiment.html. Run sign in, the invoice and
the setting. The local server prints both page URLs. Stop with Ctrl+C and restart
after editing an asset. The server reads its explicit asset list at startup.

Already have a checkout? Inspect `git status` first. With a clean tree, switch
to main and run `git pull --ff-only`, then create a branch for the next change.
Run `npm ci --ignore-scripts` when the lockfile changes. Keep unfinished work on
its branch; do not reset it just to follow this guide.

## A useful daily session

| Time | Action | Leave behind |
| --- | --- | --- |
| 10 minutes | Read new issues, Discussions and CI results. Reproduce the first user blocker. | One specific problem and an expected result |
| 50 minutes | Make one bounded improvement from the queue below. | A small diff with relevant regression coverage |
| 15 minutes | Run checks and review the diff. Open a PR; wait for all CI jobs. | Evidence someone else can review |
| 15 minutes | Answer feedback or personally invite a relevant developer to the saved form experiment. | An honest result or a specific question |

If you only have 15 minutes, reproduce one report and leave exact steps. A useful
finding counts as progress. Keep one implementation task in progress at a time.

The next evidence target is five independent saved-form attempts, not another
synthetic fixture. The [ordered queue](docs/ROADMAP.md#next-work-in-order)
explains the provisional engineering order. Prefer a real reported blocker over
that order.

## Find the right file

| Change | Start here | Focused check |
| --- | --- | --- |
| HTML inference | `src/infer-html.mjs`, `test/infer.test.mjs` | `node --test test/infer.test.mjs test/form-experiment.test.mjs` |
| Types and approval declarations | `src/panel-schema.mjs`, `test/panel.test.mjs` | `node --test test/panel.test.mjs test/foundation.test.mjs` |
| Corpus evidence | `examples/corpus/`, `src/score.mjs` | `node --test test/corpus.test.mjs test/score.test.mjs` |
| Sign in, invoice, settings | `playground/comparison.mjs`, `playground/experiment-model.mjs` | `npm run experiment` and `node --test test/comparison.test.mjs test/experiment.test.mjs` |
| Visual experience | `playground/art.mjs`, `app.mjs`, `experiment.mjs`, CSS | `npm run dev`, then the checks in [CONTRIBUTING.md](CONTRIBUTING.md); `npm run test:browser` locks the experiment and film primitives in headless Chrome |
| MCP tools | `src/toolkit.mjs`, `src/mcp-server.mjs` | `npm run test:mcp` |
| Distribution | `scripts/check-package.mjs`, `scripts/build-bundle.mjs`, workflows | `npm run check` |

Focused checks speed up iteration. `npm run check:quick` is the complete source
loop after installation. `npm run test:browser` adds the headless Chrome
experiment check, and `npm run check` remains the merge and release check,
including fresh downloads, package installation and bundle extraction.

## Finish a change

Create a branch, keep the scope clear and commit the reviewed files. Push the
branch and open a pull request using GitHub or `gh pr create`. Include the problem,
new behavior, verification and the next task. Wait for all CI jobs: Linux with
Node 22 and 24, Windows with Node 24, and the headless Chrome playground check.
Do not merge a failing job by reclassifying it as a local environment problem.

After merging, GitHub Pages builds and deploys from main. Check the `playground`
workflow and both public routes. A source merge updates the site; it does not
replace an existing downloadable package. Roll back a source or site change with
a reviewed revert, keeping published packages immutable.

## Publish a package when behavior warrants it

1. On a branch, choose a new version. Use `npm version patch --no-git-tag-version`
   for a patch, or `minor` for a larger pre 1.0 change. Review both manifest and
   lockfile. Do not make a local release tag.
2. Update `CHANGELOG.md`, create `docs/releases/vX.Y.Z.md`, and update commands and
   download links that should point to the new release. Keep historical evidence
   and earlier release notes intact. Search for the old version with `rg`.
3. Run `npm run check`, then merge the PR after CI passes. Package versions stay
   exact; schema or digest changes need explicit compatibility notes.
4. In [Actions](https://github.com/Automatron-workflows/hardwire/actions), run
   `prepare-release` on main. It creates a draft, downloads and verifies the
   uploaded assets, then publishes. Existing versions are refused.
5. Check the published release, then run `publish-registry` on main. It verifies
   the release bundle and publishes its digest using GitHub repository identity.
   Check the workflow and [public entry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.Automatron-workflows/hardwire).
6. Run the documented public download command and record evidence in
   [launch status](docs/LAUNCH-STATUS.md). Native client claims need actual host
   evidence, even when SDK checks pass.

If publication fails, inspect its failed step. An unpublished draft may remain.
Do not delete or overwrite a public release to retry a changed build; use a new
version. Editorial or maintainer changes alone do not require a package release.

## Keep it maintained

Dependabot is configured to propose npm and GitHub Actions updates weekly. Review
release notes, preserve exact package versions and commit pins, and wait for full
CI. No automatic merge is configured. Review the bundle dependency allowlist if
an SDK update changes its runtime graph. A green dependency update is still not
native host compatibility evidence.

GitHub account access with repository write permission is sufficient to publish
through the existing workflows. They use GitHub tokens and repository OIDC;
there is no npm token or paid backend to keep alive. Keep account recovery under
the owner's control. Do not copy credentials into the repository or a chat.

npm remains optional. Its scope ownership and publisher login are unverified;
retain `private: true` until that is deliberately resolved. The GitHub release
and desktop bundle are already the working distribution paths.

## Grow from observable value

Start with five developers who build agent integrations. Give each the
[saved form task](docs/FORM-EXPERIMENT.md). Ask whether they finished without help,
what was confusing, and whether the result is useful in a real project. Use the
[feedback form](https://github.com/Automatron-workflows/hardwire/issues/new?template=experiment.yml)
or Discussions. Keep personal recruitment notes private.

Use the [launch kit](docs/LAUNCH-KIT.md) for the clip, links and draft messages.
Share one clear result in one relevant channel, answer replies and fix repeated
friction before expanding. Invite a small contribution when someone finds a
specific gap. Credit the contributor and publish the resulting improvement.

Each week record independent completions, returning users and outside
contributions separately from stars. GitHub traffic and package downloads include
automation. On 15 November 2026 the repository had zero stars and zero forks;
outside adoption remains unestablished. Thousands of stars is a stretch outcome,
not an engineering acceptance criterion. The immediate goal is five independent
completions, followed by three returning users and three outside contributions.

## Resume with any coding assistant

Give it the repository and one task, with this instruction:

> Read AGENTS.md and MAINTAINING.md. Inspect the current branch, working tree,
> latest CI and the selected issue. Reproduce the issue, make the smallest useful
> change and run the required checks. Preserve the dark visual design and execution
> boundaries. Report what changed, the evidence and the next concrete task.

The repository is the source of truth. A chat transcript is optional context.

## Common stops

| Symptom | Next step |
| --- | --- |
| Node or npm rejects the version | Select Node 22 or newer; use the pinned nvm version where available. Reinstall from the lockfile. |
| Port 8787 is occupied | Use `npm run dev -- --port 8788` and the URL printed by the server. |
| Edited CSS appears unchanged | Restart the local server and reload. |
| `npm run corpus` exits 1 | Expected for the current synthetic baseline. Read the missing or mismatched ports; do not lower the threshold to make it green. |
| Package check cannot download | Check normal network or proxy configuration. Do not disable TLS or call the quick check a full pass. |
| A desktop host times out on npx | First installation may download dependencies. Use the bundle or an installed entry point; see [MCP setup](docs/MCP.md). |
| Browser checks are unavailable | Run source checks and record that visual, keyboard and native browser verification remain open. |
