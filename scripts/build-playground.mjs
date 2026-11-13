// Build a self-contained static site from an explicit list of portable sources.
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'output/playground');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'src'), { recursive: true });
await mkdir(resolve(output, 'playground'), { recursive: true });
const core = ['browser', 'panel-schema', 'canonical', 'infer-html', 'mcp', 'score'];
const assets = ['index.html', 'styles.css', 'app.mjs', 'worker.mjs', 'model.mjs', 'samples.mjs', 'comparison.mjs'];
for (const name of core) await copyFile(resolve(root, `src/${name}.mjs`), resolve(output, `src/${name}.mjs`));
for (const name of assets) await copyFile(resolve(root, 'playground', name), resolve(output, 'playground', name));
const html = await readFile(resolve(root, 'playground/index.html'), 'utf8');
await writeFile(resolve(output, 'index.html'), html.replace('./styles.css', './playground/styles.css').replace('./app.mjs', './playground/app.mjs'));
await copyFile(resolve(root, 'LICENSE'), resolve(output, 'LICENSE'));
await writeFile(resolve(output, '.nojekyll'), '');
console.log('Static playground built in output/playground. No dependencies or secrets included.');
