import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKGROUND_MUSIC_PREFERENCE_KEY, BackgroundMusicPlayer, type BackgroundMusicPreferenceStorage } from './backgroundMusicPlayer';

class MemoryStorage implements BackgroundMusicPreferenceStorage {
  values = new Map<string, string>();
  fail = false;
  getItem(key: string) { if (this.fail) throw new Error('storage unavailable'); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.fail) throw new Error('storage unavailable'); this.values.set(key, value); }
}

const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  document.querySelector('[data-background-music]')?.remove();
  if (visibilityDescriptor) Object.defineProperty(document, 'visibilityState', visibilityDescriptor);
  else delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
});

describe('background music player', () => {
  it('waits for real user interaction, creates one looping audio element, and starts once', async () => {
    const player = new BackgroundMusicPlayer(new MemoryStorage());
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const release = player.mount();
    const audio = document.querySelector<HTMLAudioElement>('[data-background-music]')!;
    expect(audio).not.toBeNull();
    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(0.2);
    expect(audio.src).toContain('.ogg');
    expect(play).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    await Promise.resolve();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot().status).toBe('playing');
    release();
    expect(document.querySelector('[data-background-music]')).toBeNull();
  });

  it('shows a retryable blocked state after play rejection and lets an explicit retry recover', async () => {
    const player = new BackgroundMusicPlayer(new MemoryStorage());
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new Error('autoplay blocked'))
      .mockResolvedValueOnce(undefined);
    const release = player.mount();
    document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getSnapshot().status).toBe('blocked');
    await player.retry();
    expect(play).toHaveBeenCalledTimes(2);
    expect(player.getSnapshot().status).toBe('playing');
    release();
  });

  it('does not restart after the user disables music, while explicit re-enable starts it again', async () => {
    const player = new BackgroundMusicPlayer(new MemoryStorage());
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const release = player.mount();
    document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    await Promise.resolve();
    await player.setEnabled(false);
    document.dispatchEvent(new Event('pointerdown'));
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalled();
    await player.setEnabled(true);
    expect(play).toHaveBeenCalledTimes(2);
    release();
  });

  it('pauses while hidden and resumes on return only when the stored preference remains enabled', async () => {
    const player = new BackgroundMusicPlayer(new MemoryStorage());
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const release = player.mount();
    document.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    await Promise.resolve();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pause).toHaveBeenCalled();
    expect(player.getSnapshot().status).toBe('paused');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(2);
    await player.setEnabled(false);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledTimes(2);
    release();
  });

  it('keeps source errors distinct from a rejected play promise', async () => {
    let rejectPlay!: (reason: Error) => void;
    const player = new BackgroundMusicPlayer(new MemoryStorage());
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => new Promise<void>((_resolve, reject) => { rejectPlay = reject; }));
    const release = player.mount();
    document.dispatchEvent(new Event('pointerdown'));
    document.querySelector('[data-background-music]')!.dispatchEvent(new Event('error'));
    rejectPlay(new Error('decode failed'));
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getSnapshot().status).toBe('error');
    release();
  });

  it('clamps and persists volume and survives unavailable preference storage', async () => {
    const storage = new MemoryStorage();
    storage.values.set(BACKGROUND_MUSIC_PREFERENCE_KEY, JSON.stringify({ enabled: false, volume: 4 }));
    const player = new BackgroundMusicPlayer(storage);
    const release = player.mount();
    expect(player.getSnapshot()).toMatchObject({ enabled: false, volume: 1 });
    await player.setVolume(-2);
    expect(player.getSnapshot().volume).toBe(0);
    expect(JSON.parse(storage.values.get(BACKGROUND_MUSIC_PREFERENCE_KEY)!).volume).toBe(0);
    release();

    storage.fail = true;
    const unavailable = new BackgroundMusicPlayer(storage);
    const releaseUnavailable = unavailable.mount();
    await unavailable.setVolume(1.7);
    expect(unavailable.getSnapshot().volume).toBe(1);
    expect(() => unavailable.setEnabled(false)).not.toThrow();
    releaseUnavailable();
  });

  it('cleans up and can be remounted in React StrictMode without duplicate audio or listeners', () => {
    const player = new BackgroundMusicPlayer(new MemoryStorage());
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    const strictCleanup = player.mount();
    strictCleanup();
    const actualCleanup = player.mount();
    expect(document.querySelectorAll('[data-background-music]')).toHaveLength(1);
    document.dispatchEvent(new Event('pointerdown'));
    expect(play).toHaveBeenCalledTimes(1);
    actualCleanup();
    expect(document.querySelectorAll('[data-background-music]')).toHaveLength(0);
  });
});
