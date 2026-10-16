import { cachePrefix, fetchWithTimeout, parseManifest, preloadResources, StartupLoadError, type StartupRetry, type StartupStats } from './preload';
import { describeStartupError, loadError } from './errors';

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const limited = async <T>(task: Promise<T>, milliseconds: number): Promise<T | undefined> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([task, new Promise<undefined>((resolve) => { timer = setTimeout(resolve, milliseconds); })]); }
  finally { clearTimeout(timer); }
};

async function prepareCache(base: URL, version: string): Promise<Cache | undefined> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return;
  try {
    const worker = new URL('anchao-preload-sw.js', base);
    worker.searchParams.set('version', version);
    const registration = await limited(navigator.serviceWorker.register(worker.href, { scope: base.pathname, updateViaCache: 'none' }), 4000);
    if (!registration) return;
    const controlsVersion = () => navigator.serviceWorker.controller?.scriptURL === worker.href;
    if (!controlsVersion()) {
      await limited(new Promise<void>((resolve) => {
        const check = () => { if (controlsVersion()) { navigator.serviceWorker.removeEventListener('controllerchange', check); resolve(); } };
        navigator.serviceWorker.addEventListener('controllerchange', check);
        setTimeout(() => { navigator.serviceWorker.removeEventListener('controllerchange', check); resolve(); }, 4000);
        check();
      }), 4500);
    }
    if (!controlsVersion()) return;
    return await limited(caches.open(`${cachePrefix(base)}${version}`), 2000);
  } catch { return; }
}

export async function prepareStartup(): Promise<void> {
  const shell = document.getElementById('anchao-startup');
  // The offline builder intentionally has no shell/manifest; dev fixtures remain lightweight.
  if (!shell || !import.meta.env.PROD || location.protocol === 'file:') return;
  const fill = document.getElementById('anchao-startup-fill')!;
  const copy = document.getElementById('anchao-startup-copy')!;
  const label = document.getElementById('anchao-startup-progress')!;
  const totalLabel = document.getElementById('anchao-startup-total');
  const loadedLabel = document.getElementById('anchao-startup-loaded');
  const speedLabel = document.getElementById('anchao-startup-speed');
  const detail = document.getElementById('anchao-startup-detail');
  const track = shell.querySelector('[role="progressbar"]')!;
  const retry = document.getElementById('anchao-startup-retry') as HTMLButtonElement;
  const base = new URL(import.meta.env.BASE_URL, location.href);
  const expected = document.querySelector<HTMLMetaElement>('meta[name="anchao-preload-version"]')?.content ?? '';
  let progress = 3;
  const size = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;
  const entryError = () => new StartupLoadError('entry', shell.dataset.entryFile || '入口脚本或样式', 'Entry resource failed');
  const setDetail = (text: string) => { if (detail) detail.textContent = text; };
  const renderStats = (stats?: StartupStats) => {
    if (totalLabel) totalLabel.textContent = stats ? size(stats.totalBytes) : '待确认';
    if (loadedLabel) loadedLabel.textContent = size(stats?.loadedBytes ?? 0);
    if (speedLabel) speedLabel.textContent = `${((stats?.bytesPerSecond ?? 0) / 1000).toFixed(1)} KB/s`;
  };
  const show = (value: number) => {
    progress = Math.max(progress, value);
    fill.style.width = `${progress}%`;
    label.textContent = `${Math.floor(progress)}%`;
    track.setAttribute('aria-valuenow', String(Math.floor(progress)));
  };

  await new Promise<void>((resolve) => {
    const attempt = async () => {
      if (shell.dataset.entryError) {
        copy.textContent = '页面未能完整加载，请刷新后重试。';
        setDetail(describeStartupError(entryError()));
        if (speedLabel) speedLabel.textContent = '0.0 KB/s';
        shell.setAttribute('aria-busy', 'false');
        retry.textContent = '刷新页面';
        retry.hidden = false;
        retry.onclick = () => location.reload();
        return;
      }
      retry.hidden = true;
      retry.onclick = null;
      copy.textContent = '精美图片加载中，请稍候……';
      setDetail('正在确认资源清单……');
      renderStats();
      shell.setAttribute('aria-busy', 'true');
      const started = performance.now();
      let realFraction = 0;
      let stats: StartupStats | undefined;
      const onRetry = ({ error, nextAttempt, maxAttempts }: StartupRetry) => {
        setDetail(`${describeStartupError(error)}。正在自动重试（${nextAttempt}/${maxAttempts}）……`);
      };
      const timer = setInterval(() => {
        renderStats(stats);
        const target = Math.min(95, Math.max(realFraction * 95, 8 + 87 * (1 - Math.exp(-(performance.now() - started) / 18_000))));
        show(Math.min(95, progress + Math.max(0, target - progress) * .09));
      }, 150);
      try {
        const response = await fetchWithTimeout(new URL('anchao-preload-manifest.json', base).href, { cache: 'no-store', credentials: 'same-origin' }, fetch, onRetry);
        let value: unknown;
        try { value = await response.json(); }
        catch { throw new StartupLoadError('manifest', 'anchao-preload-manifest.json', 'Invalid manifest JSON'); }
        const manifest = parseManifest(value, base, expected);
        stats = { totalBytes: manifest.totalBytes, loadedBytes: 0, verifiedBytes: 0, completed: 0, total: manifest.resources.length, networkBytes: 0, bytesPerSecond: 0 };
        renderStats(stats);
        setDetail('正在下载并校验资源……');
        const cache = await prepareCache(base, manifest.version);
        await preloadResources(manifest, base, {
          cache, onRetry, onProgress: (completed, total) => { realFraction = completed / total; },
          onStats: (value) => { stats = value; },
        });
        if (shell.dataset.entryError) throw entryError();
        // Delete only older versions belonging to this exact game URL, after complete verification.
        if (cache) {
          try { await Promise.all((await caches.keys()).filter((key) => key.startsWith(cachePrefix(base)) && key !== `${cachePrefix(base)}${manifest.version}`).map((key) => caches.delete(key))); }
          catch { /* Cache cleanup is optional and never touches save storage. */ }
        }
        clearInterval(timer);
        show(100);
        renderStats(stats);
        setDetail('全部资源校验完成。');
        copy.textContent = '准备就绪，即将进入……';
        shell.setAttribute('aria-busy', 'false');
        await delay(220);
        resolve();
      } catch (error) {
        clearInterval(timer);
        shell.setAttribute('aria-busy', 'false');
        const failure = shell.dataset.entryError ? entryError() : loadError(error, 'anchao-preload-manifest.json');
        const pageUpdated = failure.kind === 'version';
        const entryFailed = failure.kind === 'entry';
        if (stats) stats = { ...stats, bytesPerSecond: 0 };
        renderStats(stats);
        setDetail(describeStartupError(failure));
        copy.textContent = pageUpdated ? '页面已更新，请刷新后继续。' : entryFailed ? '页面未能完整加载，请刷新后重试。'
          : failure.kind === 'integrity' ? '资源校验未通过，请重试加载。'
          : failure.kind === 'manifest' ? '资源清单未能确认，请重试加载。' : '加载暂时中断，请重试加载。';
        retry.textContent = pageUpdated || entryFailed ? '刷新页面' : '重试加载';
        retry.hidden = false;
        retry.onclick = pageUpdated || entryFailed ? () => location.reload() : () => { void attempt(); };
      }
    };
    void attempt();
  });
}
