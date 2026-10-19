import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const MANIFEST_NAME = 'anchao-preload-manifest.json';
const WORKER_NAME = 'anchao-preload-sw.js';
const DOCUMENT_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.rst', '.adoc', '.asciidoc', '.log', '.map']);
const DOCUMENT_NAMES = new Set(['readme', 'license', 'licence', 'notice', 'changelog', 'contributing', 'authors', 'code_of_conduct']);
const SYSTEM_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini', '.gitkeep']);
export const STARTUP_GROUPS = ['shared', 'act1', 'act2', 'act3', 'act4'];
const digest = (value) => createHash('sha256').update(value).digest('hex');
const encodedPath = (path) => path.split('/').map(encodeURIComponent).join('/');

function act4AssetSource(id, file) {
  const match = /^IMG_A4_(T(?:01|05|06|07|08|09|10))_\d{3}$/.exec(id);
  return match && file === `${id}.png` ? `../第四幕/${match[1]}/${file}` : null;
}

function rhythmAssetSource(id, file) {
  return ['IMG_A4_BLOG_WINDOW_001', 'IMG_A4_FINAL_READING_001', 'IMG_A4_READING_DETAIL_001'].includes(id) && file === `${id}.png`
    ? `../第四幕/UX-RHYTHM/${file}` : null;
}

function investmentAssetSource(id, file) {
  const allowed = /^IMG_A2_SCHOOL_(?:MAP|BUILDING|GATE|CORRIDOR|XIAOA|XIAOYUE|RESTROOM|HONOR|OFFICE|NOTICE|NOTE|NOTE_DETAIL|RANK_PAPER|COURTYARD|PLAYGROUND|DORM)_001$/.test(id)
    || id === 'IMG_A2_T07_TRAIL_WALK_001' || id === 'IMG_A3_SIGN_FULL_001' || id === 'IMG_A3_BOARD_FULL_001'
    || id === 'IMG_A3_COMPARE_STATUE_DETAIL_001' || /^IMG_A3_DETAIL_T0[0-7]_[A-Z0-9_]+$/.test(id)
    || /^IMG_A4_ZOOM_/.test(id);
  return allowed && file === `${id}.webp` ? `src/assets/ux-investigation-20261014/${file}` : null;
}

async function loadAssetGroups(root) {
  try {
    const [imagesText, mapText] = await Promise.all([
      readFile(join(root, 'data/images.json'), 'utf8'),
      readFile(join(root, 'src/assets/compressed/asset-map.json'), 'utf8'),
    ]);
    const images = JSON.parse(imagesText).items;
    const compressed = JSON.parse(mapText).entries;
    const groupsBySource = new Map();
    const add = (source, act) => {
      if (!source || !Number.isInteger(act) || act < 1 || act > 4) return;
      const groups = groupsBySource.get(source) ?? new Set();
      groups.add(`act${act}`);
      groupsBySource.set(source, groups);
    };
    const candidates = (image) => {
      const file = image.file;
      if (!file) return [];
      return [
        `../Photo_src/${file}`, `../第二幕/${file}`, `../第三幕/${file}`,
        act4AssetSource(image.id, file), rhythmAssetSource(image.id, file),
        investmentAssetSource(image.id, file),
        `src/assets/ui-field-20261019/${file}`,
      ].filter(Boolean);
    };
    for (const image of images) {
      for (const source of candidates(image)) {
        const output = compressed[source];
        if (output) { add(`src/assets/compressed/${output}`, image.act); break; }
        if (source.startsWith('src/assets/')) { add(source, image.act); break; }
      }
    }
    // These first-act photos are reused by bridge and school/temple investigations.
    const crossAct = new Map([
      ['IMG_A1_I_001', ['act2', 'act3']], ['IMG_A1_I_002', ['act2']],
      ['IMG_A1_I_003', ['act2', 'act3']], ['IMG_A1_H_003', ['act2']],
    ]);
    for (const image of images) {
      const extra = crossAct.get(image.id);
      if (!extra) continue;
      for (const source of candidates(image)) {
        const output = compressed[source];
        const resolved = output ? `src/assets/compressed/${output}` : source.startsWith('src/assets/') ? source : null;
        if (!resolved) continue;
        const groups = groupsBySource.get(resolved) ?? new Set();
        extra.forEach((group) => groups.add(group));
        groupsBySource.set(resolved, groups);
        break;
      }
    }
    return groupsBySource;
  } catch (error) {
    if (error.code === 'ENOENT') return new Map();
    throw error;
  }
}

