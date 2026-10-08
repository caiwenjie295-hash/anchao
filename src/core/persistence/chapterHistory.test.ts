import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../defaultState';
import { chapterHistoryWithProgress, CHAPTER_HISTORY_KEY, clearChapterHistory, emptyChapterHistory, readChapterHistory, recordChapterEntry, writeChapterHistory } from './chapterHistory';
import type { BrowserStoragePort } from './browserStorage';

class MemoryStorage implements BrowserStoragePort {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('chapter history sidecar', () => {
  it('loads an empty, versioned record and round-trips entry snapshots', () => {
    const storage = new MemoryStorage();
    expect(readChapterHistory(storage)).toEqual({ kind: 'empty', history: emptyChapterHistory() });
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T01';
    const history = recordChapterEntry(emptyChapterHistory(), 2, state);
    expect(history.unlockedThrough).toBe(2);
    expect(writeChapterHistory(history, storage)).toBe(true);
    expect(readChapterHistory(storage)).toEqual({ kind: 'loaded', history });
    expect(JSON.parse(storage.getItem(CHAPTER_HISTORY_KEY) ?? '{}').version).toBe(1);
  });

  it('keeps the highest reached act when progress is replayed earlier', () => {
    const state = createDefaultState();
    state.game.act = 1;
    const history = chapterHistoryWithProgress({ ...emptyChapterHistory(), unlockedThrough: 4 }, 1);
    expect(history.unlockedThrough).toBe(4);
    expect(readChapterHistory(new MemoryStorage()).history.unlockedThrough).toBe(1);
  });

  it('treats malformed versions as corrupt without throwing and clears to a versioned first-chapter record', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHAPTER_HISTORY_KEY, '{not json');
    expect(readChapterHistory(storage).kind).toBe('corrupt');
    expect(clearChapterHistory(storage)).toBe(true);
    expect(readChapterHistory(storage)).toEqual({ kind: 'loaded', history: emptyChapterHistory() });
  });

  it('fails closed when the browser storage surface throws', () => {
    const storage: BrowserStoragePort = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    };
    expect(readChapterHistory(storage).kind).toBe('unavailable');
    expect(writeChapterHistory(emptyChapterHistory(), storage)).toBe(false);
    expect(clearChapterHistory(storage)).toBe(false);
  });
});
