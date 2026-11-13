# Three actions. One experiment.

**Run the three actions from the demo. Change an input. Watch validation stop an
invalid request before local state changes.**

[Open the experiment](https://automatron-workflows.github.io/hardwire/experiment.html).
Choose sign in, invoice payment or settings. Run the action, review any requested
approval, then inspect its result. Reset and try an invalid input.

The experiment executes fixed local JavaScript handlers through Hardwire's real
validator. No app, account, payment provider, model or API key is needed.

## Run all three in your terminal

Use Node 22 or newer:

```sh
npx --yes --ignore-scripts --package=https://github.com/Automatron-workflows/hardwire/releases/download/v0.7.0/hardwire-0.7.0.tgz hardwire-experiment
```

This installs the exact GitHub release into npm's temporary command cache. The
experiment itself uses no package dependencies. To edit the source instead:

```sh
git clone https://github.com/Automatron-workflows/hardwire.git
cd hardwire
npm run experiment
```

| Scene | Valid request | Local result | Required confirmation |
| --- | --- | --- | --- |
| Sign in | Google provider, sample account `demo` | `signedIn: true` | User |
| Pay an invoice | `demo001`, 2400 cents, EUR | `invoicePaid: true` | Owner |
| Change a setting | `marketingEmails: false` | `marketingEmails: false` | None, declared reversible |

For each scene, the script checks that invalid input changes nothing, runs the
valid request once, reads back the resulting state and rejects a duplicate call.
Sign in and payment also reject missing and forged approvals. The script
simulates the local approval step; it does not collect a human approval.

```sh
npm run experiment -- payment
npm run --silent experiment -- --json
```

JSON output includes the initial state, blocked requests, final state, call
record and compiled MCP tool description. A failing assertion exits 1. Invalid
CLI usage exits 2. A completed experiment exits 0.

## Change an input

```sh
npm run demo
```

Open `http://127.0.0.1:8787/playground/experiment.html`.

1. **Sign in:** change `demo` to another account. Run it. The account stays signed
   out. Restore `demo`, run again and explicitly approve the local session.
2. **Invoice:** change €24.00 to €25.00. Run it. The invoice stays unpaid. Restore
   €24.00, run again and approve the displayed invoice, amount and recipient.
3. **Settings:** use **Try invalid input** to submit the string `"false"` instead
   of a boolean. The setting stays on. Run the normal request to turn it off.

Open **Inputs & code** to edit the request, then choose **Use these inputs**.
The same inspector contains the actual result, call record, compiled tool and
contract. Escape closes it and returns focus to the control that opened it.
Editing a request cancels pending approval. Reset starts a new isolated fixture.
After success, **Next example** advances the journey. **Replay** starts again.
Completed actions cannot run a second time in the same fixture.

## Follow one request through the code

`playground/comparison.mjs` defines the reviewed three port panel and maps each
port to a fixed handler. It pins the contract digest, validates the arguments,
checks the local approval object, changes state and records the result.
`playground/experiment-model.mjs` manages review and confirmation for the browser.
`examples/experiment.mjs` exercises the same handlers from Node.

```js
import { createComparison, scenarios } from './playground/comparison.mjs';

const app = createComparison('payment');
const params = { ...scenarios.payment.params };

// This intentionally rejects without changing the invoice.
try {
  await app.run({ params });
} catch (error) {
  console.log(error.message);
}

// Local demonstration only. A real integration must verify the approver.
const approval = app.approve({ level: 'owner', params });
await app.run({ params, approval });
console.log(app.snapshot().invoicePaid); // true
console.log(app.log()[0]);
```

Run this snippet as an `.mjs` file in the repository root. For regression checks:

```sh
node --test test/comparison.test.mjs test/experiment.test.mjs
```

## What this establishes

The three examples show how an application can put checked inputs and explicit
approval requirements in front of known handlers. The state changes and
rejections are executed, not animation timers. The landing film remains an
illustration, not a speed measurement.

The browser stores fixture state in memory only. Reloading discards it. Local
approval objects are one use grants tied to an instance and exact arguments.
Their `user` and `owner` levels are assertions inside the example, not verified
identities. The Google provider is a fixed label, not OAuth. Invoice payment
changes a boolean, not a balance. No amount, account or provider can be added to
the fixture by changing the form.

The call record is local diagnostic data bound to a panel digest. It is not a
signed receipt or proof of a real payment. Compiled MCP tool descriptions are
data; the separate toolkit MCP server still exposes inspection tools only.

Before adapting a handler to a real app, supply authentication, authorization,
trusted approval collection, idempotency and independent result verification.
See [integration](INTEGRATION.md) and [the evidence gates](ROADMAP.md).
