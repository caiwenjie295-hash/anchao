import { beforeEach, describe, expect, it } from 'vitest';
import type { BrowserStoragePort } from '../../../core/persistence/browserStorage';
import { clearAct4ReadingPositions, setAct4ReadingPosition, UI_PREFERENCES_KEY } from '../../../core/uiPreferences';
import { act4NarrativeSections } from '../../../data/narrative/act4Narrative';
import { act4Existing560ReaderTextPages, act4LegacyReaderTextPages, act4ReaderTextPages } from '../../../data/narrative/act4Presentation';
import { migrateReaderLayoutPreferences, readerPagesForStoredPosition } from './layoutPreferences';

const VERSION_KEY = 'anchao.a4-reader-layout';
const POSITIONS_KEY = 'anchao.a4-reader-layout-positions';
const sectionBlock = (stage: string, id: string) => act4NarrativeSections.find((item) => item.stage === stage)!.blocks.find((item) => item.id === id)!;

class MemoryStorage implements BrowserStoragePort {
  readonly values = new Map<string, string>();
  failWritesFor = new Set<string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWritesFor.has(key)) throw new Error(`write denied: ${key}`);
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

function useStorage(storage: BrowserStoragePort | null) {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  if (storage) Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  else Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('storage unavailable'); } });
  return () => {
    if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    else Reflect.deleteProperty(window, 'localStorage');
  };
}

beforeEach(() => {
  clearAct4ReadingPositions();
  readerPagesForStoredPosition('T08:current', 'T08', sectionBlock('T08', 'T08_ARCHIVE'));
  window.localStorage.removeItem(VERSION_KEY);
  window.localStorage.removeItem(POSITIONS_KEY);
});

