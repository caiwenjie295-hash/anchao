// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('versioned game-only service worker', () => {
  it('serves the active version cache and leaves navigation, foreign paths, entry and manifest requests alone', async () => {
    const handlers = new Map();
    const version = 'a'.repeat(64);
    const cached = new Response('verified photo');
    const match = vi.fn(async () => cached);
    const open = vi.fn(async () => ({ match }));
    const network = vi.fn();
    runInNewContext(await readFile(new URL('../../public/anchao-preload-sw.js', import.meta.url), 'utf8'), {
      URL, self: { location: { href: `https://host.test/AnChao/anchao-preload-sw.js?version=${version}` }, addEventListener: (name, handler) => handlers.set(name, handler) },
      caches: { open }, fetch: network,
    });
    const fetchEvent = (url, mode = 'cors', method = 'GET') => ({ request: { url, mode, method }, respondWith: vi.fn() });
    for (const [url, mode, method] of [
      ['https://host.test/AnChao/', 'navigate', 'GET'], ['https://host.test/AnChao/index.html', 'cors', 'GET'],
      ['https://host.test/AnChao/anchao-preload-manifest.json', 'cors', 'GET'], ['https://host.test/AnChao/anchao-preload-sw.js', 'cors', 'GET'],
      ['https://host.test/Other/assets/x.webp', 'cors', 'GET'], ['https://foreign.test/AnChao/assets/x.webp', 'cors', 'GET'],
      ['https://host.test/AnChao/assets/x.webp?old=1', 'cors', 'GET'], ['https://host.test/AnChao/assets/x.webp', 'cors', 'POST'],
    ]) {
      const event = fetchEvent(url, mode, method);
      handlers.get('fetch')(event);
      expect(event.respondWith).not.toHaveBeenCalled();
    }
    const event = fetchEvent('https://host.test/AnChao/assets/x.webp');
    handlers.get('fetch')(event);
    expect(await event.respondWith.mock.calls[0][0]).toBe(cached);
    expect(open).toHaveBeenCalledWith(`anchao-preload:${encodeURIComponent('https://host.test/AnChao/')}:${version}`);
    expect(network).not.toHaveBeenCalled();
  });
});
