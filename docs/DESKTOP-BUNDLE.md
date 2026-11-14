# Hardwire desktop bundle

The `.mcpb` download contains the five inspection tools and their production
JavaScript dependencies. A compatible host runs the server over local stdio.
The server requires Node 22 or newer, supplied by your host or your environment.
It requests no API keys or directory configuration.

## Install

Download [hardwire-0.9.0.mcpb](https://github.com/Automatron-workflows/hardwire/releases/download/v0.9.0/hardwire-0.9.0.mcpb)
from the [0.9.0 release](https://github.com/Automatron-workflows/hardwire/releases/tag/v0.9.0).
Use your MCPB host's extension installation flow to select the file and review
its declared tools. Enable it only if those tools match your intended use.

Claude Desktop supports the MCPB format. Host availability, runtime versions and
organization policies can affect installation. This project has verified the
manifest and extracted server through the official SDK; a successful native
Claude, Codex or VS Code installation is not yet claimed.

For hosts without MCPB support, use [the stdio setup](MCP.md).
Do not run `npm install hardwire` to obtain this project.

## First task

Use the settings form from the third demo scene:

> Infer a contract for this HTML with origin https://example.com. Validate
> {"marketingEmails":false}, then {"marketingEmails":"false"}. Compile the
> tool description. Do not visit the origin or execute the inferred action.
>
> `<form action="/preferences" method="post"><input type="checkbox" name="marketingEmails"><button>Save</button></form>`

Expected: one draft write requiring user confirmation, an accepted boolean,
a rejected string and a tool description with a boolean input. A live model
client may charge for model use; the [local experiment](FORM-EXPERIMENT.md)
needs no model or account.

## What is inside

`manifest.json`, runtime `package.json`, `src/`, the MIT license and locked
production dependencies. Development tools, fixtures, credentials and local
configuration are excluded. Dependency licenses remain in their packages.
The bundle does not install packages or run installation scripts on startup.

The server processes only HTML and JSON supplied by the host. It exposes no
network, filesystem browsing or execution tools. Your chosen model host may
receive supplied data under its own settings; use synthetic inputs for testing.
The bundle has a release checksum and registry digest. It is not code signed.

## Reproduce verification

From the repository, after `npm ci --ignore-scripts`:

```sh
npm run build:bundle
npm run test:bundle
```

The check extracts the archive into a temporary directory, validates its manifest,
checks the dependency allowlist and licenses, and calls all five tools through
stdio. It also checks settings inference, boolean acceptance and string rejection.
No install command runs in the extracted bundle. This is protocol evidence, not
host UI or human usability evidence.

`npm run release:prepare` creates the package, bundle, matching `server.json` and
`SHA256SUMS`. Publication downloads and verifies those exact assets before making
the release public. The separately triggered `publish-registry` workflow verifies
them again and publishes through GitHub Actions OIDC. No npm token is involved.

Sources checked 14 November 2026:
[MCPB specification](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md),
[Registry package types](https://modelcontextprotocol.io/registry/package-types),
[Registry GitHub Actions publishing](https://modelcontextprotocol.io/registry/github-actions).