function groupsForFile(fileName, originalFileNames, groupsBySource) {
  if (/\.(?:js|css)$/i.test(fileName)) return ['shared'];
  const groups = new Set();
  for (const source of originalFileNames ?? []) {
    const normalized = source.replaceAll('\\', '/').replace(/^\//, '');
    for (const [known, knownGroups] of groupsBySource) {
      if (normalized.endsWith(known.replace(/^\//, ''))) knownGroups.forEach((group) => groups.add(group));
    }
    if (normalized.endsWith('src/assets/novel/anchao-original.html')) groups.add('act4');
    if (normalized.includes('src/assets/ux-finale-20261008/')) groups.add('act4');
  }
  if (fileName.endsWith('.html') && /(?:novel|original)/i.test(fileName)) groups.add('act4');
  if (!groups.size) groups.add('shared');
  return [...groups].sort((a, b) => STARTUP_GROUPS.indexOf(a) - STARTUP_GROUPS.indexOf(b));
}

function isNonRuntimeFile(fileName) {
  const parts = fileName.replaceAll('\\', '/').split('/');
  const name = parts.at(-1).toLowerCase();
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const stem = extension ? name.slice(0, -extension.length) : name;
  return parts.some((part) => ['docs', 'documentation', 'developer-docs', 'dev-docs'].includes(part.toLowerCase()))
    || name.startsWith('._') || SYSTEM_FILES.has(name) || DOCUMENT_NAMES.has(stem) || DOCUMENT_EXTENSIONS.has(extension);
}

async function publicFiles(directory, prefix = '') {
  if (!directory) return [];
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = await Promise.all(entries.map(async (entry) => {
    const path = prefix + entry.name;
    if (entry.isDirectory()) return publicFiles(join(directory, entry.name), `${path}/`);
    if (entry.isFile()) return [{ fileName: path, source: await readFile(join(directory, entry.name)) }];
    return [];
  }));
  return files.flat();
}

export function createStartupManifest(base, files, groupsByFile = new Map()) {
  const resources = files.filter(({ fileName }) => !['index.html', MANIFEST_NAME, WORKER_NAME].includes(fileName) && !isNonRuntimeFile(fileName))
    .map(({ fileName, source }) => {
      if (!fileName || fileName.startsWith('/') || fileName.split('/').some((part) => part === '..' || part === '.')) throw new Error('Unsafe startup resource path');
      const content = typeof source === 'string' ? Buffer.from(source) : source;
      const groups = groupsByFile instanceof Map ? groupsByFile.get(fileName) : groupsByFile[fileName];
      const normalizedGroups = [...new Set((groups?.length ? groups : ['shared']).filter((group) => STARTUP_GROUPS.includes(group)))].sort((a, b) => STARTUP_GROUPS.indexOf(a) - STARTUP_GROUPS.indexOf(b));
      if (!normalizedGroups.length) throw new Error(`Startup resource has no group: ${fileName}`);
      return { path: encodedPath(fileName), bytes: content.byteLength, sha256: digest(content), groups: normalizedGroups };
    }).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (new Set(resources.map(({ path }) => path)).size !== resources.length) throw new Error('Duplicate startup resource path');
  const groups = Object.fromEntries(STARTUP_GROUPS.map((id) => {
    const members = resources.filter((item) => item.groups.includes(id));
    return [id, { resources: members.length, totalBytes: members.reduce((sum, item) => sum + item.bytes, 0) }];
  }));
  const version = digest(JSON.stringify({ base, resources, groups }));
  return { schema: 2, version, base, totalBytes: resources.reduce((sum, item) => sum + item.bytes, 0), groups, resources };
}

export function startupManifestPlugin() {
  let config;
  return {
    name: 'anchao-startup-manifest',
    apply: 'build',
    configResolved(value) { config = value; },
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        // The file:// distribution is a single IIFE and must not acquire a web bootstrap.
        if (config.build.lib || config.build.ssr) return;
        const assetGroups = await loadAssetGroups(config.root);
        const emitted = Object.values(bundle).map((item) => ({
          fileName: item.fileName,
          source: item.type === 'chunk' ? item.code : item.source,
          originalFileNames: item.originalFileNames ?? [],
        }));
        const grouped = new Map(emitted.map((item) => [item.fileName, groupsForFile(item.fileName, item.originalFileNames, assetGroups)]));
        const external = await publicFiles(config.publicDir);
        const manifest = createStartupManifest(config.base, [...emitted, ...external], grouped);
        const html = bundle['index.html'];
        if (!html || html.type !== 'asset' || typeof html.source !== 'string') throw new Error('Startup manifest requires the web HTML entry');
        html.source = html.source.replace('</head>', `<meta name="anchao-preload-version" content="${manifest.version}" /></head>`);
        this.emitFile({ type: 'asset', fileName: MANIFEST_NAME, source: `${JSON.stringify(manifest)}\n` });
      },
    },
  };
}
