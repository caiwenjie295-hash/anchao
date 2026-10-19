import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from './download';
import { StartupLoadError } from './errors';
import { DownloadMetrics } from './metrics';
import { preloadResources, sha256, type StartupManifest } from './preload';

const base = new URL('https://example.test/AnChao/');
const encode = (value: string) => new TextEncoder().encode(value);

async function manifestFor(content: Uint8Array): Promise<StartupManifest> {
  return {
    schema: 2, version: 'a'.repeat(64), base: '/AnChao/', totalBytes: content.byteLength,
    groups: Object.fromEntries(['shared', 'act1', 'act2', 'act3', 'act4'].map((group) => [group, { resources: 1, totalBytes: content.byteLength }])) as StartupManifest['groups'],
    resources: [{ path: 'assets/music.ogg', bytes: content.byteLength, sha256: await sha256(content), groups: ['shared', 'act1', 'act2', 'act3', 'act4'] }],
  };
}

function streamResponse(chunks: Uint8Array[]) {
  let index = 0;
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
  }));
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('startup download and byte metrics', () => {
  it('counts actual streamed chunks and returns the assembled bytes', async () => {
    const chunks = [encode('ab'), encode('cde')];
    const onChunk = vi.fn();
    const result = await downloadFile('https://example.test/AnChao/assets/x.webp', 'assets/x.webp', {}, {
      fetcher: vi.fn(async () => streamResponse(chunks)) as unknown as typeof fetch,
      onChunk,
    });
    expect([...result.bytes]).toEqual([...encode('abcde')]);
    expect(onChunk.mock.calls.map(([size]) => size)).toEqual([2, 3]);
  });

  it('rolls back a failed partial attempt and counts network traffic only once in loaded bytes', async () => {
    const content = encode('verified whole resource');
    const partial = encode('part');
    const manifest = await manifestFor(content);
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls++;
      if (calls > 1) return streamResponse([content]);
      let first = true;
      return new Response(new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (first) { first = false; controller.enqueue(partial); }
          else { await new Promise((resolve) => setTimeout(resolve, 0)); controller.error(new TypeError('connection reset')); }
        },
      }));
    }) as unknown as typeof fetch;
    const snapshots: Array<{ loadedBytes: number; networkBytes: number; verifiedBytes: number }> = [];
    const retries = vi.fn();
    const progress = vi.fn();
    await preloadResources(manifest, base, {
      fetcher, onProgress: progress, onRetry: retries,
      onStats: ({ loadedBytes, networkBytes, verifiedBytes }) => snapshots.push({ loadedBytes, networkBytes, verifiedBytes }),
    });
    const final = snapshots.at(-1)!;
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(retries).toHaveBeenCalledTimes(1);
    expect(progress).toHaveBeenCalledTimes(1);
    expect(final).toEqual({ loadedBytes: content.byteLength, networkBytes: partial.byteLength + content.byteLength, verifiedBytes: content.byteLength });
    expect(snapshots.some((item) => item.loadedBytes === partial.byteLength && item.verifiedBytes === 0)).toBe(true);
  });

  it('counts verified cache hits as loaded bytes without reporting network traffic', async () => {
    const content = encode('cached');
    const manifest = await manifestFor(content);
    const cached = new Response(content, { headers: { 'x-anchao-sha256': manifest.resources[0].sha256 } });
    const cache = {
      match: vi.fn(async () => cached.clone()),
      put: vi.fn(),
    } as unknown as Cache;
    const fetcher = vi.fn() as unknown as typeof fetch;
    const snapshots: Array<{ loadedBytes: number; networkBytes: number; bytesPerSecond: number }> = [];
    await preloadResources(manifest, base, {
      cache, fetcher, onProgress: vi.fn(),
      onStats: ({ loadedBytes, networkBytes, bytesPerSecond }) => snapshots.push({ loadedBytes, networkBytes, bytesPerSecond }),
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(snapshots.at(-1)).toMatchObject({ loadedBytes: content.byteLength, networkBytes: 0, bytesPerSecond: 0 });
  });

  it('classifies HTTP 404 without retrying and retries a transient network interruption', async () => {
    const missing = vi.fn(async () => new Response('not found', { status: 404 })) as unknown as typeof fetch;
    await expect(downloadFile('https://example.test/a', 'assets/missing.webp', {}, { fetcher: missing }))
      .rejects.toMatchObject<Partial<StartupLoadError>>({ kind: 'http', status: 404, path: 'assets/missing.webp' });
    expect(missing).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    let serverCalls = 0;
    const server = vi.fn(async () => ++serverCalls === 1 ? new Response('temporary', { status: 503 }) : streamResponse([encode('ok')])) as unknown as typeof fetch;
    const serverRetry = downloadFile('https://example.test/503', 'assets/a.webp', {}, { fetcher: server });
    const serverResultPromise = serverRetry.then((value) => ({ value }), (error: unknown) => ({ error }));
    await vi.advanceTimersByTimeAsync(400);
    const serverResult = await serverResultPromise;
    expect('value' in serverResult && [...serverResult.value.bytes]).toEqual([...encode('ok')]);
    expect(server).toHaveBeenCalledTimes(2);

    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new TypeError('temporary connection reset');
      return streamResponse([encode('ok')]);
    }) as unknown as typeof fetch;
    const pending = downloadFile('https://example.test/a', 'assets/a.webp', {}, { fetcher });
    const resultPromise = pending.then((value) => ({ value }), (error: unknown) => ({ error }));
    await vi.advanceTimersByTimeAsync(400);
    const result = await resultPromise;
    expect('value' in result && [...result.value.bytes]).toEqual([...encode('ok')]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retries a failed integrity check once and then reports a file mismatch', async () => {
    const content = encode('expected');
    const manifest = await manifestFor(content);
    const fetcher = vi.fn(async () => streamResponse([encode('wrong')])) as unknown as typeof fetch;
    const retries = vi.fn();
    await expect(preloadResources(manifest, base, { fetcher, onProgress: vi.fn(), onRetry: retries }))
      .rejects.toMatchObject<Partial<StartupLoadError>>({ kind: 'integrity', path: 'assets/music.ogg' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(retries).toHaveBeenCalledTimes(1);
  });

  it('allows a continuously slow stream to exceed 120 seconds without an overall deadline', async () => {
    vi.useFakeTimers();
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (sent === 5) { controller.close(); return; }
        await new Promise((resolve) => setTimeout(resolve, 30_000));
        controller.enqueue(new Uint8Array([sent++]));
      },
    });
    const pending = downloadFile('https://example.test/slow', 'assets/slow.webp', {}, { fetcher: vi.fn(async () => new Response(body)) as unknown as typeof fetch });
    await vi.advanceTimersByTimeAsync(150_000);
    const result = await pending;
    expect(sent).toBe(5);
    expect(result.bytes.byteLength).toBe(5);
  });

  it('ends a true stall with a classified idle timeout after the bounded retries', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      signals.push(init!.signal as AbortSignal);
      return new Response(new ReadableStream<Uint8Array>({ start() {} }));
    }) as unknown as typeof fetch;
    const pending = downloadFile('https://example.test/stall', 'assets/stall.webp', {}, { fetcher });
    const resultPromise = pending.then((value) => ({ value }), (error: unknown) => ({ error }));
    await vi.advanceTimersByTimeAsync(183_000);
    const result = await resultPromise;
    expect('error' in result && result.error).toMatchObject<Partial<StartupLoadError>>({ kind: 'timeout', path: 'assets/stall.webp' });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('decays a recent speed sample to zero after the transfer becomes idle', () => {
    vi.useFakeTimers();
    const metrics = new DownloadMetrics(100, 1);
    metrics.chunk('assets/x.webp', 100, 100);
    expect(metrics.snapshot().bytesPerSecond).toBeGreaterThan(0);
    vi.advanceTimersByTime(4_000);
    expect(metrics.snapshot().bytesPerSecond).toBe(0);
  });
});
