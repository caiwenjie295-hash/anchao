import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const group = process.argv[2];
if (!['unit', 'component', 'acceptance'].includes(group)) throw new Error(`Unknown test group: ${group}`);
async function list(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? list(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const tests = (await list('src')).filter((path) => /\.test\.tsx?$/.test(path));
const isUnit = (path) => path.startsWith(join('src', 'data')) || path.endsWith(join('core', 'assetLoader.test.ts')) || path.endsWith(join('browser', 'browserPresentation.test.ts'));
const selected = tests.filter((path) => group === 'unit' ? isUnit(path) : group === 'acceptance' ? path.includes('.acceptance.test.') : !isUnit(path) && !path.includes('.acceptance.test.'));
if (!selected.length) throw new Error(`No ${group} tests found`);
const args = ['node_modules/vitest/vitest.mjs', 'run', ...selected, ...(group === 'unit' ? ['--environment', 'node'] : [])];
const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
process.exit(result.status ?? 1);
