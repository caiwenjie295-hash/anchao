import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(await readFile('docs/work_orders/工单/AS-OPS-20261015-assets.json', 'utf8'));
const baseline = manifest.baseline;
const candidates = manifest.candidates;
const byId = new Map(candidates.map((row) => [row.id, row]));
const allowed = new Set(candidates.flatMap((row) => [row.sourcePath, row.publishedPath]));
const changed = [];
const retainedDimensionDifferences = [];

function fail(message) { throw new Error(message); }
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) fail(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function assertImage(bytes, path) {
  const png = path.endsWith('.png');
  if (png && !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) fail(`Invalid PNG: ${path}`);
  if (!png && (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP')) fail(`Invalid WebP: ${path}`);
}
function dimensions(bytes, path) {
  assertImage(bytes, path);
  if (path.endsWith('.png')) return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + size > bytes.length) fail(`Truncated WebP: ${path}`);
    if (kind === 'VP8X') return [bytes.readUIntLE(data + 4, 3) + 1, bytes.readUIntLE(data + 7, 3) + 1];
    if (kind === 'VP8 ') return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff];
    if (kind === 'VP8L') {
      const bits = bytes.readUInt32LE(data + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = data + size + (size % 2);
  }
  fail(`Missing WebP image dimensions: ${path}`);
}
function baselineBytes(path) {
  const result = spawnSync('git', ['show', `${baseline}:${path}`], { maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) fail(`Cannot read baseline: ${path}`);
  return result.stdout;
}

if (candidates.length !== 44 || byId.size !== 44) fail('The candidate manifest must contain 44 unique IDs.');
const touchedAssets = git(['diff', '--name-only', '-z', baseline, '--', 'src/']).split('\0').filter(Boolean);
for (const path of touchedAssets) if (!allowed.has(path)) fail(`Non-candidate source changed: ${path}`);
const audit = JSON.parse(await readFile('docs/as-ops-20261015/art/audit.json', 'utf8'));
const audited = new Map(audit.candidates.map(row => [row.id, row]));
if (audit.candidates.length !== 44 || audited.size !== 44) fail('Art audit must cover exactly 44 unique candidates.');

for (const row of candidates) {
  const source = await readFile(row.sourcePath);
  const published = await readFile(row.publishedPath);
  for (const [path, bytes, expectedHash] of [[row.sourcePath, source, row.sourcePathSha256], [row.publishedPath, published, row.publishedPathSha256]]) {
    const before = baselineBytes(path);
    if (sha(before) !== expectedHash) fail(`Manifest baseline hash mismatch: ${row.id}: ${path}`);
    if (String(dimensions(bytes, path)) !== String(dimensions(before, path))) fail(`Image dimensions changed: ${row.id}: ${path}`);
  }
  const sourceChanged = sha(source) !== row.sourcePathSha256;
  const publishedChanged = sha(published) !== row.publishedPathSha256;
  const sourceDimensions = dimensions(source, row.sourcePath);
  const publishedDimensions = dimensions(published, row.publishedPath);
  if (String(sourceDimensions) !== String(publishedDimensions)) {
    if (sourceChanged || publishedChanged) fail(`Source/WebP dimensions mismatch: ${row.id}`);
    // Historic compressed copies may be smaller. Both hashes and each file's
    // baseline dimensions were checked above; retaining them preserves delivery.
    retainedDimensionDifferences.push({ id: row.id, sourceDimensions, publishedDimensions });
  }
  if (row.type === 'source-and-published' && sourceChanged !== publishedChanged) fail(`Source/WebP mismatch: ${row.id}`);
  if (row.type !== 'source-and-published' && row.sourcePath !== row.publishedPath) fail(`Expected one published file: ${row.id}`);
  if (row.parentId && !byId.has(row.parentId)) fail(`Unknown parent for ${row.id}: ${row.parentId}`);
  const entry = audited.get(row.id);
  if (!entry?.reason?.trim()) fail(`Missing audit reason: ${row.id}`);
  if (entry.status !== (sourceChanged || publishedChanged ? 'replaced' : 'retained')) fail(`Audit status mismatch: ${row.id}`);
  if (entry.sourceSha256 !== sha(source) || entry.publishedSha256 !== sha(published)) fail(`Audit output hash mismatch: ${row.id}`);
  if (entry.status === 'replaced') {
    for (const path of [entry.promptPath, entry.nativePath]) {
      if (typeof path !== 'string' || !path.startsWith('docs/as-ops-20261015/art/') || path.split('/').includes('..')) fail(`Invalid art provenance path: ${row.id}`);
    }
    const native = await readFile(entry.nativePath);
    if (sha(native) !== entry.nativeSha256) fail(`Native image hash mismatch: ${row.id}`);
    assertImage(native, entry.nativePath);
    if (!(await readFile(entry.promptPath, 'utf8')).trim()) fail(`Empty original prompt: ${row.id}`);
  }
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
const protectedChanges = git(['diff', '--name-only', '-z', baseline, '--', ...protectedPaths]).split('\0').filter(Boolean).join('\n');
if (protectedChanges) fail(`Protected sources changed:\n${protectedChanges}`);
console.log(JSON.stringify({ baseline, candidates: candidates.length, replaced: changed.length, retained: candidates.length - changed.length, retainedDimensionDifferences, changedIds: changed }, null, 2));
