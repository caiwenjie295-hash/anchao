import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(await readFile('docs/work_orders/工单/AS-OPS-20261015-assets.json', 'utf8'));
const baseline = manifest.baseline;
const candidates = manifest.candidates;
const byId = new Map(candidates.map((row) => [row.id, row]));
const allowed = new Set(candidates.flatMap((row) => [row.sourcePath, row.publishedPath]));
const changed = [];

function fail(message) { throw new Error(message); }
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) fail(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function assertImage(bytes, path) {
  const png = path.endsWith('.png');
  if (png && !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) fail(`Invalid PNG: ${path}`);
  if (!png && (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP')) fail(`Invalid WebP: ${path}`);
}

if (candidates.length !== 44 || byId.size !== 44) fail('The candidate manifest must contain 44 unique IDs.');
const touchedAssets = git(['diff', '--name-only', baseline, 'HEAD', '--', 'src/']).trim().split('\n').filter(Boolean);
for (const path of touchedAssets) if (!allowed.has(path)) fail(`Non-candidate source changed: ${path}`);

for (const row of candidates) {
  const source = await readFile(row.sourcePath);
  const published = await readFile(row.publishedPath);
  assertImage(source, row.sourcePath);
  assertImage(published, row.publishedPath);
  const sourceChanged = sha(source) !== row.sourcePathSha256;
  const publishedChanged = sha(published) !== row.publishedPathSha256;
  if (row.type === 'source-and-published' && sourceChanged !== publishedChanged) fail(`Source/WebP mismatch: ${row.id}`);
  if (row.type !== 'source-and-published' && row.sourcePath !== row.publishedPath) fail(`Expected one published file: ${row.id}`);
  if (row.parentId && !byId.has(row.parentId)) fail(`Unknown parent for ${row.id}: ${row.parentId}`);
  if (sourceChanged || publishedChanged) changed.push(row.id);
}

const changedIds = new Set(changed);
for (const row of candidates) {
  if (row.parentId && changedIds.has(row.parentId) && !changedIds.has(row.id)) fail(`Changed parent still has old zoom: ${row.id}`);
}

const protectedPaths = [
  'data/images.json',
  'src/assets/compressed/asset-map.json',
  'src/data/narrative/act4Narrative.ts',
  'src/assets/novel/anchao-original.html',
  '暗潮_0916_小A.docx',
  '暗潮_0916_校订稿.pdf',
];
const protectedChanges = git(['diff', '--name-only', baseline, 'HEAD', '--', ...protectedPaths]).trim();
if (protectedChanges) fail(`Protected sources changed:\n${protectedChanges}`);
console.log(JSON.stringify({ baseline, candidates: candidates.length, replaced: changed.length, retained: candidates.length - changed.length, changedIds: changed }, null, 2));
