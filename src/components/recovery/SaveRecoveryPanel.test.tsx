import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../core/eventBus';
import { createDefaultState } from '../../core/defaultState';
import { SAVE_BACKUP_KEY, SAVE_KEY, SAVE_RECOVERY_KEY } from '../../core/saveManager';
import { StateManager } from '../../core/stateManager';
import type { SaveStoragePort } from '../../core/persistence/browserStorage';
import { SaveRecoveryPanel } from './SaveRecoveryPanel';

function memoryStorage(): SaveStoragePort {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('SaveRecoveryPanel', () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('restores a valid backup through the recovery entry and retains the corrupt source', () => {
    const storage = memoryStorage();
    const backup = createDefaultState();
    backup.game.flags.FLAG_PANEL_RECOVERY_TEST = true;
    storage.setItem(SAVE_BACKUP_KEY, JSON.stringify(backup));
    const raw = '{broken original';
    storage.setItem(SAVE_KEY, raw);
    const manager = new StateManager(new EventBus(), undefined, storage);

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(SaveRecoveryPanel, { manager })));
    expect(container.textContent).toContain('调查记录无法读取');
    const restore = [...container.querySelectorAll('button')].find((button) => button.textContent === '恢复最近的有效备份') as HTMLButtonElement;
    act(() => restore.click());
    expect(manager.getState().game.flags.FLAG_PANEL_RECOVERY_TEST).toBe(true);
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(raw);
    expect(storage.getItem(SAVE_KEY)).not.toBe(raw);
  });

  it('keeps the preserved original exportable after a successful restore', () => {
    const storage = memoryStorage();
    const backup = createDefaultState();
    storage.setItem(SAVE_BACKUP_KEY, JSON.stringify(backup));
    const raw = '{broken original for export';
    storage.setItem(SAVE_KEY, raw);
    const manager = new StateManager(new EventBus(), undefined, storage);
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:save-export-test');

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(SaveRecoveryPanel, { manager })));
    const restore = [...container.querySelectorAll('button')].find((button) => button.textContent === '恢复最近的有效备份') as HTMLButtonElement;
    act(() => restore.click());
    expect(manager.getRecoveryState().kind).toBe('none');
    expect(container.textContent).toContain('已保护一份原始调查记录');

    const exportButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('导出已保护原始记录')) as HTMLButtonElement;
    act(() => exportButton.click());
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="status"]')?.textContent).toContain('已开始下载');
    createObjectUrl.mockRestore();
  });

  it('requires a separate confirmation before replacing the main save with a fresh state', () => {
    const storage = memoryStorage();
    const raw = '{keep original bytes';
    storage.setItem(SAVE_KEY, raw);
    const manager = new StateManager(new EventBus(), undefined, storage);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(SaveRecoveryPanel, { manager })));

    const restart = [...container.querySelectorAll('button')].find((button) => button.textContent === '明确重新开始…') as HTMLButtonElement;
    act(() => restart.click());
    expect(container.textContent).toContain('确认重新开始');
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    const confirm = [...container.querySelectorAll('button')].find((button) => button.textContent === '确认重新开始') as HTMLButtonElement;
    act(() => confirm.click());
    expect(manager.getState()).toEqual(createDefaultState());
    expect(storage.getItem(SAVE_RECOVERY_KEY)).toBe(raw);
    expect(storage.getItem(SAVE_KEY)).not.toBe(raw);
  });

  it('keeps temporary progress until the player confirms using a device save found after storage returns', () => {
    let denied = true;
    const backing = memoryStorage();
    const deviceSave = createDefaultState();
    deviceSave.game.phase = 'E';
    backing.setItem(SAVE_KEY, JSON.stringify(deviceSave));
    const storage: SaveStoragePort = {
      getItem: (key) => { if (denied) throw new Error('storage denied'); return backing.getItem(key); },
      setItem: (key, value) => { if (denied) throw new Error('storage denied'); backing.setItem(key, value); },
      removeItem: (key) => { if (denied) throw new Error('storage denied'); backing.removeItem(key); },
    };
    const manager = new StateManager(new EventBus(), undefined, storage);
    manager.setNotepadUserText('临时记录保留');
    denied = false;
    expect(manager.refreshSaveRecovery()).toEqual({ ok: false, reason: 'device-save-available' });

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(SaveRecoveryPanel, { manager })));
    const adopt = [...container.querySelectorAll('button')].find((button) => button.textContent === '使用设备上的记录…') as HTMLButtonElement;
    act(() => adopt.click());
    expect(manager.getState().modules.notepad.userText).toBe('临时记录保留');
    expect(container.textContent).toContain('使用设备上的记录会替换本次窗口中的临时状态');

    const confirm = [...container.querySelectorAll('button')].find((button) => button.textContent === '确认使用设备记录') as HTMLButtonElement;
    act(() => confirm.click());
    expect(manager.getState().game.phase).toBe('E');
    expect(manager.getState().modules.notepad.userText).not.toBe('临时记录保留');
    expect(manager.getRecoveryState().kind).toBe('none');
  });

  it('does not treat exporting temporary progress as exporting a conflicting original record', () => {
    const storage = memoryStorage();
    const currentOriginal = '{current damaged original';
    const protectedOriginal = '{older preserved original';
    storage.setItem(SAVE_KEY, currentOriginal);
    storage.setItem(SAVE_RECOVERY_KEY, protectedOriginal);
    const manager = new StateManager(new EventBus(), undefined, storage);
    const deviceSave = createDefaultState();
    deviceSave.game.phase = 'E';
    storage.setItem(SAVE_KEY, JSON.stringify(deviceSave));
    expect(manager.refreshSaveRecovery()).toEqual({ ok: false, reason: 'device-save-available' });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:save-export-test');
    const clickLink = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(SaveRecoveryPanel, { manager })));
    const temporary = [...container.querySelectorAll('button')].find((button) => button.textContent === '导出本次临时记录') as HTMLButtonElement;
    const protectedRecord = [...container.querySelectorAll('button')].find((button) => button.textContent === '导出先前保护记录') as HTMLButtonElement;
    act(() => temporary.click());
    act(() => protectedRecord.click());

    const confirmation = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(confirmation).not.toBeNull();
    expect(confirmation?.disabled).toBe(true);
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    clickLink.mockRestore();
    createObjectUrl.mockRestore();
  });
});
