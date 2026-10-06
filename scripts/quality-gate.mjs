import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { collectTestInventory, partitionTests } from './quality/testInventory.mjs';

const node = process.execPath;
const args = process.argv.slice(2);
const releaseMode = args.includes('--release');
const baseArg = args.find((arg) => arg.startsWith('--base-ref='));
const baseRef = baseArg ? baseArg.slice('--base-ref='.length) : args.find((arg) => !arg.startsWith('--'));

function run(command, commandArgs) {
  console.log(`== ${command} ${commandArgs.join(' ')} ==`);
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function gitOutput(commandArgs) {
  const result = spawnSync('git', commandArgs, { encoding: 'utf8', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git ${commandArgs.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function verifyBranchChanges(base) {
  gitOutput(['rev-parse', '--verify', `${base}^{commit}`]);
  console.log('== Branch and commits ==');
  run('git', ['status', '--short', '--branch']);
  run('git', ['log', '--oneline', '--decorate', `${base}..HEAD`]);
  console.log('== Branch changed paths ==');
  run('git', ['diff', '--name-status', `${base}...HEAD`]);
  const changedPaths = gitOutput(['diff', '--name-only', `${base}...HEAD`]).split(/\r?\n/).filter(Boolean);
  run('git', ['diff', '--check', `${base}...HEAD`]);
  const forbidden = changedPaths.filter((path) => /(^|\/)(node_modules|dist|暗潮\.html|\.DS_Store)(\/|$)/i.test(path.replaceAll('\\', '/')));
  if (forbidden.length) throw new Error(`Branch changes generated or local paths: ${forbidden.join(', ')}`);
}

if (releaseMode) run(node, ['scripts/release/verify-source.mjs']);
if (baseRef) verifyBranchChanges(baseRef);

run('git', ['diff', '--check']);
run('git', ['diff', '--cached', '--check']);
run(node, ['scripts/quality/verify-node-version.mjs']);

const tests = await collectTestInventory();
const groups = partitionTests(tests);
const grouped = [...groups.unit, ...groups.component, ...groups.acceptance];
if (grouped.length !== tests.length || new Set(grouped).size !== tests.length) {
  throw new Error('Test groups must cover every discovered test exactly once.');
}
console.log(`Discovered ${tests.length} tests: ${groups.unit.length} unit, ${groups.component.length} component, ${groups.acceptance.length} acceptance.`);

run(node, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json']);
for (const group of ['unit', 'component', 'acceptance']) run(node, ['scripts/run-test-group.mjs', group]);
run(node, ['node_modules/typescript/bin/tsc', '-b']);
run(node, ['node_modules/vite/bin/vite.js', 'build']);
run(node, ['scripts/build-offline.mjs']);
run(node, ['scripts/verify-offline.mjs']);
run(node, ['scripts/release/verify-offline-package.mjs']);
const manifest = JSON.parse(await readFile('暗潮离线/manifest.json', 'utf8'));
if (manifest.totalBytes > 150 * 1024 * 1024) throw new Error('Offline package exceeds 150 MiB budget');
run(node, ['scripts/test-browser.mjs']);
console.log('QUALITY GATE PASSED');
