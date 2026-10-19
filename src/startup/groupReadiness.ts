import { cachePrefix, preloadResources, type StartupManifest, type StartupResource, type StartupStats } from './preload';

export interface StartupGroupSnapshot {
  groups: readonly string[];
  state: 'ready' | 'loading' | 'idle' | 'error';
  loadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
  completed: number;
  total: number;
  error?: unknown;
}

export interface GroupReadinessOptions {
  manifest: StartupManifest;
  base: URL;
  cache?: Cache;
  initialResources: readonly StartupResource[];
  fetcher?: typeof fetch;
}

interface Job {
  resource: StartupResource;
  priority: number;
  sequence: number;
  background: boolean;
  startedBackground: boolean;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export class StartupGroupReadiness {
  private readonly verified = new Set<string>();
  private readonly partial = new Map<string, StartupStats>();
  private readonly failures = new Map<string, unknown>();
  private readonly jobs = new Map<string, Job>();
  private readonly queue: Job[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly snapshotCache = new Map<string, StartupGroupSnapshot>();
  private active = 0;
  private activeBackground = 0;
  private sequence = 0;
  private cleanupStarted = false;

  constructor(private readonly options: GroupReadinessOptions) {
    options.initialResources.forEach((resource) => this.verified.add(resource.path));
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private changed() {
    this.snapshotCache.clear();
    this.listeners.forEach((listener) => listener());
  }

  private resourcesForAct(act: 1 | 2 | 3 | 4): StartupResource[] {
    return this.resourcesForGroups(['shared', `act${act}`]);
  }

  private resourcesForGroups(groups: readonly string[]): StartupResource[] {
    const requested = new Set(groups);
    return this.options.manifest.resources.filter((resource) => resource.groups.some((group) => requested.has(group)));
  }

  getSnapshot(act: 1 | 2 | 3 | 4): StartupGroupSnapshot {
    return this.getSnapshotForGroups(['shared', `act${act}`]);
  }

  getSnapshotForGroups(groups: readonly string[]): StartupGroupSnapshot {
    const key = [...new Set(groups)].sort().join(',');
    const cached = this.snapshotCache.get(key);
    if (cached) return cached;
    const resources = this.resourcesForGroups(groups);
    const totalBytes = resources.reduce((sum, resource) => sum + resource.bytes, 0);
    const loadedBytes = resources.reduce((sum, resource) => sum + (this.verified.has(resource.path) ? resource.bytes : Math.min(resource.bytes, this.partial.get(resource.path)?.loadedBytes ?? 0)), 0);
    const completed = resources.filter((resource) => this.verified.has(resource.path)).length;
    const failed = resources.map((resource) => this.failures.get(resource.path)).find(Boolean);
    const pending = resources.some((resource) => !this.verified.has(resource.path));
    const activeStats = resources.map((resource) => this.partial.get(resource.path)).filter((value): value is StartupStats => Boolean(value));
    const activeJobs = resources.some((resource) => this.jobs.has(resource.path));
    const snapshot: StartupGroupSnapshot = {
      groups: [...new Set(groups)],
      state: !pending ? 'ready' : failed ? 'error' : activeJobs ? 'loading' : 'idle',
      loadedBytes, totalBytes,
      bytesPerSecond: activeStats.reduce((sum, stats) => sum + stats.bytesPerSecond, 0),
      completed, total: resources.length,
      ...(failed ? { error: failed } : {}),
    };
    this.snapshotCache.set(key, snapshot);
    return snapshot;
  }

  requestAct(act: 1 | 2 | 3 | 4, priority = 10): Promise<void> {
    return this.requestGroups(['shared', `act${act}`], priority);
  }

  requestGroups(groups: readonly string[], priority = 10): Promise<void> {
    return Promise.all(this.resourcesForGroups(groups).map((resource) => this.enqueue(resource, priority, false))).then(() => undefined);
  }

  startBackgroundPrefetch(): void {
    void this.requestBackgroundAct(3).catch(() => undefined);
    void this.requestBackgroundAct(4).catch(() => undefined);
  }

  private requestBackgroundAct(act: 3 | 4): Promise<void> {
    return Promise.all(this.resourcesForAct(act).map((resource) => this.enqueue(resource, 0, true))).then(() => undefined);
  }

  private enqueue(resource: StartupResource, priority: number, background: boolean): Promise<void> {
    if (this.verified.has(resource.path)) return Promise.resolve();
    const existing = this.jobs.get(resource.path);
    if (existing) {
      existing.priority = Math.max(existing.priority, priority);
      if (!background) existing.background = false;
      this.sortQueue();
      this.pump();
      return existing.promise;
    }
    this.failures.delete(resource.path);
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
    const job: Job = { resource, priority, sequence: this.sequence++, background, startedBackground: false, promise, resolve, reject };
    this.jobs.set(resource.path, job);
    this.queue.push(job);
    this.sortQueue();
    this.changed();
    this.pump();
    return promise;
  }

  private sortQueue(): void {
    this.queue.sort((left, right) => right.priority - left.priority || left.sequence - right.sequence);
  }

  private pump(): void {
    while (this.active < 2) {
      const eligibleIndex = this.queue.findIndex((job) => !job.background || this.activeBackground < 1);
      if (eligibleIndex < 0) return;
      const [job] = this.queue.splice(eligibleIndex, 1);
      this.active += 1;
      job.startedBackground = job.background;
      if (job.startedBackground) this.activeBackground += 1;
      void this.run(job);
    }
  }

  private async run(job: Job): Promise<void> {
    const manifest: StartupManifest = { ...this.options.manifest, totalBytes: job.resource.bytes, resources: [job.resource] };
    try {
      await preloadResources(manifest, this.options.base, {
        cache: this.options.cache, fetcher: this.options.fetcher,
        onProgress: () => undefined,
        onStats: (stats) => { this.partial.set(job.resource.path, stats); this.changed(); },
      });
      this.verified.add(job.resource.path);
      this.failures.delete(job.resource.path);
      job.resolve();
    } catch (error) {
      this.failures.set(job.resource.path, error);
      job.reject(error);
    } finally {
      this.partial.delete(job.resource.path);
      this.jobs.delete(job.resource.path);
      this.active -= 1;
      if (job.startedBackground) this.activeBackground -= 1;
      this.changed();
      this.pump();
      void this.cleanupOldCachesWhenComplete();
    }
  }

  private async cleanupOldCachesWhenComplete(): Promise<void> {
    if (this.cleanupStarted || this.verified.size !== this.options.manifest.resources.length || !this.options.cache || !('caches' in globalThis)) return;
    this.cleanupStarted = true;
    try {
      const prefix = cachePrefix(this.options.base);
      const current = `${prefix}${this.options.manifest.version}`;
      await Promise.all((await caches.keys()).filter((key) => key.startsWith(prefix) && key !== current).map((key) => caches.delete(key)));
    } catch { /* Cache cleanup is optional and never touches another origin or save storage. */ }
  }
}

let currentReadiness: StartupGroupReadiness | null = null;

export function configureStartupGroupReadiness(options: GroupReadinessOptions): StartupGroupReadiness {
  currentReadiness = new StartupGroupReadiness(options);
  return currentReadiness;
}

export function getStartupGroupReadiness(): StartupGroupReadiness | null { return currentReadiness; }

export function startBackgroundPrefetch(): void { currentReadiness?.startBackgroundPrefetch(); }
