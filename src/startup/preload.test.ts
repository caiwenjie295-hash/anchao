import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachePrefix, manifestForGroups, parseManifest, preloadResources, sha256, StartupVersionError, type StartupGroup, type StartupManifest } from './preload';

const base = new URL('https://example.test/AnChao/');
const version = 'a'.repeat(64);
const encoder = new TextEncoder();

async function fixture(count = 6): Promise<StartupManifest> {
  const resources = await Promise.all(Array.from({ length: count }, async (_, index) => {
    const path = `assets/photo-${index}.webp`;
    const bytes = encoder.encode(path);
    return { path, bytes: bytes.byteLength, sha256: await sha256(bytes), groups: ['shared'] as StartupGroup[] };
  }));
  const groupCounts: Record<StartupGroup, { resources: number; totalBytes: number }> = {
    shared: { resources: count, totalBytes: resources.reduce((sum, item) => sum + item.bytes, 0) },
    act1: { resources: 0, totalBytes: 0 }, act2: { resources: 0, totalBytes: 0 },
    act3: { resources: 0, totalBytes: 0 }, act4: { resources: 0, totalBytes: 0 },
  };
  return { schema: 2, version, base: '/AnChao/', totalBytes: groupCounts.shared.totalBytes, groups: groupCounts, resources };
}

function memoryCache() {
  const files = new Map<string, Response>();
  return {
    files,
    cache: {
      match: vi.fn(async (url: string) => files.get(url)?.clone()),
      put: vi.fn(async (url: string, response: Response) => { files.set(url, response.clone()); }),
    } as unknown as Cache,
  };
}

const responseFor = (url: string) => new Response(new URL(url).pathname.slice(base.pathname.length), { headers: { 'content-type': 'image/webp' } });

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('startup manifest and full resource downloads', () => {
  it('binds the HTML version and rejects traversal, other origins, entry files and duplicate URLs', async () => {
    const valid = await fixture();
    expect(parseManifest(valid, base, version)).toBe(valid);
    expect(() => parseManifest(valid, base, 'b'.repeat(64))).toThrow(StartupVersionError);
    for (const path of ['../outside.webp', '%2e%2e/outside.webp', 'https://other.test/AnChao/p.webp', '/assets/image.webp', 'index.html', 'anchao-preload-manifest.json', 'assets/x.webp?old=1']) {
      const invalid = { ...valid, resources: [{ ...valid.resources[0], path }], totalBytes: valid.resources[0].bytes };
      expect(() => parseManifest(invalid, base, version), path).toThrow();
    }
    expect(() => parseManifest({ ...valid, resources: [valid.resources[0], valid.resources[0]], totalBytes: valid.resources[0].bytes * 2 }, base, version)).toThrow();
    expect(cachePrefix(base)).not.toBe(cachePrefix(new URL('https://example.test/Other/')));
  });

  it('selects a deduplicated union of shared and requested act resources', async () => {
    const manifest = await fixture(2);
    const chapterManifest: StartupManifest = {
      ...manifest,
      resources: manifest.resources.map((resource, index) => ({ ...resource, groups: (index === 0 ? ['shared', 'act1'] : ['act2']) as StartupGroup[] })),
      groups: {
        shared: { resources: 1, totalBytes: manifest.resources[0].bytes },
        act1: { resources: 1, totalBytes: manifest.resources[0].bytes },
        act2: { resources: 1, totalBytes: manifest.resources[1].bytes },
        act3: { resources: 0, totalBytes: 0 }, act4: { resources: 0, totalBytes: 0 },
      },
    };
    const firstTwo = manifestForGroups(chapterManifest, ['shared', 'act1', 'act2']);
    expect(firstTwo.resources).toHaveLength(2);
    expect(firstTwo.totalBytes).toBe(manifest.totalBytes);
    expect(manifestForGroups(chapterManifest, ['shared', 'act2']).resources.map(({ path }) => path)).toEqual(['assets/photo-0.webp', 'assets/photo-1.webp']);
  });

  it('does not finish after a failed download; retry reuses verified successes and fetches the missing file', async () => {
    const manifest = await fixture();
    const { cache, files } = memoryCache();
    let fail = true;
    const fetcher = vi.fn(async (url: string) => url.endsWith('photo-1.webp') && fail ? new Response('missing', { status: 404 }) : responseFor(url)) as unknown as typeof fetch;
    const progress = vi.fn();
    await expect(preloadResources(manifest, base, { cache, fetcher, onProgress: progress })).rejects.toThrow();
    expect(progress.mock.calls.every(([done]) => done < manifest.resources.length)).toBe(true);
    const cached = [...files.keys()];
    expect(cached.length).toBeGreaterThan(0);
    fail = false;
    vi.mocked(fetcher).mockClear();
    await preloadResources(manifest, base, { cache, fetcher, onProgress: progress });
    expect(files.size).toBe(manifest.resources.length);
    expect(progress).toHaveBeenLastCalledWith(manifest.resources.length, manifest.resources.length);
    expect(vi.mocked(fetcher).mock.calls.every(([url]) => !cached.includes(String(url)))).toBe(true);
  });

  it('limits network work to four files and can operate without CacheStorage or image decoding', async () => {
    const manifest = await fixture(11);
    let active = 0, peak = 0;
    const fetcher = vi.fn(async (url: string) => {
      active++; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return responseFor(url);
    }) as unknown as typeof fetch;
    await preloadResources(manifest, base, { fetcher, onProgress: vi.fn() });
    expect(peak).toBe(4);
    expect(fetcher).toHaveBeenCalledTimes(11);
  });

  it('rejects stale bytes of a non-hashed public file and does not cache or count them', async () => {
    const manifest = await fixture(1);
    manifest.resources[0].path = 'placeholders/public.webp';
    const { cache, files } = memoryCache();
    const progress = vi.fn();
    const fetcher = vi.fn(async () => new Response('wrong bytes')) as unknown as typeof fetch;
    await expect(preloadResources(manifest, base, { cache, fetcher, onProgress: progress })).rejects.toThrow('version mismatch');
    expect(files.size).toBe(0);
    expect(progress).not.toHaveBeenCalled();
  });

  it('degrades to verified HTTP downloads when private mode or quota rejects cache writes', async () => {
    const manifest = await fixture(2);
    const { cache } = memoryCache();
    vi.mocked(cache.put).mockRejectedValue(new Error('quota'));
    const progress = vi.fn();
    await preloadResources(manifest, base, { cache, fetcher: vi.fn(async (url: string) => responseFor(url)) as unknown as typeof fetch, onProgress: progress });
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });

  it('checks standard SHA-256 vectors even on ordinary HTTP without SubtleCrypto', async () => {
    vi.stubGlobal('crypto', {});
    expect(await sha256(encoder.encode(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(await sha256(encoder.encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(await sha256(encoder.encode('a'.repeat(1_000_000)))).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });
});
