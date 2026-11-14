#!/usr/bin/env node
// Inspect a saved form without rendering it or calling its endpoint.
import { open, realpath, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { inferFromHtml, toPanelDraft, normalizePanel, validateParams, compilePanel, toolName } from '../src/browser.mjs';

const usage = `Usage: hardwire-form [--html file.html --origin https://example.com --valid JSON --invalid JSON] [--port id] [--json]
With no arguments, checks the bundled settings form. Nothing is executed.`;

export function inspectForm({ html, origin, valid, invalid, portId }) {
  const inference = inferFromHtml(html, { origin });
  const draft = toPanelDraft(inference);
  if (!draft?.ports.length) throw new Error('No action found. Supply a static HTML form.');
  const panel = normalizePanel(draft);
  if (!portId && panel.ports.length !== 1) throw new Error('Several actions found. Select one with --port.');
  const port = portId ? panel.ports.find(port => port.id === portId) : panel.ports[0];
  if (!port) throw new Error('The selected port does not exist in the draft.');
  const accepted = validateParams(port, valid);
  let rejection;
  try { validateParams(port, invalid); } catch (error) {
    if (error.code !== 'hardwire_params_invalid') throw error;
    rejection = error.message;
  }
  if (!rejection) throw new Error('The invalid sample passed. Supply an input that violates the draft schema.');
  return { executed: false, reviewRequired: true, port: port.id, draft,
    accepted, rejected: { input: invalid, reason: rejection },
    tool: compilePanel(panel).find(tool => tool.name === toolName(port.id)) };
}

async function readHtml(path) {
  const limit = 512 * 1024;
  const info = await stat(path);
  if (!info.isFile() || info.size > limit) throw new Error('Supply an HTML file of at most 512 KiB.');
  const file = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > limit) throw new Error('Supply an HTML file of at most 512 KiB.');
    return buffer.subarray(0, length).toString('utf8');
  } finally { await file.close(); }
}

async function main(argv) {
  if (argv.length === 1 && argv[0] === '--help') { console.log(usage); return; }
  const options = {}, flags = new Set(['--html', '--origin', '--valid', '--invalid', '--port', '--json']);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flags.has(flag) || Object.hasOwn(options, flag)) throw new Error(usage);
    options[flag] = flag === '--json' ? true : argv[++i];
    if (options[flag] === undefined || (typeof options[flag] === 'string' && options[flag].startsWith('--'))) throw new Error(usage);
  }
  const supplied = ['--html', '--origin', '--valid', '--invalid'].filter(key => Object.hasOwn(options, key));
  if (supplied.length && supplied.length !== 4) throw new Error(usage);
  const result = inspectForm({
    html: await readHtml(options['--html'] ?? new URL('./forms/settings.html', import.meta.url)),
    origin: options['--origin'] ?? 'https://example.com',
    valid: Object.hasOwn(options, '--valid') ? JSON.parse(options['--valid']) : { marketingEmails: false },
    invalid: Object.hasOwn(options, '--invalid') ? JSON.parse(options['--invalid']) : { marketingEmails: 'false' },
    portId: options['--port'],
  });
  if (options['--json']) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Candidate action: ${result.port}`);
    console.log(`Accepted: ${JSON.stringify(result.accepted)}`);
    console.log(`Rejected: ${JSON.stringify(result.rejected.input)}`);
    console.log(`MCP tool: ${result.tool.name}`);
    console.log('Review the draft. No endpoint was called and no preference changed.');
    console.log('Use --json to inspect the complete contract and tool description.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = error.message.startsWith('Usage:') ? 2 : 1;
  });
}
