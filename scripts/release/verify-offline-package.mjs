import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, sep } from 'node:path';
import { inspectGitSource } from './sourceState.mjs';

const directory = resolve('暗潮离线');
const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
assert.equal(typeof manifest.gitSha, 'string');
assert.match(manifest.gitSha, /^[0-9a-f]{40,64}$/i, 'manifest must record a full Git commit');
assert.equal(manifest.buildVersion.endsWith(manifest.gitSha.slice(0, 8)), true, 'build version must include its source commit');
assert.equal(manifest.entry, 'index.html');
assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
assert.equal(manifest.totalBytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
assert.equal(new Set(manifest.files.map((file) => file.path)).size, manifest.files.length, 'manifest paths must be unique');

const rootPrefix = `${directory}${sep}`;
for (const file of manifest.files) {
  assert.equal(typeof file.path, 'string');
  const path = resolve(directory, file.path);
  assert.ok(path.startsWith(rootPrefix), `manifest path escapes the package: ${file.path}`);
  const bytes = await readFile(path);
  assert.equal(bytes.byteLength, file.bytes, `size mismatch for ${file.path}`);
  assert.match(file.sha256 ?? '', /^[0-9a-f]{64}$/i, `missing SHA-256 for ${file.path}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `content hash mismatch for ${file.path}`);
}

const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(manifest.gitSha, gitSha, 'manifest source commit does not match the current checkout');
assert.equal(typeof manifest.buildEnvironment?.node, 'string');
assert.match(manifest.source?.contentHash ?? '', /^[0-9a-f]{64}$/i);
const sourceState = await inspectGitSource();
assert.equal(manifest.source.contentHash, sourceState.sourceContentHash, 'package source hash does not match the current inputs');
console.log(`PASS: ${manifest.files.length} offline files, ${manifest.totalBytes} bytes, commit ${manifest.gitSha.slice(0, 8)}`);
