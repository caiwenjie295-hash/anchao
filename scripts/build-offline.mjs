import { build } from 'vite';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { inspectGitSource } from './release/sourceState.mjs';

const directory = '暗潮离线';
const result = await build({
  base: './',
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    minify: true,
    write: false,
    assetsInlineLimit: 0,
    lib: { entry: 'src/main.tsx', name: 'Anchao', formats: ['iife'] },
    cssCodeSplit: false,
  },
});
const output = result[0].output;
const chunks = output.filter((item) => item.type === 'chunk');
const styles = output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'));
if (chunks.length !== 1 || styles.length !== 1) throw new Error('Expected one offline script and stylesheet');
// Replace only files recorded by our previous build; leave unknown user files untouched.
try {
  const previous = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
  for (const file of previous.files ?? []) {
    if (typeof file.path !== 'string' || !/^assets\/[^/\\]+$/.test(file.path)) continue;
    await rm(join(directory, file.path), { force: true });
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const files = [];
await mkdir(join(directory, 'assets'), { recursive: true });
for (const item of output) {
  if (item.fileName.includes('/') || item.fileName.includes('\\') || item.fileName === '.' || item.fileName === '..') {
    throw new Error(`Unexpected output path: ${item.fileName}`);
  }
  const name = item === chunks[0] ? 'app.js' : item === styles[0] ? 'app.css' : item.fileName;
  const contents = item.type === 'chunk' ? item.code : item.source;
  const bytes = Buffer.byteLength(contents);
  await writeFile(join(directory, 'assets', name), contents);
  files.push({ path: `assets/${name}`, bytes, sha256: createHash('sha256').update(contents).digest('hex') });
}
const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>暗潮</title><link rel="stylesheet" href="./assets/app.css"></head><body><div id="root"></div><script src="./assets/app.js"></script></body></html>\n';
await writeFile(join(directory, 'index.html'), html, 'utf8');
files.unshift({ path: 'index.html', bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex') });
const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceState = await inspectGitSource();
const npmVersion = process.env.npm_config_user_agent?.match(/(?:^|\s)npm\/([^\s]+)/)?.[1] ?? null;
const manifest = {
  buildVersion: `${new Date().toISOString()}-${gitSha.slice(0, 8)}`,
  gitSha,
  entry: 'index.html',
  files,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  buildEnvironment: { node: process.version, npm: npmVersion, platform: process.platform, arch: process.arch },
  source: {
    contentHash: sourceState.sourceContentHash,
    dirty: sourceState.contentDirtyPaths.length > 0 || sourceState.untrackedPaths.length > 0,
    contentDirtyPaths: sourceState.contentDirtyPaths,
    untrackedPaths: sourceState.untrackedPaths,
    modeOnlyPaths: sourceState.modeOnlyPaths,
  },
};
await writeFile(join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`已生成：${directory}/index.html（${files.length} 个文件，${(manifest.totalBytes / 1024 / 1024).toFixed(2)} MiB）`);
