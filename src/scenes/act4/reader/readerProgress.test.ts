import { beforeEach, describe, expect, it } from 'vitest';
import { clearAct4ReadingPositions, setAct4ReadingPosition } from '../../../core/uiPreferences';
import type { BrowserStoragePort } from '../../../core/persistence/browserStorage';
import {
  ACT4_READER_PROGRESS_KEY,
  act4ReaderBlockProgress,
  clearAct4ReaderProgress,
  getAct4ReaderProgressSnapshot,
  markAct4ReaderPageDisplayed,
  revealAct4ReaderEnding,
} from './readerProgress';

class MemoryStorage implements BrowserStoragePort {
  readonly values = new Map<string, string>();
  failWrites = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('simulated storage write failure');
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

beforeEach(() => {
  clearAct4ReadingPositions();
  clearAct4ReaderProgress();
  window.localStorage.removeItem(ACT4_READER_PROGRESS_KEY);
});

describe('Act 4 reader progress', () => {
  it('keeps a monotonic displayed-page high-water separately for current and review reading', () => {
    const storage = new MemoryStorage();
    markAct4ReaderPageDisplayed('T01:current', 'T01_ORIGINAL', 4, storage);
    markAct4ReaderPageDisplayed('T01:current', 'T01_ORIGINAL', 2, storage);
    markAct4ReaderPageDisplayed('T01:review', 'T01_ORIGINAL', 1, storage);
    revealAct4ReaderEnding('T01:review', 'T01_ORIGINAL', storage);

    const snapshot = getAct4ReaderProgressSnapshot(storage);
    expect(act4ReaderBlockProgress(snapshot, 'T01:current', 'T01_ORIGINAL'))
      .toEqual({ displayedPageIndex: 4, endingRevealed: false });
    expect(act4ReaderBlockProgress(snapshot, 'T01:review', 'T01_ORIGINAL'))
      .toEqual({ displayedPageIndex: 1, endingRevealed: true });
  });

  it('keeps each Storage identity isolated and retains same-storage progress after a failed write', () => {
    const unavailableStorage = new MemoryStorage();
    unavailableStorage.failWrites = true;
    const otherStorage = new MemoryStorage();
    markAct4ReaderPageDisplayed('T08:current', 'T08_ARCHIVE', 3, unavailableStorage);
    markAct4ReaderPageDisplayed('T08:current', 'T08_ARCHIVE', 1, otherStorage);

    const unavailableSnapshot = getAct4ReaderProgressSnapshot(unavailableStorage);
    expect(act4ReaderBlockProgress(unavailableSnapshot, 'T08:current', 'T08_ARCHIVE').displayedPageIndex).toBe(3);
    const otherSnapshot = getAct4ReaderProgressSnapshot(otherStorage);
    expect(act4ReaderBlockProgress(otherSnapshot, 'T08:current', 'T08_ARCHIVE').displayedPageIndex).toBe(1);
    expect(unavailableStorage.getItem(ACT4_READER_PROGRESS_KEY)).toBeNull();
  });

  it('clears the UI high-water when reading positions are cleared for a new game or replay', () => {
    setAct4ReadingPosition('T01:current', {
      activeBlockId: 'T01_ORIGINAL',
      pageIndexByBlock: { T01_ORIGINAL: 5 },
      openedCoverKeys: ['T01:current:T01_ORIGINAL:cover'],
    });
    markAct4ReaderPageDisplayed('T01:current', 'T01_ORIGINAL', 5);
    expect(act4ReaderBlockProgress(getAct4ReaderProgressSnapshot(), 'T01:current', 'T01_ORIGINAL').displayedPageIndex).toBe(5);

    clearAct4ReadingPositions();

    expect(getAct4ReaderProgressSnapshot().spaces).toEqual({});
    expect(window.localStorage.getItem(ACT4_READER_PROGRESS_KEY)).toBeNull();
  });
});
