import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const MANIFEST_NAME = 'anchao-preload-manifest.json';
const WORKER_NAME = 'anchao-preload-sw.js';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const encodedPath = (path) => path.split('/').map(encodeURIComponent).join('/');

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

export function createStartupManifest(base, files) {
  const resources = files.filter(({ fileName }) => !['index.html', MANIFEST_NAME, WORKER_NAME].includes(fileName))
    .map(({ fileName, source }) => {
      if (!fileName || fileName.startsWith('/') || fileName.split('/').some((part) => part === '..' || part === '.')) throw new Error('Unsafe startup resource path');
      const content = typeof source === 'string' ? Buffer.from(source) : source;
      return { path: encodedPath(fileName), bytes: content.byteLength, sha256: digest(content) };
    }).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (new Set(resources.map(({ path }) => path)).size !== resources.length) throw new Error('Duplicate startup resource path');
  const version = digest(JSON.stringify({ base, resources }));
  return { schema: 1, version, base, totalBytes: resources.reduce((sum, item) => sum + item.bytes, 0), resources };
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
        const emitted = Object.values(bundle).map((item) => ({ fileName: item.fileName, source: item.type === 'chunk' ? item.code : item.source }));
        const manifest = createStartupManifest(config.base, [...emitted, ...await publicFiles(config.publicDir)]);
        const html = bundle['index.html'];
        if (!html || html.type !== 'asset' || typeof html.source !== 'string') throw new Error('Startup manifest requires the web HTML entry');
        html.source = html.source.replace('</head>', `<meta name="anchao-preload-version" content="${manifest.version}" /></head>`);
        this.emitFile({ type: 'asset', fileName: MANIFEST_NAME, source: `${JSON.stringify(manifest)}\n` });
      },
    },
  };
}
