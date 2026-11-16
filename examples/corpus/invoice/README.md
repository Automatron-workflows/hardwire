# Invoice fixture

This is a synthetic page authored for the corpus. It was not captured from a
live site, and the expected panel is not evidence about any real payment
endpoint. A person reviewed the panel by hand; inference scored it later.

The fixture mirrors the payment scene in
[`playground/comparison.mjs`](../../../playground/comparison.mjs): invoice
`demo001`, currency EUR, amount in integer minor units (`2400` for €24.00) and
owner approval. No payment provider is connected and no money moves.

## What the form actually sends

The page is deliberately small, but it still hides several contract decisions:

- `invoiceId` is a hidden input. The browser would submit `demo001`; the static
  parser ignores hidden inputs, so inference does not see it.
- The visible amount is `24.00` in major units. The reviewed contract uses
  integer minor units, `2400`. The conversion is server behaviour, not markup.
- The currency select has one option, `EUR`. Static inference sees a string
  field and does not read the option list as an enum.
- The form is a `POST` to `/api/invoices/demo001/pay`. Nothing in the markup
  proves that the handler charges money, that the amount is fixed, or that the
  owner approved it.

## Why the expected panel differs from the draft

Inference produces a `write` with `confirmation: "user"` and generic form
parameters. The reviewed panel declares the required payment semantics. The
`payment` kind carries an absolute owner-confirmation floor, so a draft cannot
quietly lower it.

| Field | Expected (reviewed contract) | Inferred | Why |
| --- | --- | --- | --- |
| `kind` | `payment` | `write` | A form labeled "Pay" is still a form. Static inference never proposes payment. |
| `confirmation` | `owner` | `user` | Payment requires owner approval. The draft's conservative user default is still below the payment floor. |
| `parameters` | `invoiceId`, integer `amount` in minor units and `currency` enum | visible fields only, `amount` as a number and `currency` as a plain string | Hidden inputs, unit conversion and option restrictions are not established by static markup. |

The endpoint and the default non-reversibility match. The expected panel
therefore scores **40/100**: two of five compared fields match, and the three
payment-specific fields differ. The case fails safely: it records an unsafe
effect and approval downgrade rather than inventing a payment.

## Reproduce

```sh
node --test test/corpus.test.mjs
node src/cli.mjs score --expected examples/corpus/invoice/expected.json --infer examples/corpus/invoice/page.html
npm run corpus
```

`npm run corpus` exits 1 by design because the six-case mean stays below the
80-point threshold. Do not lower the threshold or teach the parser to guess
payment semantics to make it pass.

## Evidence boundary

Synthetic corpus coverage is not a real-site accuracy measurement. This fixture
shows that a familiar invoice form leaves the payment effect, owner approval,
hidden identifiers, minor-unit conversion and currency restriction to review.
It does not establish how any production site charges, authorises or refunds a
payment.
