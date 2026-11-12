import { fileURLToPath } from 'node:url';

// Generate exact paths without touching a user's client configuration.
console.log(JSON.stringify({ mcpServers: { hardwire: {
  command: process.execPath,
  args: [fileURLToPath(new URL('../src/mcp-server.mjs', import.meta.url))],
} } }, null, 2));
