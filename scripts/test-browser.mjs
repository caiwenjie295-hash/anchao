import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const candidates = [
  process.env.ANCHAO_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const browser = candidates.find(existsSync);
if (!browser) throw new Error('Chrome or Edge not found; set ANCHAO_BROWSER to its executable path');
const entry = resolve('暗潮离线/index.html');
assert.ok(existsSync(entry), 'Run npm run build:offline first');
const profile = await mkdtemp(join(tmpdir(), 'anchao-browser-smoke-'));
try {
  const result = spawnSync(browser, [
    '--headless=new', '--no-first-run', '--disable-gpu', '--disable-background-networking',
    `--user-data-dir=${profile}`, '--dump-dom', pathToFileURL(entry).href,
  ], { encoding: 'utf8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<main class="desktop(?:\s[^\"]*)?"/);
  assert.match(result.stdout, /data-story-transition="TRANSITION_A1_INTRO"/);
  assert.match(result.stdout, /file:\/\/\/.*\/assets\/UI2\.webp/);
  assert.doesNotMatch(result.stdout + result.stderr, /ERR_FILE_NOT_FOUND|Uncaught TypeError|Uncaught ReferenceError/);
  assert.doesNotMatch(result.stdout, /(?:src|href)="https?:\/\//i);
  console.log(`PASS: ${browser} opened ${pathToFileURL(entry).href} and mounted the desktop with local images`);
} finally {
  assert.ok(resolve(profile).startsWith(resolve(tmpdir()) + sep), 'Browser profile outside temporary directory');
  await rm(profile, { recursive: true, force: true });
}
