// The CLI is the only entry point most people will use, so its exit codes are
// part of the contract: 0 pass, 1 measured failure, 2 misuse.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "src", "cli.mjs");

async function hardwire(args) {
  try {
    const { stdout } = await exec(process.execPath, [CLI, ...args], { cwd: ROOT });
    return { code: 0, stdout };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? "" };
  }
}

test("corpus reports the aggregate and exits 1 when cases fail", async () => {
  const { code, stdout } = await hardwire(["corpus", "examples/corpus", "--json"]);
  const report = JSON.parse(stdout);

  assert.equal(code, 1);
  assert.equal(report.mean, 68.3);
  assert.equal(report.passed, 1);
  assert.equal(report.inventedMutations, 1);
  assert.equal(report.readError, 0);
  assert.equal(report.readPorts, 2);
  assert.equal(report.inventedPayments, 0);
});

test("a panel compared with itself passes from the command line", async () => {
  const { code, stdout } = await hardwire([
    "score",
    "--expected", "examples/example-panel.json",
    "--actual", "examples/example-panel.json",
  ]);

  assert.equal(code, 0);
  assert.match(stdout, /score 100\/100/);
});

test("an invented mutation fails even when --fail-under is zero", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hardwire-cli-"));
  try {
    const panel = JSON.parse(await readFile(join(ROOT, "examples", "example-panel.json"), "utf8"));
    panel.ports.push({ id: "publish-everything", kind: "write", summary: "Not a real port." });
    const actual = join(dir, "actual.json");
    await writeFile(actual, JSON.stringify(panel));

    const { code } = await hardwire([
      "score",
      "--expected", "examples/example-panel.json",
      "--actual", actual,
      "--fail-under", "0",
    ]);

    assert.equal(code, 1, "a high score must not excuse an operation the site never offered");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("misuse exits 2, distinct from a measured failure", async () => {
  assert.equal((await hardwire([])).code, 2);
  assert.equal((await hardwire(["corpus", "examples/does-not-exist"])).code, 2);
  assert.equal((await hardwire(["nonsense", "examples/example-panel.json"])).code, 2);
});

test("--help exits 0 and points at the spec", async () => {
  const { code, stdout } = await hardwire(["--help"]);

  assert.equal(code, 0);
  assert.match(stdout, /hardwire corpus/);
  assert.match(stdout, /docs\/SPEC\.md/);
});

test("--version prints the package version", async () => {
  const { code, stdout } = await hardwire(["--version"]);
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));

  assert.equal(code, 0);
  assert.equal(stdout.trim(), pkg.version);
});

test('flags and extra arguments cannot silently change user intent', async () => {
  for (const args of [
    ['validate', 'examples/example-panel.json', 'extra'],
    ['validate', 'examples/example-panel.json', '--draft'],
    ['trace', 'examples/example-panel.json', 'search-catalogue', '--params', '{}', '--params-file', 'x'],
    ['infer', 'https://example.com', '--html', '--draft'],
    ['probe', 'https://example.com', '--timeout', '2147483648'],
    ['validate', 'examples/example-panel.json', '--json', '--json'],
  ]) assert.equal((await hardwire(args)).code, 2, args.join(' '));
});

test('offline inference and trace verification work through the documented CLI', async () => {
  const inferred = await hardwire(['infer', 'https://blog.example.com', '--html', 'examples/corpus/blog/page.html', '--draft']);
  assert.equal(inferred.code, 0);
  assert.equal(JSON.parse(inferred.stdout).panel, 'hardwire.panel/1');
  const dir = await mkdtemp(join(tmpdir(), 'hardwire-verify-'));
  try {
    const paramsFile = join(dir, 'params.json');
    await writeFile(paramsFile, '{"query":"lamp"}');
    const trace = await hardwire(['trace', 'examples/example-panel.json', 'search-catalogue', '--params-file', paramsFile, '--json']);
    assert.equal(trace.code, 0);
    const traceFile = join(dir, 'trace.json');
    await writeFile(traceFile, trace.stdout);
    const verified = await hardwire(['verify', traceFile, '--panel', 'examples/example-panel.json', '--json']);
    assert.equal(verified.code, 0);
    assert.deepEqual(JSON.parse(verified.stdout), { valid: true, panelChecked: true });
    await writeFile(traceFile, trace.stdout.replace('lamp', 'changed'));
    assert.equal((await hardwire(['verify', traceFile])).code, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
