# Settings fixture

This is a synthetic page authored for the corpus. It was not captured from a
live site, and the expected panel is not evidence about any real preference
endpoint. A person reviewed the panel by hand; inference scored it later.

The fixture mirrors the third scene of the local experiment. The fixed handler
lives in [`playground/comparison.mjs`](../../../playground/comparison.mjs) as
`set-preferences`: a write with no confirmation, explicitly reversible, taking a
required boolean `marketingEmails` at `/preferences`. The page uses a synthetic
origin so the corpus stays separate from the GitHub Pages demo.

## What the form actually sends

A checkbox has an encoding convention, not a boolean field:

- checked: `marketingEmails=on`
- unchecked: no `marketingEmails` entry at all

HTML has no built-in false value. A server recovers `false` either from the
missing key or from a separate hidden input such as
`<input type="hidden" name="marketingEmails" value="false">`. Which convention
applies is server behaviour that the markup does not state.

The fixed handler expects a JSON boolean, `true` or `false`. Converting `"on"`
and omission into that boolean is a handler-side decision. Static inference can
see `type="checkbox"` and produce `{ "type": "boolean" }`, but it cannot see the
conversion rule. That gap is intentional in this fixture, not a parser bug.

## Why the expected panel differs from the draft

Inference produces the right port id, effect (`write`) and endpoint
(`/preferences`). The id comes from the form's `id` attribute, which matches the
fixed handler; this fixture measures contract fields, not port naming. Three
reviewed fields deliberately disagree:

| Field | Expected (handler contract) | Inferred | Why |
| --- | --- | --- | --- |
| `confirmation` | `none` | `user` | A draft write is conservatively given user confirmation. The handler is a local, reversible preference toggle and needs no approval. |
| `reversible` | `true` | `false` | Only the handler's implementation shows that the previous value can be restored. A checkbox cannot prove reversibility. |
| `parameters.required` | `["marketingEmails"]` | `[]` | The handler requires a boolean argument. The form omits `required` on purpose: HTML's `required` on a checkbox means "must be checked", not "must be present", so it cannot express the handler contract. |

The expected panel therefore scores **40/100**: two of five compared fields
(`kind`, `endpoint`) match, and the three fields above differ. This is the useful
result. It keeps an over-confident draft from passing while recording exactly
what a reviewer had to add.

## Reproduce

```sh
node --test test/corpus.test.mjs
node src/cli.mjs score --expected examples/corpus/settings/expected.json --infer examples/corpus/settings/page.html
npm run corpus
```

`npm run corpus` exits 1 by design because the five-case mean stays below the
80-point threshold. Do not lower the threshold to make it pass.

## Evidence boundary

Synthetic corpus coverage is not a real-site accuracy measurement. This fixture
shows that a familiar checkbox-to-boolean preference form contains at least
three reviewable contract decisions. It does not establish how any production
site encodes, authorises or reverses the same action.
