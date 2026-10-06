import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../defaultState';
import { EventBus } from '../eventBus';
import { loadState, readSave, SAVE_BACKUP_KEY, SAVE_KEY, SAVE_RECOVERY_KEY, saveState, writeSaveState } from '../saveManager';
import { StateManager } from '../stateManager';
import type { SaveStoragePort } from './browserStorage';

function memoryStorage(overrides: Partial<SaveStoragePort> = {}): SaveStoragePort {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
    ...overrides,
  };
}

describe('save recovery boundary', () => {
  afterEach(() => vi.useRealTimers());

  it('classifies unavailable storage while preserving valid schema 13 and supported legacy migrations', () => {
    const blocked = memoryStorage({ getItem: () => { throw new Error('storage denied'); } });
    expect(readSave(blocked)).toEqual({ kind: 'unavailable' });

    const current = createDefaultState();
    const currentStorage = memoryStorage();
    currentStorage.setItem(SAVE_KEY, JSON.stringify(current));
    expect(readSave(currentStorage)).toMatchObject({ kind: 'loaded', state: { schemaVersion: 13 } });

    const supportedLegacy = { ...createDefaultState(), schemaVersion: 6 };
    const legacyStorage = memoryStorage();
    legacyStorage.setItem(SAVE_KEY, JSON.stringify(supportedLegacy));
    expect(readSave(legacyStorage)).toMatchObject({ kind: 'loaded', state: { schemaVersion: 13 } });

    const unsupportedLegacy = { ...createDefaultState(), schemaVersion: 14 };
    const unsupportedStorage = memoryStorage();
    unsupportedStorage.setItem(SAVE_KEY, JSON.stringify(unsupportedLegacy));
    expect(readSave(unsupportedStorage)).toMatchObject({ kind: 'unsupported-version', version: 14 });
  });

  it('keeps temporary progress when storage returns empty and safely saves it instead of resetting', () => {
    let denied = true;
    const backing = memoryStorage();
    const storage = memoryStorage({
      getItem: (key) => { if (denied) throw new Error('storage denied'); return backing.getItem(key); },
      setItem: (key, value) => { if (denied) throw new Error('storage denied'); backing.setItem(key, value); },
      removeItem: (key) => { if (denied) throw new Error('storage denied'); backing.removeItem(key); },
    });
    const manager = new StateManager(new EventBus(), undefined, storage);
    manager.setNotepadUserText('存储不可用期间的临时笔记');
    expect(manager.getRecoveryState().kind).toBe('unavailable');
    expect(backing.getItem(SAVE_KEY)).toBeNull();

    denied = false;
    expect(manager.refreshSaveRecovery()).toEqual({ ok: true });
    expect(manager.getRecoveryState().kind).toBe('none');
    expect(manager.getState().modules.notepad.userText).toBe('存储不可用期间的临时笔记');
    expect(loadState(backing).modules.notepad.userText).toBe('存储不可用期间的临时笔记');
  });

  it('requires confirmation before adopting a record found after a storage outage and synchronizes import events', () => {
    vi.useFakeTimers();
    let denied = true;
    const backing = memoryStorage();
    const deviceSave = createDefaultState();
    deviceSave.game.phase = 'E';
    backing.setItem(SAVE_KEY, JSON.stringify(deviceSave));
    const storage = memoryStorage({
      getItem: (key) => { if (denied) throw new Error('storage denied'); return backing.getItem(key); },
      setItem: (key, value) => { if (denied) throw new Error('storage denied'); backing.setItem(key, value); },
      removeItem: (key) => { if (denied) throw new Error('storage denied'); backing.removeItem(key); },
    });
    const bus = new EventBus();
    const imported = vi.fn();
    bus.on('save:imported', imported);
    const manager = new StateManager(bus, undefined, storage);
    manager.setNotepadUserText('本次临时笔记');
    expect(manager.getState().modules.notepad.userText).toBe('本次临时笔记');
    denied = false;

    expect(manager.refreshSaveRecovery()).toEqual({ ok: false, reason: 'device-save-available' });
    expect(manager.getRecoveryState().kind).toBe('device-save-available');
    expect(manager.getState().modules.notepad.userText).toBe('本次临时笔记');
    expect(backing.getItem(SAVE_KEY)).toBe(JSON.stringify(deviceSave));
    expect(imported).not.toHaveBeenCalled();

    expect(manager.adoptAvailableSave()).toEqual({ ok: true });
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event('pagehide'));
    expect(manager.getState().game.phase).toBe('E');
    expect(manager.getState().modules.notepad.userText).not.toBe('本次临时笔记');
    expect(loadState(backing).game.phase).toBe('E');
    expect(imported).toHaveBeenCalledOnce();
  });

  it('classifies malformed and future records and never overwrites them during temporary play', () => {
    for (const [raw, kind] of [['{bad json', 'corrupt'], ['{"schemaVersion":14}', 'unsupported-version']] as const) {
      const storage = memoryStorage();
      storage.setItem(SAVE_KEY, raw);
      const manager = new StateManager(new EventBus(), undefined, storage);
      const recoverySnapshot = manager.getRecoveryState();
      expect(recoverySnapshot.kind).toBe(kind);
      expect(manager.getRecoveryState()).toBe(recoverySnapshot);
      manager.openApp('mail');
      manager.setNotepadUserText('本次临时记录');
      manager.resetProgress();
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
      expect(manager.getSaveStatus()).toBe('recovery-required');
    }
  });

  it('backs up the last valid state and preserves a corrupt primary before restoring it', () => {
    const storage = memoryStorage();
    const older = createDefaultState();
    older.game.flags.FLAG_RECOVERY_TEST = true;
    const newer = createDefaultState();
    newer.game.phase = 'B';
    expect(saveState(older, storage)).toBe(true);
    expect(writeSaveState(newer, storage).ok).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_BACKUP_KEY) ?? 'null').game.flags.FLAG_RECOVERY_TEST).toBe(true);

    const corruptOriginal = '{original save bytes';
    storage.setItem(SAVE_KEY, corruptOriginal);
    const bus = new EventBus();
    const imported = vi.fn();
    bus.on('save:imported', imported);
    const manager = new StateManager(bus, undefined, storage);
    expect(manager.getRecoveryState()).toMatchObject({ kind: 'corrupt', backupAvailable: true, originalText: corruptOriginal });
    expect(manager.restoreSaveBackup()).toEqual({ ok: true });
    expect(loadState(storage).game.flags.FLAG_RECOVERY_TEST).toBe(true);
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(corruptOriginal);
    expect(manager.getState().game.flags.FLAG_RECOVERY_TEST).toBe(true);
    expect(manager.getRecoveryState().kind).toBe('none');
    expect(imported).toHaveBeenCalledOnce();
  });

  it('cancels deferred writes before restoring or importing, so timer and pagehide cannot overwrite the new save', () => {
    vi.useFakeTimers();
    const older = createDefaultState();
    older.game.phase = 'B';
    const newer = createDefaultState();
    newer.game.phase = 'C';
    const storage = memoryStorage();
    expect(saveState(older, storage)).toBe(true);
    expect(saveState(newer, storage)).toBe(true);
    const manager = new StateManager(new EventBus(), undefined, storage);
    manager.setNotepadUserText('延迟写入的旧内容');
    storage.setItem(SAVE_KEY, '{broken primary');
    expect(manager.refreshSaveRecovery()).toEqual({ ok: false, reason: 'recovery-required' });
    expect(manager.restoreSaveBackup()).toEqual({ ok: true });
    vi.advanceTimersByTime(500);
    expect(manager.getState().game.phase).toBe('B');
    expect(loadState(storage).game.phase).toBe('B');

    const importStorage = memoryStorage();
    expect(saveState(older, importStorage)).toBe(true);
    expect(saveState(newer, importStorage)).toBe(true);
    const importedManager = new StateManager(new EventBus(), undefined, importStorage);
    importedManager.setNotepadUserText('另一个尚未写入的旧内容');
    importStorage.setItem(SAVE_KEY, '{second broken primary');
    expect(importedManager.refreshSaveRecovery()).toEqual({ ok: false, reason: 'recovery-required' });
    const imported = createDefaultState();
    imported.game.phase = 'D';
    expect(importedManager.importSave(JSON.stringify(imported)).ok).toBe(true);
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event('pagehide'));
    expect(loadState(importStorage).game.phase).toBe('D');
    expect(loadState(importStorage).modules.notepad.userText).not.toContain('旧内容');
  });

  it('requires preservation space before restarting and supports an explicit two-record replacement path', () => {
    const oldProtected = '{previous protected record';
    const currentCorrupt = '{current corrupt record';
    const base = memoryStorage();
    base.setItem(SAVE_RECOVERY_KEY, oldProtected);
    base.setItem(SAVE_KEY, currentCorrupt);
    const backup = createDefaultState();
    backup.game.phase = 'C';
    expect(saveState(backup, memoryStorage())).toBe(true);
    base.setItem(SAVE_BACKUP_KEY, JSON.stringify(backup));
    const manager = new StateManager(new EventBus(), undefined, base);

    expect(manager.restoreSaveBackup()).toEqual({ ok: false, reason: 'recovery-slot-occupied' });
    expect(base.getItem(SAVE_KEY)).toBe(currentCorrupt);
    expect(manager.exportOriginalSave()).toBe(currentCorrupt);
    expect(manager.exportProtectedOriginalSave()).toBe(oldProtected);
    expect(manager.restoreSaveBackup({ replaceProtectedOriginal: true })).toEqual({ ok: true });
    expect(base.getItem(SAVE_KEY)).toBe(JSON.stringify(backup));
    expect(base.getItem(SAVE_RECOVERY_KEY)).toBe(currentCorrupt);
  });

  it('does not replace an abnormal primary if the recovery copy cannot be stored', () => {
    const raw = '{keep this exact text';
    const backing = memoryStorage();
    backing.setItem(SAVE_KEY, raw);
    const failing = memoryStorage({
      getItem: (key) => backing.getItem(key),
      setItem: (key, value) => {
        if (key === SAVE_RECOVERY_KEY) throw new Error('quota exceeded');
        backing.setItem(key, value);
      },
      removeItem: (key) => backing.removeItem(key),
    });
    const manager = new StateManager(new EventBus(), undefined, failing);
    expect(manager.restartFromRecovery()).toEqual({ ok: false, reason: 'recovery-protection-failed' });
    expect(backing.getItem(SAVE_KEY)).toBe(raw);
    expect(backing.getItem(SAVE_RECOVERY_KEY)).toBeNull();
  });

  it('keeps a valid import from changing either record when preserving the current original conflicts', () => {
    const storage = memoryStorage();
    const previousRaw = '{older original';
    const current = '{current original';
    storage.setItem(SAVE_RECOVERY_KEY, previousRaw);
    storage.setItem(SAVE_KEY, current);
    const manager = new StateManager(new EventBus(), undefined, storage);
    const imported = createDefaultState();
    imported.game.phase = 'D';
    expect(manager.importSave(JSON.stringify(imported))).toEqual({ ok: false, reason: 'recovery-slot-occupied' });
    expect(storage.getItem(SAVE_KEY)).toBe(current);
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(previousRaw);
    expect(manager.importSave(JSON.stringify(imported), { replaceProtectedOriginal: true }).ok).toBe(true);
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(current);
    expect(manager.getState().game.phase).toBe('D');
  });
});
