# Public release decision

**Decided: MIT.** The owner chose the MIT licence on 13 November 2026. The
decision applies to the repository and the source in it; it does not publish an
npm package.

## What MIT grants

MIT permits anyone to use, copy, modify, merge, publish, distribute, sublicense
and sell copies of the software, provided the copyright notice and permission
notice are retained. Derivative works may be kept private. The software is
provided without warranty.

MIT does not preserve exclusivity, require payment, grant trademark rights or
contain an express patent grant. Revenue, if any, would have to come from
separate services, hosting, integrations or support; none is promised by this
release.

## What remains separate

- **npm publication.** `package.json` keeps `"private": true`. The package name
  is not reserved, and no npm artifact is published by this decision.
- **Application execution.** A panel describes operations; it does not grant
  permission to perform them. A consumer still needs authorization and an
  explicit handler for each port.
- **Adoption and settlement.** Publication, acceptance and independently
  confirmed settlement are separate states. A public repository is not evidence
  of users, revenue or correctness.
- **Third-party material.** Corpus captures and quoted specifications keep their
  own provenance and terms; the MIT licence covers this repository's code and
  documentation, not content it does not own.

## Record

| Item | Value |
| --- | --- |
| Decision | MIT |
| Date | 13 November 2026 |
| Decided by | Repository owner |
| Licence file | [`LICENSE`](../LICENSE) |
| Package metadata | `"license": "MIT"`, `"private": true` |
| npm publication | Not authorized by this decision |
