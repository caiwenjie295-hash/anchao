import { describe, expect, it } from 'vitest';
import { UI_PREFERENCES_KEY, readUiPreferences, sanitizeUiPreferences, writeUiPreferences } from './uiPreferences';

function storageWith(initial?: string): Storage {
  let value = initial ?? null;
  return {
    get length() { return value === null ? 0 : 1; },
    clear() { value = null; },
    getItem(key) { return key === UI_PREFERENCES_KEY ? value : null; },
    key() { return null; },
    removeItem(key) { if (key === UI_PREFERENCES_KEY) value = null; },
    setItem(key, next) { if (key === UI_PREFERENCES_KEY) value = next; },
  } as Storage;
}

describe('UI-only preferences', () => {
  it('keeps reader settings and per-stage positions outside the story save schema', () => {
    const storage = storageWith();
    expect(writeUiPreferences({ readerFontSize: 22, act4Reading: { 'T05:current': { activeBlockId: 'T05_ORIGINAL', pageIndexByBlock: { T05_ORIGINAL: 2 }, openedCoverKeys: [] } } }, storage)).toBe(true);
    expect(readUiPreferences(storage)).toMatchObject({ readerFontSize: 22, act4Reading: { 'T05:current': { activeBlockId: 'T05_ORIGINAL', pageIndexByBlock: { T05_ORIGINAL: 2 } } } });
  });

  it('rejects invalid font sizes, malformed positions and unknown spaces safely', () => {
    expect(sanitizeUiPreferences({ readerFontSize: 28, act4Reading: {
      'T11:current': { activeBlockId: 'future', pageIndexByBlock: {}, openedCoverKeys: [] },
      'T04:review': { activeBlockId: 2, pageIndexByBlock: { T04_ORIGINAL: -1, T04_MORE: '3' }, openedCoverKeys: ['ok', 4] },
    } })).toEqual({ readerFontSize: 18, act4Reading: { 'T04:review': { activeBlockId: null, pageIndexByBlock: {}, openedCoverKeys: ['ok'] } } });
  });

  it('survives blocked storage reads and writes', () => {
    const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } as unknown as Storage;
    expect(readUiPreferences(broken).readerFontSize).toBe(18);
    expect(writeUiPreferences({ readerFontSize: 20 }, broken)).toBe(false);
  });
});
