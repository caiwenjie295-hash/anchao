// @vitest-environment node
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';
import { createStartupManifest, startupManifestPlugin } from './manifestPlugin.mjs';

describe('production startup resource inventory', () => {
  it('versions runtime content and base, includes independent HTML assets, and filters documents and system files', () => {
    const files = [
      { fileName: 'assets/app.js', source: 'app' }, { fileName: 'assets/original.html', source: 'novel' },
      { fileName: 'assets/site.css', source: 'style' }, { fileName: 'fonts/game.woff2', source: 'font' },
      { fileName: 'assets/music.ogg', source: 'audio' }, { fileName: 'placeholders/图.webp', source: 'photo' },
      { fileName: 'placeholders/README.md', source: 'documentation' }, { fileName: 'manual/guide.markdown', source: 'documentation' },
      { fileName: 'docs/notes.json', source: 'development notes' }, { fileName: '.DS_Store', source: 'system' },
      { fileName: 'Thumbs.db', source: 'system' }, { fileName: 'desktop.ini', source: 'system' },
      { fileName: 'index.html', source: 'entry' }, { fileName: 'anchao-preload-sw.js', source: 'worker' },
      { fileName: 'anchao-preload-manifest.json', source: 'old' },
    ];
    const manifest = createStartupManifest('/AnChao/', files);
    expect(manifest.resources.map((item) => item.path)).toEqual([
      'assets/app.js', 'assets/music.ogg', 'assets/original.html', 'assets/site.css', 'fonts/game.woff2', 'placeholders/%E5%9B%BE.webp',
    ]);
    expect(manifest.totalBytes).toBe(27);
    expect(createStartupManifest('/Other/', files).version).not.toBe(manifest.version);
    expect(createStartupManifest('/AnChao/', [...files, { fileName: 'placeholders/a.webp', source: 'new' }]).version).not.toBe(manifest.version);
    expect(() => createStartupManifest('/', [{ fileName: '../outside', source: '' }])).toThrow();
  });

  it('collects actual bundle and nested public files and binds the emitted HTML to the exact version', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'anchao-startup-test-'));
    try {
      await mkdir(join(directory, 'public/placeholders'), { recursive: true });
      await mkdir(join(directory, 'public/fonts'), { recursive: true });
      await mkdir(join(directory, 'public/audio'), { recursive: true });
      await mkdir(join(directory, 'public/novel'), { recursive: true });
      await writeFile(join(directory, 'index.html'), '<html><head></head><body><script type="module" src="/main.js"></script></body></html>');
      await writeFile(join(directory, 'main.js'), 'document.title="fixture";');
      await writeFile(join(directory, 'public/placeholders/图.webp'), 'photo');
      await writeFile(join(directory, 'public/placeholders/README.md'), 'local development note');
      await writeFile(join(directory, 'public/placeholders/.DS_Store'), 'system metadata');
      await writeFile(join(directory, 'public/fonts/game.woff2'), 'font');
      await writeFile(join(directory, 'public/audio/theme.ogg'), 'audio');
      await writeFile(join(directory, 'public/novel/original.html'), 'novel');
      await writeFile(join(directory, 'public/runtime.css'), 'body{}');
      await writeFile(join(directory, 'public/runtime.js'), 'void 0;');
      await writeFile(join(directory, 'public/anchao-preload-sw.js'), 'worker');
      await build({ configFile: false, root: directory, base: '/AnChao/', plugins: [startupManifestPlugin()], logLevel: 'silent' });
      const manifest = JSON.parse(await readFile(join(directory, 'dist/anchao-preload-manifest.json'), 'utf8'));
      const html = await readFile(join(directory, 'dist/index.html'), 'utf8');
      expect(html).toContain(`name="anchao-preload-version" content="${manifest.version}"`);
      expect(html).toContain('/AnChao/assets/');
      expect(manifest.resources.some(({ path }) => path === `placeholders/${encodeURIComponent('图.webp')}`)).toBe(true);
      for (const path of ['fonts/game.woff2', 'audio/theme.ogg', 'novel/original.html', 'runtime.css', 'runtime.js']) {
        expect(manifest.resources.some((item) => item.path === path), `${path} should be verified`).toBe(true);
      }
      expect(manifest.resources.some(({ path }) => path.endsWith('README.md'))).toBe(false);
      expect(manifest.resources.some(({ path }) => path.endsWith('.DS_Store'))).toBe(false);
      expect(await readFile(join(directory, 'dist/placeholders/README.md'), 'utf8')).toBe('local development note');
      expect(manifest.resources.some(({ path }) => path.endsWith('.js'))).toBe(true);
      expect(manifest.resources.some(({ path }) => path === 'index.html' || path === 'anchao-preload-sw.js')).toBe(false);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
