# Examples

Run `npm run consumer` for an application-owned read-handler integration. It
returns a fake catalogue product and records its checked result; see
`consumer.mjs`. `npm run walkthrough` demonstrates the format helpers offline.

| Path | What it is | Try it with |
| --- | --- | --- |
| `example-panel.json` | A complete panel for a fictional shop, including every effect class. | `validate`, `audit`, `compile`, `trace` |
| `demo/` | A local HTTP origin that publishes a panel and serves forms. | `npm run demo`, then `probe` and `infer` |
| `corpus/` | Three synthetic HTML fixtures paired with hand-written panels. | `corpus` |
| `walkthrough.mjs` | An offline tour of validation, compilation, traces and inference. | `npm run walkthrough` |

## The demo origin

`examples/demo/server.mjs` is the quickest way to see the whole loop without a
network dependency:

```sh
npm run demo
# in another terminal
node src/cli.mjs probe http://127.0.0.1:8787 --allow-private --fail-under 30
node src/cli.mjs infer http://127.0.0.1:8787 --allow-private --draft > /tmp/draft.json
node src/cli.mjs audit /tmp/draft.json
node src/cli.mjs compile /tmp/draft.json
```

The probe finds the published panel. Inference ignores it and reads the same
page's forms, which is the point: the two paths are independent. The endpoint
answers a fixed JSON body; nothing is written or stored.

## The corpus

Each case is a directory with `page.html` and `expected.json`. These fixtures
are synthetic, not a real-site benchmark. `node src/cli.mjs corpus examples/corpus`
intentionally exits 1 on the known failures. See `docs/ROADMAP.md` for capture
provenance, license and measurement requirements before adding real pages.
