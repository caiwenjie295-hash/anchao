import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareStartup } from './prepareStartup';
import { sha256 } from './preload';

const version = 'a'.repeat(64);
function shell() {
  document.head.innerHTML = `<meta name="anchao-preload-version" content="${version}">`;
  document.body.innerHTML = '<div id="anchao-startup"><p id="anchao-startup-copy"></p><div role="progressbar"><div id="anchao-startup-fill"></div></div><p id="anchao-startup-progress"></p><button id="anchao-startup-retry"></button></div>';
  vi.stubEnv('PROD', true);
  vi.stubEnv('BASE_URL', '/AnChao/');
  vi.useFakeTimers();
}
async function manifest() {
  const bytes = new TextEncoder().encode('photo');
  return { schema: 1, version, base: '/AnChao/', totalBytes: bytes.length, resources: [{ path: 'assets/photo.webp', bytes: bytes.length, sha256: await sha256(bytes) }] };
}
afterEach(() => {
  vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  document.body.innerHTML = ''; document.head.innerHTML = '';
});

describe('startup gate', () => {
  it('keeps moving below completion during a slow download, exposes retry on failure, and enters only after real success', async () => {
    const list = await manifest();
    shell();
    let finish: ((response: Response) => void) | undefined;
    let first = true;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('anchao-preload-manifest.json')) return new Response(JSON.stringify(list));
      if (first) return new Promise<Response>((resolve) => { finish = resolve; });
      return new Response('photo');
    }));
    let entered = false;
    const ready = prepareStartup().then(() => { entered = true; });
    await vi.advanceTimersByTimeAsync(60_000);
    const shown = Number(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'));
    expect(shown).toBeGreaterThan(3);
    expect(shown).toBeLessThanOrEqual(95);
    expect(entered).toBe(false);
    finish!(new Response('missing', { status: 404 }));
    await vi.advanceTimersByTimeAsync(1);
    const retry = document.getElementById('anchao-startup-retry') as HTMLButtonElement;
    expect(retry.hidden).toBe(false);
    expect(document.getElementById('anchao-startup-copy')?.textContent).toContain('加载暂时中断');
    expect(entered).toBe(false);
    first = false;
    retry.click();
    await vi.advanceTimersByTimeAsync(500);
    await ready;
    expect(entered).toBe(true);
    expect(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
  });

  it('requests a page refresh rather than retrying a new manifest against an old app version', async () => {
    const list = await manifest();
    shell();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...list, version: 'b'.repeat(64) }))));
    let entered = false;
    void prepareStartup().then(() => { entered = true; });
    await vi.advanceTimersByTimeAsync(1);
    expect(document.getElementById('anchao-startup-copy')?.textContent).toBe('页面已更新，请刷新后继续。');
    expect(document.getElementById('anchao-startup-retry')?.textContent).toBe('刷新页面');
    expect(entered).toBe(false);
  });

  it('does not fetch a nonexistent web manifest in development or an offline entry without the shell', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await prepareStartup();
    shell();
    vi.stubEnv('PROD', false);
    await prepareStartup();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires refresh if an entry stylesheet failed, rather than mounting an unstyled game after a warmup', async () => {
    shell();
    document.getElementById('anchao-startup')!.dataset.entryError = 'true';
    vi.stubGlobal('fetch', vi.fn());
    let entered = false;
    void prepareStartup().then(() => { entered = true; });
    await vi.advanceTimersByTimeAsync(1);
    expect(document.getElementById('anchao-startup-copy')?.textContent).toBe('页面未能完整加载，请刷新后重试。');
    expect(document.getElementById('anchao-startup-retry')?.textContent).toBe('刷新页面');
    expect(entered).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
