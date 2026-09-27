import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(command, args) {
  console.log(`== ${command} ${args.join(' ')} ==`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('git', ['diff', '--check']);
run('git', ['diff', '--cached', '--check']);
const node = process.execPath;
run(node, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json']);
for (const group of ['unit', 'component', 'acceptance']) run(node, ['scripts/run-test-group.mjs', group]);
run(node, ['node_modules/typescript/bin/tsc', '-b']);
run(node, ['node_modules/vite/bin/vite.js', 'build']);
run(node, ['scripts/build-offline.mjs']);
run(node, ['scripts/verify-offline.mjs']);
run(node, ['scripts/test-browser.mjs']);
const manifest = JSON.parse(readFileSync('暗潮离线/manifest.json', 'utf8'));
if (manifest.totalBytes > 150 * 1024 * 1024) throw new Error('Offline package exceeds 150 MiB budget');
console.log('QUALITY GATE PASSED');
