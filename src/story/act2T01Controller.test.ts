import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { StateManager } from '../core/stateManager';
import { Act2T01Controller } from './act2T01Controller';

const buQueries = ['鸡公岭 补', '鸡公岭 神像', '补 神像', '鸡公岭 石庙'];
const ssQueries = ['双S 十字', 'A.W 鸡公岭'];

describe('Act2T01Controller', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (enterAct2 = true) => {
    const bus = new EventBus();
    const manager = new StateManager(bus, createDefaultState());
    if (enterAct2) {
      manager.setFlag('FLAG_A1_COMPLETE', true);
      manager.startSecondAct();
    }
    const controller = new Act2T01Controller(manager, bus);
    controller.start();
    return { bus, manager, controller };
  };

  it.each([['鸡公岭 补', '双S 十字'], ['双S 十字', '鸡公岭 补'], ['鸡公岭 石庙', 'A.W 鸡公岭']])('converges through both search orders', (first, second) => {
    const { manager, controller } = setup();
    manager.recordBrowserSearch(first);
    expect(manager.getState().game.flags.FLAG_A2_WEB_SEARCH_FAILED).toBeUndefined();
    manager.recordBrowserSearch(second);
    const state = manager.getState();
    expect(state.game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBe(true);
    expect(state.game.flags.FLAG_A2_SEARCH_SS_ATTEMPTED).toBe(true);
    expect(state.game.flags.FLAG_A2_WEB_SEARCH_FAILED).toBe(true);
    expect(state.game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED).toBe(true);
    expect(state.modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_001']);
    expect(state.modules.act2Research.stage).toBe('search');
    expect(state.game.phase).toBe('A2_T01');
    controller.dispose();
  });

  it('accepts every frozen topic query and stays idempotent on repeats', () => {
    const { manager, controller } = setup();
    for (const query of [...buQueries, ...ssQueries, ...buQueries]) manager.recordBrowserSearch(query);
    const state = manager.getState();
    expect(state.modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_001']);
    expect(state.modules.act2Research.stage).toBe('search');
    controller.dispose();
  });

  it('stays idle outside the T01 search window', () => {
    const firstAct = setup(false);
    for (const query of [...buQueries, ...ssQueries]) firstAct.manager.recordBrowserSearch(query);
    expect(firstAct.manager.getState().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
    expect(firstAct.manager.getState().modules.notepad.autoEntryIds).toEqual([]);
    firstAct.controller.dispose();

    const laterStage = setup();
    laterStage.manager.setAct2Stage('bridge');
    laterStage.manager.recordBrowserSearch('鸡公岭 补');
    expect(laterStage.manager.getState().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
    laterStage.controller.dispose();
  });

  it('ignores searches that are not part of the frozen T01 set', () => {
    const { manager, controller } = setup();
    manager.recordBrowserSearch('鸡公岭');
    manager.recordBrowserSearch('XX县失踪');
    expect(manager.getState().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
    expect(manager.getState().modules.act2Research.stage).toBe('search');
    controller.dispose();
  });

  it('keeps the first-act browser history while searching', () => {
    const { manager, controller } = setup();
    manager.recordBrowserSearch('XX县失踪');
    manager.recordBrowserSearch('鸡公岭 徒步');
    const before = [...manager.getState().modules.browser.queryHistory];
    manager.recordBrowserSearch('鸡公岭 补');
    manager.recordBrowserSearch('A.W 鸡公岭');
    expect(manager.getState().modules.browser.queryHistory).toContain('XX县失踪');
    expect(manager.getState().modules.browser.queryHistory).toContain('鸡公岭 徒步');
    expect(before.length).toBe(2);
    controller.dispose();
  });

  it('adds the weak note after fifteen seconds and never twice', () => {
    const { manager, controller } = setup();
    vi.advanceTimersByTime(14999);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_002']);
    vi.advanceTimersByTime(30000);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_002']);
    controller.dispose();
  });

  it('drops the weak note once the internet search is already resolved', () => {
    const { manager, controller } = setup();
    manager.recordBrowserSearch('鸡公岭 补');
    manager.recordBrowserSearch('双S 十字');
    vi.advanceTimersByTime(20000);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_001']);
    controller.dispose();
  });

  it('clears its timer on dispose', () => {
    const { manager, controller } = setup();
    vi.advanceTimersByTime(14000);
    controller.dispose();
    vi.advanceTimersByTime(30000);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual([]);
    expect(manager.getState().game.flags.FLAG_A2_WEB_SEARCH_FAILED).toBeUndefined();
  });
});
