# Experiment with Hardwire

This guide shows how to turn application actions into descriptions you can
inspect and test. You will review a sample contract, infer a draft from HTML,
check arguments and verify a call record. Use the included fake data; you do not
need to own an app or connect a live account.

For the quickest start, [open the browser playground](https://automatron-workflows.github.io/hardwire/).
Play the sign in, invoice and settings comparisons. Each shows cursor navigation
beside a direct action with the same outcome. Sign in and payment ask for demo
approval before either route starts. Try Cancel, Reset and Replay.
The handlers use Hardwire's real contract and argument validation with local
fixtures. No account or payment provider is connected; the timings are illustrative.
The live demo follows main; the versioned 0.6.0 package retains its original catalogue demo.

Run the commands from the repository root with Node 22 or newer. Install
dependencies with `npm ci --ignore-scripts`. For a guided tour without a model or
credentials, run `npm run walkthrough`. To work through an agent client, use
[the MCP setup guide](MCP.md).

The separate `npm run consumer` example calls one fixed catalogue search handler
with `{ "query": "lamp" }`, returns the fake `Desk lamp` product and records the
result. Read `examples/consumer.mjs` to understand that mapping before replacing
it with an authorized service. Publishing an action description alone does not
make it executable.

## 1. Inspect an explicit contract

```sh
node src/cli.mjs validate examples/example-panel.json --json
node src/cli.mjs audit examples/example-panel.json
node src/cli.mjs compile examples/example-panel.json --json
```

The shop panel has five ports: one read, four mutations. Two mutations require
owner confirmation; two declare themselves reversible and request no
confirmation. The audit reports those declarations; it does not authorize them.

## 2. Infer a draft without a network

```sh
mkdir -p output
node src/cli.mjs infer https://blog.example.com --html examples/corpus/blog/page.html --draft > output/blog.panel.json
node src/cli.mjs validate output/blog.panel.json
node src/cli.mjs score --expected examples/corpus/blog/expected.json --actual output/blog.panel.json
```

Expected: `score 100/100`, exit 0. The blog is a deliberately simple synthetic
fixture. Edit a parameter type in the draft and rerun the comparison to see the
named structural difference. Do not treat a passing score as runtime safety.

## 3. Create and check a trace

```sh
node src/cli.mjs trace examples/example-panel.json search-catalogue --params '{"query":"lamp"}' --json > output/search.trace.json
node src/cli.mjs verify output/search.trace.json --panel examples/example-panel.json --json
```

Expected: `{"valid": true, "panelChecked": true}` (formatted as JSON). The outcome
is `unknown`, because nothing was executed. Change `lamp` in the saved trace and
verification returns `valid: false`, exit 1. Changing the supplied panel revision
also fails the panel binding. Recomputing a digest after changing a record can
make it verify again; this is not forgery detection.

To supply arguments from a file, use `--params-file path/to/params.json` instead
of `--params`. Never commit credentials or traces containing personal data.
`writeOnly` redacts only the fields the panel author explicitly marked.

## 4. Run a real local HTTP origin

Terminal one:

```sh
npm run demo
```

Open `http://127.0.0.1:8787/playground/` for the interactive demo.
The root URL remains the HTML fixture used by these CLI commands.

Terminal two:

```sh
node src/cli.mjs probe http://127.0.0.1:8787 --allow-private --fail-under 30
node src/cli.mjs infer http://127.0.0.1:8787 --allow-private --draft > output/demo.panel.json
node src/cli.mjs compile output/demo.panel.json --json
curl 'http://127.0.0.1:8787/search?q=lamp'
```

Expected probe score: **35/100**, from a valid panel (30) and `llms.txt` (5).
The normal probe threshold is 40, so this example explicitly uses 30. The search
responds with `{"demo":true,"query":"lamp"}`. This `curl` call is manual HTTP,
not a Hardwire executor.

The demo binds to loopback only, has no session or database, and returns 405 for
POST. Login and subscription forms are inference examples, not functional
features. Use fake data only. Stop it with Ctrl-C. To change ports:

```sh
npm run demo -- --port 8788
```

The served panel automatically declares the actual listening port. `--port 0`
chooses a free port and prints it. If 8787 is occupied, choose another port.

## 5. Measure the known failures

```sh
npm run corpus
node src/cli.mjs corpus examples/corpus --json > output/corpus.json
```

Both currently exit 1 by design. The fixture baseline is blog 100, legacy 60,
shop 45. See [the roadmap](ROADMAP.md) for the exact gate and how to collect
real evidence without representing synthetic examples as a benchmark.

## Use it from another local project

The MIT-licensed checkout can be installed as a local package. In a separate
project:

```sh
npm install /absolute/path/to/hardwire
```

Then, in an ESM `.mjs` file:

```js
import { normalizePanel, compilePanel } from 'hardwire';
const panel = normalizePanel({
  panel: 'hardwire.panel/1', origin: 'https://example.com',
  ports: [{ id: 'read-status', kind: 'read', summary: 'Read current status.' }]
});
console.log(compilePanel(panel));
```

Do not run `npm install hardwire` expecting this repository. It is not published
on npm, and the package name has not been reserved. Use `hardwire/browser` for portable inference, validation and compilation in a
browser application. Its `panelDigestAsync` uses Web Crypto over HTTPS or localhost.
The Node entry point retains synchronous hashing, traces and network helpers.
See [the API reference](API.md) and [architecture](ARCHITECTURE.md).

## Troubleshooting

| Symptom | Explanation / action |
| --- | --- |
| `node --version` shows 20 or older | Activate Node 22+, e.g. `nvm use`. |
| `listen EPERM` | Your sandbox forbids local servers. Use the offline tour and `npm run test:unit`; run the full suite on a machine that permits loopback sockets. |
| `hardwire_origin_private` | The probe refused a local target. Use `--allow-private` only for a development origin you control. |
| Probe exits 1 | The score is below the threshold; inspect the report and network findings. |
| `hardwire_schema_invalid` | The schema uses unsupported constraints or inconsistent types. Do not silently remove a constraint your app requires. |
| `hardwire_infer_failed` | No usable candidates, invalid candidate schema, a response without HTML, or fetch/capture limits. Inspect the HTML; controls rendered by JavaScript are not supported. |
| `npm run corpus` exits 1 | Expected for the supplied imperfect synthetic corpus. |
| A compiled tool does nothing | Compilation supplies descriptions only. Implement a trusted handler mapping; see the integration guide. |