describe('independent Act 4 reader layout compatibility', () => {
  it('keeps every saved version-2 page on the exact 560-character boundary', () => {
    const archive = sectionBlock('T08', 'T08_ARCHIVE');
    const oldPages = act4Existing560ReaderTextPages('T08', archive.id, archive.paragraphs, true)
      .filter((page) => page.role === 'page' || page.role === 'whole');
    const savedIndex = oldPages.findIndex((page) => page.sceneId === 'T08_ARCHIVE_MIRROR');
    expect(savedIndex).toBeGreaterThanOrEqual(0);
    window.localStorage.setItem(VERSION_KEY, '2');
    setAct4ReadingPosition('T08:current', {
      activeBlockId: archive.id,
      pageIndexByBlock: { [archive.id]: savedIndex },
      openedCoverKeys: [],
    });

    migrateReaderLayoutPreferences();

    expect(window.localStorage.getItem(VERSION_KEY)).toBe('3');
    expect(JSON.parse(window.localStorage.getItem(POSITIONS_KEY) ?? '{}')['T08:current'][archive.id]).toBe('2');
    expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(oldPages);
    expect(readerPagesForStoredPosition('T08:current', 'T08', archive)[savedIndex]).toEqual(oldPages[savedIndex]);
  });

  it.each([
    ['version 1', '1'],
    ['missing layout version', null],
  ])('preserves the 440-character boundaries for saved %s positions', (_label, version) => {
    const archive = sectionBlock('T08', 'T08_ARCHIVE');
    const oldPages = act4LegacyReaderTextPages('T08', archive.id, archive.paragraphs, true)
      .filter((page) => page.role === 'page' || page.role === 'whole');
    const savedIndex = oldPages.findIndex((page) => page.sceneId === 'T08_ARCHIVE_MIRROR');
    if (version) window.localStorage.setItem(VERSION_KEY, version);
    setAct4ReadingPosition('T08:current', {
      activeBlockId: archive.id,
      pageIndexByBlock: { [archive.id]: savedIndex },
      openedCoverKeys: [],
    });

    migrateReaderLayoutPreferences();

    expect(JSON.parse(window.localStorage.getItem(POSITIONS_KEY) ?? '{}')['T08:current'][archive.id]).toBe('1');
    expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(oldPages);
  });

  it('uses the merged layout for new positions and keeps current and review spaces separate', () => {
    const archive = sectionBlock('T08', 'T08_ARCHIVE');
    const oldPages = act4Existing560ReaderTextPages('T08', archive.id, archive.paragraphs, true);
    const mergedPages = act4ReaderTextPages('T08', archive.id, archive.paragraphs, true);
    const savedIndex = oldPages.findIndex((page) => page.sceneId === 'T08_ARCHIVE_MIRROR');
    window.localStorage.setItem(VERSION_KEY, '2');
    setAct4ReadingPosition('T08:current', {
      activeBlockId: archive.id,
      pageIndexByBlock: { [archive.id]: savedIndex },
      openedCoverKeys: [],
    });

    migrateReaderLayoutPreferences();
    const firstMigration = window.localStorage.getItem(POSITIONS_KEY);
    migrateReaderLayoutPreferences();

    expect(window.localStorage.getItem(POSITIONS_KEY)).toBe(firstMigration);
    expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(oldPages);
    expect(readerPagesForStoredPosition('T08:review', 'T08', archive)).toEqual(mergedPages);
    expect(JSON.parse(firstMigration ?? '{}')).toEqual({ 'T08:current': { T08_ARCHIVE: '2' } });
  });

  it('drops preserved block layouts after reading positions are cleared', () => {
    const archive = sectionBlock('T08', 'T08_ARCHIVE');
    const oldPages = act4Existing560ReaderTextPages('T08', archive.id, archive.paragraphs, true);
    const savedIndex = oldPages.findIndex((page) => page.sceneId === 'T08_ARCHIVE_MIRROR');
    window.localStorage.setItem(VERSION_KEY, '2');
    setAct4ReadingPosition('T08:current', {
      activeBlockId: archive.id,
      pageIndexByBlock: { [archive.id]: savedIndex },
      openedCoverKeys: [],
    });
    migrateReaderLayoutPreferences();
    expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(oldPages);

    clearAct4ReadingPositions();

    expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(act4ReaderTextPages('T08', archive.id, archive.paragraphs, true));
    expect(window.localStorage.getItem(POSITIONS_KEY)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(UI_PREFERENCES_KEY) ?? '{}').act4Reading).toEqual({});
  });

  it('keeps an old page boundary when its layout map cannot be saved, then isolates fallback metadata after storage changes', () => {
    const archive = sectionBlock('T08', 'T08_ARCHIVE');
    const oldPages = act4Existing560ReaderTextPages('T08', archive.id, archive.paragraphs, true);
    const savedIndex = oldPages.findIndex((page) => page.sceneId === 'T08_ARCHIVE_MIRROR');
    const failingStorage = new MemoryStorage();
    failingStorage.values.set(VERSION_KEY, '2');
    failingStorage.failWritesFor.add(POSITIONS_KEY);
    const restoreFailingStorage = useStorage(failingStorage);
    try {
      setAct4ReadingPosition('T08:current', {
        activeBlockId: archive.id,
        pageIndexByBlock: { [archive.id]: savedIndex },
        openedCoverKeys: [],
      });
      migrateReaderLayoutPreferences();
      expect(failingStorage.getItem(VERSION_KEY)).toBe('2');
      expect(failingStorage.getItem(POSITIONS_KEY)).toBeNull();
      expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(oldPages);
    } finally {
      restoreFailingStorage();
    }
  });

  it('does not carry in-memory layout protection into another Storage instance', () => {
    const archive = sectionBlock('T08', 'T08_ARCHIVE');
    const oldPages = act4LegacyReaderTextPages('T08', archive.id, archive.paragraphs, true);
    const savedIndex = oldPages.findIndex((page) => page.sceneId === 'T08_ARCHIVE_MIRROR');
    const restoreUnavailableStorage = useStorage(null);
    try {
      setAct4ReadingPosition('T08:current', {
        activeBlockId: archive.id,
        pageIndexByBlock: { [archive.id]: savedIndex },
        openedCoverKeys: [],
      });
      migrateReaderLayoutPreferences();
      expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(oldPages);
    } finally {
      restoreUnavailableStorage();
    }

    const nextStorage = new MemoryStorage();
    nextStorage.values.set(VERSION_KEY, '3');
    const restoreNextStorage = useStorage(nextStorage);
    try {
      setAct4ReadingPosition('T08:current', {
        activeBlockId: archive.id,
        pageIndexByBlock: { [archive.id]: savedIndex },
        openedCoverKeys: [],
      });
      expect(readerPagesForStoredPosition('T08:current', 'T08', archive)).toEqual(act4ReaderTextPages('T08', archive.id, archive.paragraphs, true));
    } finally {
      restoreNextStorage();
    }
  });
});
