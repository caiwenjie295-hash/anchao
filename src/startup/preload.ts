import { downloadFile, PRELOAD_HEADER, type StartupRetry } from './download';
import { DownloadMetrics, type StartupStats } from './metrics';
import { StartupLoadError, StartupVersionError } from './errors';
export { StartupLoadError, StartupVersionError } from './errors';
export type { StartupStats } from './metrics';
export type { StartupRetry } from './download';

export interface StartupResource { path: string; bytes: number; sha256: string }
export interface StartupManifest { schema: 1; version: string; base: string; totalBytes: number; resources: StartupResource[] }

const HASH = /^[a-f0-9]{64}$/;
export const cachePrefix = (base: URL) => `anchao-preload:${encodeURIComponent(base.href)}:`;

function checkedManifest(value: unknown, base: URL, expectedVersion: string): StartupManifest {
  const item = value as StartupManifest | null;
  if (item && HASH.test(item.version) && item.version !== expectedVersion) throw new StartupVersionError();
  if (!item || item.schema !== 1 || !HASH.test(item.version)
    || typeof item.base !== 'string' || new URL(item.base, base).href !== base.href
    || !Array.isArray(item.resources) || !item.resources.length) throw new Error('Invalid or outdated startup manifest');
  const seen = new Set<string>();
  let bytes = 0;
  for (const resource of item.resources) {
    if (!resource || typeof resource.path !== 'string' || !resource.path || resource.path.startsWith('/')
      || /[?#\\]/.test(resource.path) || !Number.isSafeInteger(resource.bytes) || resource.bytes < 0 || !HASH.test(resource.sha256)) throw new Error('Invalid resource');
    if (decodeURIComponent(resource.path).split('/').some((part) => part === '..' || part === '.')) throw new Error('Unsafe resource path');
    const url = new URL(resource.path, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)
      || decodeURIComponent(url.pathname).split('/').some((part) => part === '..' || part === '.')
      || ['index.html', 'anchao-preload-sw.js', 'anchao-preload-manifest.json'].includes(decodeURIComponent(url.pathname.slice(base.pathname.length)))
      || seen.has(url.href)) throw new Error('Unsafe or duplicate resource');
    seen.add(url.href);
    bytes += resource.bytes;
  }
  if (!Number.isSafeInteger(item.totalBytes) || item.totalBytes !== bytes) throw new Error('Invalid total size');
  return item;
}

export function parseManifest(value: unknown, base: URL, expectedVersion: string): StartupManifest {
  try { return checkedManifest(value, base, expectedVersion); }
  catch (error) {
    if (error instanceof StartupVersionError) throw error;
    throw new StartupLoadError('manifest', 'anchao-preload-manifest.json', 'Invalid startup manifest');
  }
}

// Secure contexts use the native digest. The small fallback also supports ordinary HTTP hosts.
export async function sha256(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }
  const constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);
  const words = new Uint32Array(64);
  const rotate = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index++) {
      const a = words[index - 15], b = words[index - 2];
      words[index] = words[index - 16] + (rotate(a,7)^rotate(a,18)^(a>>>3)) + words[index - 7] + (rotate(b,17)^rotate(b,19)^(b>>>10));
    }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let index = 0; index < 64; index++) {
      const first = (h + (rotate(e,6)^rotate(e,11)^rotate(e,25)) + ((e&f)^(~e&g)) + constants[index] + words[index]) | 0;
      const second = ((rotate(a,2)^rotate(a,13)^rotate(a,22)) + ((a&b)^(a&c)^(b&c))) | 0;
      h=g; g=f; f=e; e=(d+first)|0; d=c; c=b; b=a; a=(first+second)|0;
    }
    [a,b,c,d,e,f,g,h].forEach((value, index) => { hash[index] = (hash[index] + value) | 0; });
  }
  return hash.map((value) => (value >>> 0).toString(16).padStart(8, '0')).join('');
}

// Compatibility export; timeout now measures inactivity, including body consumption.
export async function fetchWithTimeout(url: string, init: RequestInit = {}, fetcher: typeof fetch = fetch, onRetry?: (retry: StartupRetry) => void): Promise<Response> {
  const { bytes, headers } = await downloadFile(url, 'anchao-preload-manifest.json', init, { fetcher, onRetry });
  return new Response(bytes as Uint8Array<ArrayBuffer>, { status: 200, headers });
}

export async function preloadResources(manifest: StartupManifest, base: URL, options: {
  cache?: Cache; fetcher?: typeof fetch; onProgress: (completed: number, total: number) => void;
  onStats?: (stats: StartupStats) => void; onRetry?: (retry: StartupRetry) => void;
}) {
  let cursor = 0, completed = 0;
  let cache = options.cache;
  let failure: unknown;
  const metrics = new DownloadMetrics(manifest.totalBytes, manifest.resources.length, options.onStats);
  const ticker = setInterval(() => metrics.emit(), 250);
  metrics.emit();
  const worker = async () => {
    while (!failure && cursor < manifest.resources.length) {
      const resource = manifest.resources[cursor++];
      const url = new URL(resource.path, base).href;
      try {
        let stored: Response | undefined;
        try { stored = await cache?.match(url); } catch { cache = undefined; }
        if (stored?.headers.get('x-anchao-sha256') !== resource.sha256) {
          const { bytes, headers: responseHeaders } = await downloadFile(url, resource.path, {
            cache: 'reload', credentials: 'same-origin', headers: { [PRELOAD_HEADER]: '1' },
          }, {
            fetcher: options.fetcher, onRetry: options.onRetry,
            onChunk: (bytes) => metrics.chunk(resource.path, bytes, resource.bytes),
            onAttemptFailed: () => metrics.rollback(resource.path),
            validate: async (bytes) => {
              if (bytes.byteLength !== resource.bytes || await sha256(bytes) !== resource.sha256) {
                throw new StartupLoadError('integrity', resource.path, 'Resource version mismatch');
              }
            },
          });
          if (cache) {
            const headers = new Headers(responseHeaders);
            headers.set('x-anchao-sha256', resource.sha256);
            headers.delete('content-encoding');
            headers.delete('content-length');
            try { await cache.put(url, new Response(bytes as Uint8Array<ArrayBuffer>, { status: 200, headers })); }
            catch { cache = undefined; } // Quota/private-mode restrictions fall back to the warmed HTTP cache.
          }
        }
        completed++;
        metrics.verify(resource.path, resource.bytes);
        options.onProgress(completed, manifest.resources.length);
      } catch (error) { failure ??= error; }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(4, manifest.resources.length) }, worker));
    if (failure) throw failure;
    const result = metrics.snapshot();
    if (result.completed !== manifest.resources.length || result.verifiedBytes !== manifest.totalBytes) {
      throw new StartupLoadError('integrity', 'anchao-preload-manifest.json', 'Incomplete resource verification');
    }
  } finally { clearInterval(ticker); metrics.stop(); }
}
