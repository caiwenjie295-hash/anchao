// @vitest-environment node
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';
import { createStartupManifest, startupManifestPlugin } from './manifestPlugin.mjs';

describe('production startup resource inventory', () => {
  it('versions content and base, includes independent HTML assets, and excludes only the boot files', () => {
    const files = [
      { fileName: 'assets/app.js', source: 'app' }, { fileName: 'assets/original.html', source: 'novel' },
      { fileName: 'index.html', source: 'entry' }, { fileName: 'anchao-preload-sw.js', source: 'worker' },
      { fileName: 'anchao-preload-manifest.json', source: 'old' },
    ];
    const manifest = createStartupManifest('/AnChao/', files);
    expect(manifest.resources.map((item) => item.path)).toEqual(['assets/app.js', 'assets/original.html']);
    expect(manifest.totalBytes).toBe(8);
    expect(createStartupManifest('/Other/', files).version).not.toBe(manifest.version);
    expect(createStartupManifest('/AnChao/', [...files, { fileName: 'placeholders/a.webp', source: 'new' }]).version).not.toBe(manifest.version);
    expect(() => createStartupManifest('/', [{ fileName: '../outside', source: '' }])).toThrow();
  });

  it('collects actual bundle and nested public files and binds the emitted HTML to the exact version', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'anchao-startup-test-'));
    try {
      await mkdir(join(directory, 'public/placeholders'), { recursive: true });
      await writeFile(join(directory, 'index.html'), '<html><head></head><body><script type="module" src="/main.js"></script></body></html>');
      await writeFile(join(directory, 'main.js'), 'document.title="fixture";');
      await writeFile(join(directory, 'public/placeholders/图.webp'), 'photo');
      await writeFile(join(directory, 'public/anchao-preload-sw.js'), 'worker');
      await build({ configFile: false, root: directory, base: '/AnChao/', plugins: [startupManifestPlugin()], logLevel: 'silent' });
      const manifest = JSON.parse(await readFile(join(directory, 'dist/anchao-preload-manifest.json'), 'utf8'));
      const html = await readFile(join(directory, 'dist/index.html'), 'utf8');
      expect(html).toContain(`name="anchao-preload-version" content="${manifest.version}"`);
      expect(html).toContain('/AnChao/assets/');
      expect(manifest.resources.some(({ path }) => path === `placeholders/${encodeURIComponent('图.webp')}`)).toBe(true);
      expect(manifest.resources.some(({ path }) => path.endsWith('.js'))).toBe(true);
      expect(manifest.resources.some(({ path }) => path === 'index.html' || path === 'anchao-preload-sw.js')).toBe(false);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
