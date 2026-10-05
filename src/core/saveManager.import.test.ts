import { describe, expect, it } from 'vitest';
import { createDefaultState } from './defaultState';
import { importSaveText, loadState, SAVE_KEY, saveState } from './saveManager';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, String(value)); },
  } as Storage;
}

describe('save import and storage failure handling', () => {
  it('leaves the current valid save untouched when imported JSON is malformed or has no save envelope', () => {
    const storage = memoryStorage();
    const current = createDefaultState();
    current.game.phase = 'D';
    saveState(current, storage);
    const before = storage.getItem(SAVE_KEY);

    expect(importSaveText('{broken', storage)).toEqual({ ok: false, reason: 'invalid-file' });
    expect(importSaveText(JSON.stringify({ schemaVersion: 13, game: {}, desktop: {}, modules: {} }), storage)).toEqual({ ok: false, reason: 'invalid-file' });
    const corruptFromReview = { schemaVersion: 13, game: { phase: 'garbage', flags: {} }, desktop: { windows: {} }, modules: {} };
    expect(importSaveText(JSON.stringify(corruptFromReview), storage)).toEqual({ ok: false, reason: 'invalid-file' });
    expect(storage.getItem(SAVE_KEY)).toBe(before);
    expect(loadState(storage).game.phase).toBe('D');
  });

  it('validates, hydrates and writes a valid import as schema 13', () => {
    const storage = memoryStorage();
    const imported = createDefaultState();
    imported.game.phase = 'C';
    imported.game.flags.FLAG_IMPORT_CHECK = true;
    expect(importSaveText(JSON.stringify(imported), storage)).toMatchObject({ ok: true, state: { schemaVersion: 13, game: { phase: 'C' } } });
    expect(loadState(storage).game.flags.FLAG_IMPORT_CHECK).toBe(true);
  });

  it('keeps supported schema-1 migration available while rejecting incomplete schema-13 state', () => {
    const storage = memoryStorage();
    const legacy = JSON.parse(JSON.stringify(createDefaultState())) as Record<string, unknown>;
    legacy.schemaVersion = 1;
    delete (legacy.modules as Record<string, unknown>).act2Research;
    expect(importSaveText(JSON.stringify(legacy), storage).ok).toBe(true);

    const malformedCurrent = { schemaVersion: 13, game: { phase: 'A', flags: {} }, desktop: { windows: {} }, modules: {} };
    const before = storage.getItem(SAVE_KEY);
    expect(importSaveText(JSON.stringify(malformedCurrent), storage)).toEqual({ ok: false, reason: 'invalid-file' });
    const incompleteCurrent = createDefaultState();
    delete (incompleteCurrent.modules.act4 as unknown as Record<string, unknown>).readNotebookPages;
    expect(importSaveText(JSON.stringify(incompleteCurrent), storage)).toEqual({ ok: false, reason: 'invalid-file' });
    const unknownAct4Stage = createDefaultState();
    (unknownAct4Stage.modules.act4 as unknown as Record<string, unknown>).stage = 'garbage';
    expect(importSaveText(JSON.stringify(unknownAct4Stage), storage)).toEqual({ ok: false, reason: 'invalid-file' });
    expect(storage.getItem(SAVE_KEY)).toBe(before);
  });

  it('catches disabled storage access on load and save', () => {
    const blocked = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
    } as unknown as Storage;
    expect(loadState(blocked).schemaVersion).toBe(13);
    expect(saveState(createDefaultState(), blocked)).toBe(false);
    expect(importSaveText(JSON.stringify(createDefaultState()), blocked)).toEqual({ ok: false, reason: 'storage-unavailable' });
  });

  it('catches a browser localStorage getter that throws before touching the main save', () => {
    const storage = memoryStorage();
    const current = createDefaultState();
    current.game.phase = 'D';
    saveState(current, storage);
    const before = storage.getItem(SAVE_KEY);
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('denied'); } });
      expect(loadState().schemaVersion).toBe(13);
      expect(saveState(createDefaultState())).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(before);
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});
