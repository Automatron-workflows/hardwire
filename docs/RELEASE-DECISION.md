# Public release decision

The technical candidate is 0.5.0: a local MCP toolkit, existing library, client
setup and tests. Public source is on GitHub. LICENSE currently withholds reuse
and redistribution rights.

**Proposal: standard MIT license, retaining Copyright (c) 2026 Automatron.**

MIT permits people and businesses to use, modify, redistribute and sell copies
provided the copyright and license notice remain. They may keep modifications
private. It does not preserve exclusivity over the distributed code or require
users to pay. This supports adoption of a developer toolkit. Revenue would need
to come from separate services, hosting, integrations or support; none is promised
by this release.

The proposed terms are the [standard MIT text](https://choosealicense.com/licenses/mit/).
This document is a proposal only. It does not apply that license or grant rights.
The owner must choose before public release and an external reuse invitation.

After selection, replace LICENSE, set package metadata to MIT, update the license
notices in README/CONTRIBUTING/MCP/setup/distribution/roadmap, rerun CI and publish
the GitHub prerelease. npm scope and authentication can be resolved later; they
need not delay a licensed GitHub release.
