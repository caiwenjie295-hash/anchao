import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { loadState, SAVE_KEY } from './saveManager';
import { StateManager } from './stateManager';

describe('deferred preference writes', () => {
  afterEach(() => vi.useRealTimers());

  it('notifies the UI immediately, coalesces typing, and flushes the latest state before a story save', () => {
    vi.useFakeTimers();
    localStorage.clear();
    const manager = new StateManager(new EventBus(), createDefaultState());
    const updates: string[] = [];
    manager.subscribe(() => updates.push(manager.getState().modules.notepad.userText));

    manager.setNotepadUserText('第一笔');
    manager.setNotepadUserText('连续输入');
    expect(updates).toEqual(['第一笔', '连续输入']);
    expect(manager.getSaveStatus()).toBe('saving');
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();

    manager.setFlag('FLAG_SAVE_TEST', true);
    expect(loadState().modules.notepad.userText).toBe('连续输入');
    expect(loadState().game.flags.FLAG_SAVE_TEST).toBe(true);
    vi.advanceTimersByTime(500);
    expect(loadState().modules.notepad.userText).toBe('连续输入');
  });

  it('flushes a pending geometry edit when the page is hidden', () => {
    vi.useFakeTimers();
    localStorage.clear();
    const manager = new StateManager(new EventBus(), createDefaultState());
    manager.setBounds('mail', { x: 300, y: 200, width: 820, height: 540 });
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    window.dispatchEvent(new Event('pagehide'));
    expect(loadState().desktop.windows.mail.bounds).toEqual({ x: 300, y: 200, width: 820, height: 540 });
    expect(manager.getSaveStatus()).toBe('saved');
  });

  it('publishes a recovery event after a valid save import for app-level feedback', () => {
    localStorage.clear();
    const bus = new EventBus();
    const manager = new StateManager(bus, createDefaultState());
    const imported = vi.fn();
    bus.on('save:imported', imported);

    expect(manager.importSave(JSON.stringify(createDefaultState())).ok).toBe(true);
    expect(imported).toHaveBeenCalledOnce();
    expect(imported).toHaveBeenCalledWith({ schemaVersion: 13 });
  });
});
