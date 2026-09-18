import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { StateManager } from '../core/stateManager';
import { Act1PhaseEFController } from './act1PhaseEFController';

describe('Act1PhaseEFController', () => {
  beforeEach(() => localStorage.clear());
  const setup = () => { const bus = new EventBus(); const manager = new StateManager(bus, createDefaultState()); const controller = new Act1PhaseEFController(manager, bus); controller.start(); return { bus, manager, controller }; };
  it.each([['PAGE_A1_E_001', 'PAGE_A1_E_002'], ['PAGE_A1_E_002', 'PAGE_A1_E_001']])('converges through both key-page orders', (first, second) => {
    const { manager, controller } = setup();
    manager.recordBrowserPageVisit(first);
    manager.recordBrowserPageVisit(second);
    expect(manager.getState().game.flags.FLAG_A1_NEWS_FOUND).toBe(true);
    expect(manager.getState().game.flags.FLAG_A1_ROUTE_INFO_FOUND).toBe(true);
    expect(manager.getState().game.flags.FLAG_A1_MISSING_CASE_SUSPICIOUS).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A1_E_001']);
    controller.dispose();
  });
  it('deduplicates automatic notes and only reaches F after all four prerequisites', () => {
    const { manager, controller } = setup();
    manager.recordBrowserPageVisit('PAGE_A1_E_001');
    manager.recordBrowserPageVisit('PAGE_A1_E_002');
    manager.recordBrowserPageVisit('PAGE_A1_E_001');
    expect(manager.getState().game.phase).toBe('E');
    manager.setFlag('FLAG_A1_XIAOA_MISSING_KNOWN', true);
    expect(manager.getState().game.phase).toBe('E');
    manager.setFlag('FLAG_A1_MAIL_XIAOA_OPENED', true);
    expect(manager.getState().game.phase).toBe('F');
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A1_E_001', 'NOTE_A1_F_001']);
    controller.dispose();
  });
});
