import { loadError, StartupLoadError } from './errors';

export const PRELOAD_HEADER = 'X-Anchao-Preload';
export interface StartupRetry { error: StartupLoadError; nextAttempt: number; maxAttempts: number }
interface DownloadOptions {
  fetcher?: typeof fetch;
  onChunk?: (bytes: number) => void;
  onAttemptFailed?: () => void;
  onRetry?: (retry: StartupRetry) => void;
  validate?: (bytes: Uint8Array) => Promise<void>;
}
const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function readDownload(url: string, path: string, init: RequestInit, options: DownloadOptions) {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let timedOut = false;
  let rejectIdle: (error: StartupLoadError) => void;
  const idle = new Promise<never>((_, reject) => { rejectIdle = reject; });
  const active = () => {
    if (timedOut) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      rejectIdle(new StartupLoadError('timeout', path, 'Download idle timeout'));
      controller.abort();
      void reader?.cancel().catch(() => {});
    }, 60_000);
  };
  active();
  try {
    const work = async () => {
      const response = await (options.fetcher ?? fetch)(url, { ...init, signal: controller.signal });
      if (timedOut) {
        void response.body?.cancel().catch(() => {});
        throw new StartupLoadError('timeout', path, 'Download idle timeout');
      }
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new StartupLoadError('http', path, `Download failed: ${response.status}`, response.status);
      }
      if (response.type === 'opaque' || response.redirected) {
        void response.body?.cancel().catch(() => {});
        throw new StartupLoadError('http', path, 'Unexpected response or redirect', response.status);
      }
      active();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (response.body?.getReader) {
        reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (timedOut) throw new StartupLoadError('timeout', path, 'Download idle timeout');
          if (done) break;
          if (value.byteLength) {
            active();
            chunks.push(value); size += value.byteLength;
            options.onChunk?.(value.byteLength);
          }
        }
      } else {
        const value = new Uint8Array(await response.arrayBuffer());
        if (timedOut) throw new StartupLoadError('timeout', path, 'Download idle timeout');
        chunks.push(value); size = value.byteLength;
        options.onChunk?.(value.byteLength);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      return { bytes, headers: response.headers };
    };
    return await Promise.race([work(), idle]);
  } catch (error) { throw loadError(error, path); }
  finally {
    clearTimeout(timer!);
    // Cancellation is deliberately bounded by the idle race, including broken fetch implementations.
    if (reader) {
      void reader.cancel().catch(() => {});
      try { reader.releaseLock(); } catch { /* A timed-out reader may still have a pending read. */ }
    }
  }
}

export async function downloadFile(url: string, path: string, init: RequestInit = {}, options: DownloadOptions = {}) {
  let integrityFailures = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await readDownload(url, path, init, options);
      await options.validate?.(result.bytes);
      return result;
    } catch (error) {
      const failure = loadError(error, path);
      options.onAttemptFailed?.();
      if (failure.kind === 'integrity') integrityFailures++;
      const transient = failure.kind === 'network' || failure.kind === 'timeout'
        || (failure.kind === 'http' && (failure.status === 408 || failure.status === 429 || ((failure.status ?? 0) >= 500 && (failure.status ?? 0) < 600)));
      if (attempt >= 3 || (!transient && !(failure.kind === 'integrity' && integrityFailures === 1))) throw failure;
      options.onRetry?.({ error: failure, nextAttempt: attempt + 1, maxAttempts: failure.kind === 'integrity' ? Math.min(3, attempt + 1) : 3 });
      await delay(attempt === 1 ? 300 : 900);
    }
  }
}
