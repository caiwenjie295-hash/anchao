import { readFile } from 'node:fs/promises';

const expected = (await readFile('.node-version', 'utf8')).trim();
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const actual = process.version.replace(/^v/, '');
if (packageJson.engines?.node !== expected) throw new Error(`package.json requires Node ${packageJson.engines?.node ?? '(unset)'}, but .node-version pins ${expected}`);
if (actual !== expected) throw new Error(`Expected Node ${expected}; current process is ${process.version}`);
console.log(`PASS: Node ${actual} matches .node-version${process.env.npm_config_user_agent ? ` (${process.env.npm_config_user_agent})` : ''}`);
