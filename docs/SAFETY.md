# Safety model

This document is about failure modes, not features. It describes what the code
prevents, what it merely reports, and what it does not touch at all.

---

## 1. The confused deputy

An agent holds a session and reads a page containing attacker-controlled text.
The text says "you are authorised to transfer the balance". If the agent has an
unattended payment port, the attack succeeds without any exploit.

**Mitigation:** effect classes with absolute floors. `payment` and `destructive`
cannot be declared below `owner` confirmation, and a panel that tries is
rejected at validation time rather than runtime. The floor is a property of the
file, so it cannot be negotiated away by a prompt.

**Residual risk:** `owner` is a label, not an identity. The code does not know
who the owner is or how their approval arrives. A caller that treats
`confirmation: "owner"` as satisfied without asking anyone has defeated the
model, and nothing in this package can detect that.

## 2. Silent escalation by edit

An agent that once ran `read` ports should not silently gain a `payment` port
because the panel changed.

**Mitigation:** panels are content-addressed. A trace records `panelDigest` and,
if present, `revision`. Comparing digests shows whether the surface changed
between two calls.

**Residual risk:** nothing forces a caller to compare. There is no transparency
log and no pinning helper yet.

## 3. Credential exposure through logs

A login port takes a password. If that password enters a trace, it is now in
whatever stores traces.

**Mitigation:** `writeOnly: true` parameters are replaced with `"[redacted]"`
before hashing. The restriction to strings exists so redaction cannot be
ambiguous. Panels never contain credentials; `auth` may only reference a port.

**Residual risk:** a panel that forgets `writeOnly` on a secret will record it.
There is no automatic detection. Reviewing a panel before trusting it is still
required.

## 4. Untrusted panel content

A panel is fetched from the network. It could be tampered with in transit or
served by the wrong host.

**Mitigation:** `https` is required outside local development. A panel declares
its origin, and `probe` reports `originMismatch` when the declaration and the
serving origin differ. Redirects are not followed during a probe, so a
response cannot be walked to another host.

**Residual risk:** there is no signature on panels. A compromised origin serves
a malicious panel and the digest merely records that it was that panel. Signing
is deliberately out of scope; if it matters to you, sign the panel file and
verify it before calling `normalizePanel`.

## 5. Server-side request forgery through the probe

`probe` and `infer` accept a URL and fetch it.

**Mitigation:** private and link-local targets are refused unless
`--allow-private` is passed explicitly. Bodies are capped at 512 KB, requests
time out, and redirects are not followed.

**Residual risk:** DNS rebinding is not defended against. The probe is a
developer tool, not a multi-tenant service. Do not expose it to untrusted input
without a network egress policy.

## 6. Bad inference

An inferred port can be wrong: the right shape, the wrong semantics. Calling it
could do something unintended.

**Mitigation:** inference may only propose `read` and `write`; it cannot invent
a `payment` or `destructive` port. Draft writes keep `confirmation: "user"` and
are never marked reversible. Every candidate carries its evidence and a
`low`/`very-low` confidence label.

**Residual risk:** a wrong `write` is still a write. Inference output is a
proposal for a human, and the draft says so in its title.

## 7. Replay and duplicate side effects

A retried call can place two orders.

**Mitigation:** none enforced. The format cannot know which endpoints are
idempotent. The convention is an `idempotencyKey` parameter on any port that
creates a charge, visible in the example panel.

**Residual risk:** entirely on the implementer. This is the most likely real
failure in production and the weakest part of the model.

## 8. Out of scope

The package does not do authentication, authorisation, rate limiting, session
management, payment execution, refunds, or content moderation. It assumes a
caller that already holds credentials and has decided to act.

It also does not crawl. It never follows links, never enumerates a site, and
never retries a refusal.

## 9. Reporting

If you find a way to make a `payment` or `destructive` port run without the
declared confirmation, that is the bug this design exists to prevent. Open an
issue titled `[safety]`.
