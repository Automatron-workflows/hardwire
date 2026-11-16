# Sign-in fixture

This is a synthetic page authored for the corpus. It was not captured from a
live site, and the expected panel is not evidence about any real authentication
endpoint. A person reviewed the panel by hand; inference scored it later.

The fixture mirrors the sign-in form in
[`examples/demo/page.html`](../../demo/page.html): an email/password `POST` to
`/api/session`. It is a parser evaluation task, not an OAuth integration. No
identity provider is connected, and the placeholders are fake account data, not
credentials.

## Why the expected panel differs from the draft

Inference produces the right port id (`sign-in`), effect (`write`),
confirmation (`user`), endpoint and parameters. The id comes from the form's
`id` attribute, and `password` keeps the parser's `writeOnly` annotation. The
reviewed panel deliberately adds one field that static markup cannot establish:

| Field | Expected (reviewed contract) | Inferred | Why |
| --- | --- | --- | --- |
| `reversible` | `true` | `false` | The page offers a sign-out link and the demo's session can be ended, but a sign-in form cannot prove that the server supports reversal. A draft must not claim it. |

`confirmation: "user"` is the published contract for a new authenticated
session. The local experiment's `start-session` scene uses the same requirement,
and the inferred draft happens to match it; this fixture does not treat that
match as proof that the form itself establishes consent.

The expected panel therefore scores **80/100**: four of five compared fields
(`kind`, `confirmation`, `endpoint`, `parameters`) match, and only
`reversible` differs. The difference is conservative rather than unsafe: the
draft does not over-claim approval or reversibility. It clears the 80-point
threshold on its own, while the corpus as a whole still fails because the
settings and shop cases remain below the gate.

## Reproduce

```sh
node --test test/corpus.test.mjs
node src/cli.mjs score --expected examples/corpus/signin/expected.json --infer examples/corpus/signin/page.html
npm run corpus
```

`npm run corpus` exits 1 by design because the six-case mean stays below the
80-point threshold. Do not lower the threshold to make it pass.

## Evidence boundary

Synthetic corpus coverage is not a real-site accuracy measurement. This fixture
shows that a familiar email/password form still leaves one reviewable contract
decision, reversibility, that static inference cannot settle. It does not
establish how any production site authenticates, authorises or ends a session.
