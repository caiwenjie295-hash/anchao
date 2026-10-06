import { spawnSync } from 'node:child_process';
import { collectTestInventory, partitionTests } from './quality/testInventory.mjs';

const group = process.argv[2];
if (!['unit', 'component', 'acceptance'].includes(group)) throw new Error(`Unknown test group: ${group}`);
const tests = await collectTestInventory();
const selected = partitionTests(tests)[group];
if (!selected.length) throw new Error(`No ${group} tests found`);
const args = ['node_modules/vitest/vitest.mjs', 'run', ...selected, ...(group === 'unit' ? ['--environment', 'node'] : [])];
const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
process.exit(result.status ?? 1);
