import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { StateManager } from '../core/stateManager';
import { Act2T01Controller } from './act2T01Controller';

const buQueries = ['鸡公岭 补', '鸡公岭 神像', '补 神像', '鸡公岭 石庙'];
const ssQueries = ['双S 十字', 'A.W 鸡公岭'];

describe('Act2T01Controller', () => {
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

  it('offers offline research after one relevant search without claiming both topics were searched', () => {
    const { manager, controller } = setup();
    manager.recordBrowserSearch('鸡公岭 石庙');
    const state = manager.getState();
    expect(state.game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBe(true);
    expect(state.game.flags.FLAG_A2_SEARCH_SS_ATTEMPTED).toBeUndefined();
    expect(state.game.flags.FLAG_A2_WEB_SEARCH_FAILED).toBeUndefined();
    expect(state.game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED).toBe(true);
    expect(state.modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_001']);
    expect(state.modules.act2Research.stage).toBe('search');
    manager.setAct2Stage('bridge');
    expect(manager.getState().modules.act2Research.stage).toBe('bridge');
    controller.dispose();
  });

  it.each([
    ['鸡公岭 补', '双S 十字'],
    ['双S 十字', '鸡公岭 补'],
    ['鸡公岭石庙', 'A.W 鸡公岭'],
  ])('preserves real search history for either order: %s → %s', (first, second) => {
    const { manager, controller } = setup();
    manager.recordBrowserSearch(first);
    manager.recordBrowserSearch(second);
    const state = manager.getState();
    expect(state.game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBe(true);
    expect(state.game.flags.FLAG_A2_SEARCH_SS_ATTEMPTED).toBe(true);
    expect(state.game.flags.FLAG_A2_WEB_SEARCH_FAILED).toBe(true);
    expect(state.game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED).toBe(true);
    expect(state.modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_001']);
    expect(state.modules.act2Research.stage).toBe('search');
    controller.dispose();
  });

  it('accepts each frozen topic query and remains idempotent on repeats', () => {
    const { manager, controller } = setup();
    for (const query of [...buQueries, ...ssQueries, ...buQueries]) manager.recordBrowserSearch(query);
    const state = manager.getState();
    expect(state.modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T01_001']);
    expect(state.modules.act2Research.stage).toBe('search');
    controller.dispose();
  });

  it('stays idle outside the T01 search window and after disposal', () => {
    const firstAct = setup(false);
    for (const query of [...buQueries, ...ssQueries]) firstAct.manager.recordBrowserSearch(query);
    expect(firstAct.manager.getState().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
    expect(firstAct.manager.getState().modules.notepad.autoEntryIds).toEqual([]);
    firstAct.controller.dispose();

    const laterStage = setup();
    laterStage.manager.setAct2Stage('bridge');
    laterStage.controller.dispose();
    laterStage.manager.recordBrowserSearch('鸡公岭 补');
    expect(laterStage.manager.getState().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
  });

  it('ignores unrelated searches', () => {
    const { manager, controller } = setup();
    manager.recordBrowserSearch('鸡公岭');
    manager.recordBrowserSearch('XX县失踪');
    expect(manager.getState().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
    expect(manager.getState().game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED).toBeUndefined();
    expect(manager.getState().modules.act2Research.stage).toBe('search');
    controller.dispose();
  });

  it('preserves first-act browser history while searching', () => {
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
});
