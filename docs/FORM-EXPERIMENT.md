# Bring one form

Start with the email preference from the third demo scene. Generate a candidate
action contract, accept a boolean, reject a string and produce an MCP tool
description. Nothing is executed and no account is required.

With Node 22 or newer:

```sh
npx --yes --ignore-scripts --package=https://github.com/Automatron-workflows/hardwire/releases/download/v0.8.0/hardwire-0.8.0.tgz hardwire-form
```

Expected output:

```text
Candidate action: preferences
Accepted: {"marketingEmails":false}
Rejected: {"marketingEmails":"false"}
MCP tool: preferences
Review the draft. No endpoint was called and no preference changed.
```

Add `--json` to inspect the candidate panel, accepted arguments, rejection and
compiled tool. From a source checkout, use `npm run experiment:form`.

## Use your own capture

Save this synthetic form as `preferences.html`, or use a permitted, sanitized
capture of your own form:

```html
<form action="/preferences" method="post">
  <label><input type="checkbox" name="marketingEmails"> Marketing emails</label>
  <button type="submit">Save</button>
</form>
```

From the checkout:

```sh
node examples/form.mjs --html preferences.html --origin https://example.com --valid '{"marketingEmails":false}' --invalid '{"marketingEmails":"false"}' --json
```

Use argument samples that fit your capture. With several inferred actions,
choose one using `--port id`. Unknown flags and incomplete inputs exit 2. Failed
inference, invalid positive samples, or a negative sample that passes exit 1.
A completed experiment exits 0.

The file stays local. The origin labels the contract; it is not visited. Markup
is parsed as text, never rendered or executed. The command reads at most 512 KiB
of HTML and does not call a model or remote service. Package installation needs
network access; running the experiment does not.

## Connect it to the three scenes

The [visual experiment](EXPERIMENT.md) uses reviewed contracts and fixed handlers
for sign in, invoice payment and settings. This form experiment shows the step
before that review. It infers a write with user confirmation from the settings
form. It cannot infer the handler's reversibility, so it does not copy the
confirmation exemption in the reviewed visual example.

Likewise, a sign in form cannot prove identity, and a payment form cannot prove
the recipient, amount policy or approval authority. Review the candidate against
real behavior before connecting application code. Inferred contracts and compiled
tools are descriptions, not authorization or executable integrations.

[Share the result](https://github.com/Automatron-workflows/hardwire/discussions/categories/show-and-tell):
what form you used, whether the positive and negative samples behaved as expected,
and the first confusing step. Share synthetic markup only.
