export interface StartupStats {
  totalBytes: number;
  loadedBytes: number;
  verifiedBytes: number;
  completed: number;
  total: number;
  networkBytes: number;
  bytesPerSecond: number;
}

// Loaded bytes describe useful progress; network bytes include failed attempts as actual traffic.
export class DownloadMetrics {
  private partial = new Map<string, number>();
  private samples: { time: number; bytes: number }[] = [];
  private verifiedBytes = 0;
  private completed = 0;
  private networkBytes = 0;
  private stopped = false;
  private readonly started = performance.now();
  constructor(private totalBytes: number, private total: number, private onStats?: (stats: StartupStats) => void) {}

  chunk(path: string, bytes: number, expectedBytes: number) {
    this.partial.set(path, Math.min(expectedBytes, (this.partial.get(path) ?? 0) + bytes));
    this.networkBytes += bytes;
    this.samples.push({ time: performance.now(), bytes });
    this.emit();
  }
  rollback(path: string) { this.partial.delete(path); this.emit(); }
  verify(path: string, bytes: number) {
    this.partial.delete(path);
    this.verifiedBytes += bytes;
    this.completed++;
    this.emit();
  }
  snapshot(): StartupStats {
    const now = performance.now();
    this.samples = this.samples.filter((sample) => now - sample.time < 3000);
    const seconds = Math.min(3000, Math.max(1000, now - this.started)) / 1000;
    return {
      totalBytes: this.totalBytes,
      loadedBytes: Math.min(this.totalBytes, this.verifiedBytes + [...this.partial.values()].reduce((sum, bytes) => sum + bytes, 0)),
      verifiedBytes: this.verifiedBytes, completed: this.completed, total: this.total, networkBytes: this.networkBytes,
      bytesPerSecond: this.stopped ? 0 : this.samples.reduce((sum, sample) => sum + sample.bytes, 0) / seconds,
    };
  }
  emit() { this.onStats?.(this.snapshot()); }
  stop() { this.stopped = true; this.samples = []; this.emit(); }
}
