#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer, fromJsonSchema } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { TOOLKIT_TOOLS, toolkitResult } from './toolkit.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export function createToolkitServer() {
  const server = new McpServer({ name: 'hardwire', version }, { maxToolInputElements: 10000 });
  for (const { name, inputSchema, ...config } of TOOLKIT_TOOLS) {
    server.registerTool(name, { ...config, inputSchema: fromJsonSchema(inputSchema) },
      async args => toolkitResult(name, args));
  }
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length > 2) {
    if (process.argv.length === 3 && process.argv[2] === '--version') console.log(version);
    else if (process.argv.length === 3 && process.argv[2] === '--help') {
      console.log('hardwire-mcp\nLocal stdio MCP toolkit. Start without arguments from an MCP client.\nNo network access, file tools or website execution.');
    } else { console.error('Usage: hardwire-mcp [--version|--help]'); process.exitCode = 2; }
  } else {
    const handle = serveStdio(createToolkitServer);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void handle.close(); });
  }
}
