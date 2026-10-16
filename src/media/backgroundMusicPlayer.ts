import { backgroundMusicConfig } from './backgroundMusic';

export const BACKGROUND_MUSIC_PREFERENCE_KEY = 'anchao.ui.backgroundMusic.v1';

export type BackgroundMusicStatus = 'waiting' | 'playing' | 'paused' | 'blocked' | 'error';

export interface BackgroundMusicSnapshot {
  enabled: boolean;
  volume: number;
  status: BackgroundMusicStatus;
}

export interface BackgroundMusicPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const clampVolume = (volume: number) => Math.min(1, Math.max(0, volume));

function browserStorage(): BackgroundMusicPreferenceStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try { return window.localStorage; } catch { return undefined; }
}

function initialSnapshot(storage: BackgroundMusicPreferenceStorage | undefined): BackgroundMusicSnapshot {
  const fallback = { enabled: true, volume: backgroundMusicConfig.volume, status: 'waiting' as const };
  if (!storage) return fallback;
  try {
    const value = JSON.parse(storage.getItem(BACKGROUND_MUSIC_PREFERENCE_KEY) ?? 'null') as { enabled?: unknown; volume?: unknown } | null;
    return {
      ...fallback,
      enabled: typeof value?.enabled === 'boolean' ? value.enabled : fallback.enabled,
      volume: typeof value?.volume === 'number' && Number.isFinite(value.volume) ? clampVolume(value.volume) : fallback.volume,
      status: value?.enabled === false ? 'paused' : 'waiting',
    };
  } catch { return fallback; }
}

export class BackgroundMusicPlayer {
  private readonly listeners = new Set<() => void>();
  private readonly storage: BackgroundMusicPreferenceStorage | undefined;
  private snapshot: BackgroundMusicSnapshot;
  private audio: HTMLAudioElement | null = null;
  private mountCount = 0;
  private userInteracted = false;
  private playSequence = 0;
  private playPromise: Promise<void> | null = null;

  constructor(storage: BackgroundMusicPreferenceStorage | undefined = browserStorage()) {
    this.storage = storage;
    this.snapshot = initialSnapshot(storage);
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  mount(): () => void {
    this.mountCount++;
    if (this.mountCount === 1) this.attach();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.mountCount = Math.max(0, this.mountCount - 1);
      if (this.mountCount === 0) this.detach();
    };
  }

  setEnabled(enabled: boolean): Promise<void> | undefined {
    this.persist({ enabled, volume: this.snapshot.volume });
    this.commit({ ...this.snapshot, enabled, status: enabled ? 'waiting' : 'paused' });
    if (!enabled) {
      this.playSequence++;
      this.playPromise = null;
      this.audio?.pause();
      return;
    }
    this.userInteracted = true;
    return this.requestPlay();
  }

  setVolume(volume: number): Promise<void> | undefined {
    const safeVolume = clampVolume(Number.isFinite(volume) ? volume : backgroundMusicConfig.volume);
    this.persist({ enabled: this.snapshot.enabled, volume: safeVolume });
    this.commit({ ...this.snapshot, volume: safeVolume });
    if (this.audio) this.audio.volume = safeVolume;
    if (this.snapshot.enabled && this.userInteracted && this.audio?.paused && document.visibilityState !== 'hidden') {
      return this.requestPlay();
    }
    return;
  }

  retry(): Promise<void> | undefined {
    if (!this.snapshot.enabled) return;
    this.userInteracted = true;
    return this.requestPlay();
  }

  private attach() {
    if (this.audio || typeof document === 'undefined' || !document.body) return;
    const audio = document.createElement('audio');
    audio.dataset.backgroundMusic = '';
    audio.preload = 'auto';
    audio.loop = backgroundMusicConfig.loop;
    audio.volume = this.snapshot.volume;
    audio.hidden = true;
    audio.setAttribute('aria-hidden', 'true');
    audio.tabIndex = -1;
    if (backgroundMusicConfig.track) audio.src = backgroundMusicConfig.track.src;
    audio.addEventListener('error', this.onAudioError);
    document.body.append(audio);
    document.addEventListener('pointerdown', this.onFirstInteraction, true);
    document.addEventListener('keydown', this.onFirstInteraction, true);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.audio = audio;
    if (!this.snapshot.enabled) this.commit({ ...this.snapshot, status: 'paused' });
  }

  private detach() {
    document.removeEventListener('pointerdown', this.onFirstInteraction, true);
    document.removeEventListener('keydown', this.onFirstInteraction, true);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.audio) {
      this.audio.removeEventListener('error', this.onAudioError);
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio.remove();
    }
    this.audio = null;
    this.userInteracted = false;
    this.playSequence++;
    this.playPromise = null;
    this.commit({ ...this.snapshot, status: this.snapshot.enabled ? 'waiting' : 'paused' });
  }

  private readonly onFirstInteraction = (event: Event) => {
    if (event.type === 'keydown') {
      const key = (event as KeyboardEvent).key;
      if (['Alt', 'Control', 'Meta', 'Shift'].includes(key)) return;
    }
    if (this.userInteracted) return;
    this.userInteracted = true;
    if (this.snapshot.enabled) void this.requestPlay();
  };

  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.playSequence++;
      this.playPromise = null;
      this.audio?.pause();
      this.commit({ ...this.snapshot, status: this.snapshot.status === 'error' ? 'error' : 'paused' });
    } else if (this.snapshot.enabled && this.userInteracted) {
      void this.requestPlay();
    }
  };

  private readonly onAudioError = () => {
    if (this.snapshot.enabled) this.commit({ ...this.snapshot, status: 'error' });
  };

  private requestPlay(): Promise<void> | undefined {
    const audio = this.audio;
    if (!audio || !this.snapshot.enabled || document.visibilityState === 'hidden') return;
    if (this.playPromise) return this.playPromise;
    const sequence = ++this.playSequence;
    let attempt: Promise<void>;
    try { attempt = audio.play(); }
    catch {
      this.commit({ ...this.snapshot, status: 'blocked' });
      return Promise.resolve();
    }
    const pending = Promise.resolve(attempt).then(() => {
      if (this.audio === audio && this.playSequence === sequence && this.snapshot.enabled) {
        this.commit({ ...this.snapshot, status: 'playing' });
      }
    }).catch(() => {
      if (this.audio === audio && this.playSequence === sequence && this.snapshot.enabled && this.snapshot.status !== 'error') {
        this.playPromise = null;
        this.commit({ ...this.snapshot, status: 'blocked' });
      }
    }).finally(() => {
      if (this.playSequence === sequence) this.playPromise = null;
    });
    this.playPromise = pending;
    return pending;
  }

  private persist(preference: { enabled: boolean; volume: number }) {
    try { this.storage?.setItem(BACKGROUND_MUSIC_PREFERENCE_KEY, JSON.stringify(preference)); }
    catch { /* Playback remains available when browser preference storage is blocked. */ }
  }

  private commit(snapshot: BackgroundMusicSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}

export const backgroundMusicPlayer = new BackgroundMusicPlayer();
