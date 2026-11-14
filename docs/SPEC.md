# Hardwire panel format 1

Status: **draft, single implementation.** This document describes what the code
in `src/` actually enforces. Where they disagree, the code is authoritative and
the document has a bug.

---

## 1. Discovery

A site advertises its panel at:

```
/.well-known/hardwire.json
```

The repository copy is named `hardwire.panel.json`. Both names are conventions,
not registered media types. A panel served at the discovery path must declare
the origin it is served from; a mismatch is reported by `probe` as
`hardwire_origin_mismatch` and is not silently accepted.

## 2. Document shape

```json
{
  "panel": "hardwire.panel/1",
  "origin": "https://example.com",
  "title": "Optional human label",
  "revision": "optional opaque string",
  "auth": { "loginPort": "sign-in", "note": "optional" },
  "ports": []
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `panel` | yes | Exactly `hardwire.panel/1`. |
| `origin` | yes | Absolute, bare origin. `https`, or `http` on `localhost` / `127.0.0.1` / `[::1]`. No credentials, path, query, fragment, whitespace or backslashes. |
| `ports` | yes | Non-empty array, at most 256 entries. |
| `title` | no | ≤ 120 characters. |
| `revision` | no | ≤ 128 characters, opaque. Included in the panel digest. |
| `auth.loginPort` | no | Must name an existing port. |
| `auth.note` | no | ≤ 500 characters. |

Unknown panel, port, auth and schema keys are rejected. This catches misspelled
policy fields instead of silently dropping them. The current format is a draft;
see CHANGELOG.md for compatibility changes.

## 3. Ports

```json
{
  "id": "place-order",
  "kind": "payment",
  "summary": "Convert the current cart into a paid order.",
  "confirmation": "owner",
  "reversible": false,
  "preconditions": ["authenticated"],
  "parameters": { "type": "object", "properties": {}, "required": [] },
  "expects": { "type": "object", "properties": {} },
  "endpoint": "/api/orders"
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `id` | yes | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, ≤ 64 characters, unique after sorting. |
| `kind` | yes | `read`, `write`, `destructive` or `payment`. |
| `summary` | yes | 1–280 characters. Shown to the agent; write it for a reader. |
| `confirmation` | no | `none`, `user` or `owner`. Defaults and floors in §4. |
| `reversible` | no | Boolean. Required to allow `write` with `confirmation: none`. |
| `preconditions` | no | Array of `^[a-z][a-z0-9-]*$` labels. Advisory; the caller must check them. |
| `parameters` | no | Object schema; absent means no arguments. |
| `expects` | no | Supported schema describing the result shape; not enforced at runtime. |
| `endpoint` | no | Single-slash site-relative (`/…`) or absolute `https://`. No credentials, fragments, whitespace, control characters, backslashes or protocol-relative URLs. |

Ports are sorted by `id` on normalization. Endpoint metadata does not specify
method, authentication or argument serialization. Absolute HTTPS endpoints may
be cross-origin; consumers must allowlist destinations before execution.

## 4. Confirmation

```
rank(none) < rank(user) < rank(owner)
```

A declared confirmation lower than the floor is a validation error
(`hardwire_confirmation_weakened`), not a warning.

| `kind` | Default when omitted | Floor |
| --- | --- | --- |
| `read` | `none` | `none` |
| `write` | `user` | `none` **only if** `reversible: true` |
| `destructive` | `owner` | `owner` |
| `payment` | `owner` | `owner` |

The floor is a lower bound, not a recommendation. Publishing `read` with
`owner` is legal and means every read asks a human.

## 5. Parameter schemas

The accepted subset is intentionally small. Unknown keywords are rejected rather
than ignored, because dropping a constraint silently is how an agent sends the
wrong value.

| Keyword | Applies to | Notes |
| --- | --- | --- |
| `type` | all | `string`, `number`, `integer`, `boolean`, `array`, `object`, `null`. |
| `description` | all | ≤ 500 characters. |
| `enum` | scalar types | Non-empty unique scalars matching the declared type, ≤ 64 entries. Numbers must be finite. |
| `items` | `array` | One nested schema. |
| `properties` | `object` | Map of name → schema. |
| `required` | `object` | Names must exist in `properties` and match `^[A-Za-z_][A-Za-z0-9_]*$`. |
| `additionalProperties` | `object` | Boolean. Default `false`: unknown keys are rejected. |
| `writeOnly` | `string` | Boolean. Value is redacted from traces. |

Nesting is limited to four levels. `__proto__`, `constructor` and `prototype`
property names are rejected. Object schemas explicitly normalize to
`additionalProperties: false` when omitted. Null is not a substitute for an
omitted properties map or required list.

`writeOnly` exists because a schema is the only thing that knows which argument
is a secret. It is restricted to strings so redaction cannot be ambiguous.

## 6. Traces

```json
{
  "trace": "hardwire.trace/1",
  "panel": "https://example.com",
  "panelDigest": "sha256:…",
  "revision": "2026-11-11T00:00:00Z",
  "port": { "id": "place-order", "kind": "payment", "confirmation": "owner" },
  "actor": "agent",
  "at": "2026-11-11T10:00:00.000Z",
  "params": { "idempotencyKey": "k1", "shippingAddressId": "a1" },
  "outcome": { "status": "succeeded", "resultDigest": "sha256:…" },
  "digest": "sha256:…"
}
```

- `params` are the **validated** arguments, never the caller's prompt.
- `writeOnly` values are replaced with `"[redacted]"` before hashing.
- `digest` is `sha256` over the canonical JSON of the document without `digest`.
- `outcome.status` is one of `succeeded`, `failed`, `unknown`, `refused`.

A trace is not a signature or a receipt. Its digest checks consistency, provided
the digest is retained and trusted. Anyone can edit the record and recompute the
hash. Verification does not prove identity, execution or approval.

`buildTrace` normalizes the panel and resolves the port from it. `at` must be a
real UTC timestamp in the shown format (milliseconds optional). `actor` and
optional outcome `code` are non-empty strings of at most 128 characters. An
optional result digest must be `sha256:` plus 64 lowercase hex digits.
`verifyTrace` rejects unknown record, port and outcome fields, malformed optional
outcome metadata and non-JSON records. `verifyTrace(trace, { panel })` additionally
checks exact panel and port binding, argument shape and `[redacted]` markers at
declared write-only positions. Original secret values cannot be verified.
Write-only array items are redacted too; unmarked secrets are not detected.

## 7. Canonical JSON

Digests require byte-identical serialisation:

- object keys sorted by UTF-16 code unit;
- arrays keep their order;
- no insignificant whitespace;
- `null`, `true`, `false`, finite numbers and strings only;
- no sparse arrays, no cycles, no class instances, symbols or accessors;
- limits: depth 32, 10,000 nodes, 262,144 characters per string, 65,536 bytes of
  output.

## 8. Error codes

| Code | Meaning |
| --- | --- |
| `hardwire_panel_invalid` | Not a panel-shaped object. |
| `hardwire_version_unsupported` | `panel` is not `hardwire.panel/1`. |
| `hardwire_origin_invalid` | Origin is not an absolute bare https origin. |
| `hardwire_ports_empty` | No ports. |
| `hardwire_ports_invalid` | Too many ports. |
| `hardwire_port_invalid` | Bad id, kind, summary, confirmation or precondition. |
| `hardwire_port_duplicate` | Duplicate id, or two ids collide after name mapping. |
| `hardwire_confirmation_weakened` | Declared confirmation below the floor. |
| `hardwire_schema_invalid` | Unsupported or inconsistent schema. |
| `hardwire_params_invalid` | Arguments do not match the schema. |
| `hardwire_trace_invalid` | Bad outcome status or timestamp. |
| `hardwire_origin_private` | Private host without explicit permission. |
| `hardwire_infer_failed` | Page could not be fetched, exceeded limits or produced nothing. |
| `hardwire_origin_mismatch` | Discovered panel declares a different origin (probe finding). |
| `hardwire_corpus_invalid` | Invalid corpus entry or threshold. |
| `hardwire_score_invalid` | Invalid score threshold. |
| `hardwire_probe_invalid` | Invalid timeout. |

Callers may branch on these codes. The low-level canonical serializer can also
throw TypeError or RangeError for non-JSON data and resource limits. CLI usage
and I/O errors exit 2; validation errors exit 1.
