import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/eventBus';
import { createDefaultState } from '../core/defaultState';
import { StateManager } from '../core/stateManager';
import { Act2T06Controller } from './act2T06Controller';

describe('Act2T06Controller', () => {
  it('records only read-page flags and writes the gated official and forum notes idempotently', () => {
    const state = createDefaultState(); state.modules.act2Research.stage = 'qiming';
    state.game.flags = { FLAG_A2_SS_MATCH_CONFIRMED: true };
    const bus = new EventBus(); const manager = new StateManager(bus, state); const controller = new Act2T06Controller(manager, bus); controller.start();
    manager.recordBrowserPageVisit('PAGE_A2_T06_001');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_OFFICIAL_FOUND).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_QIMING_FORUM_FOUND).not.toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T06_001');
    manager.recordBrowserPageVisit('PAGE_A2_T06_004');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ).toBe(true);
    manager.recordBrowserPageVisit('PAGE_A2_T06_006'); manager.recordBrowserPageVisit('PAGE_A2_T06_006');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_FORUM_FOUND).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds.filter((id) => id === 'NOTE_A2_T06_002')).toHaveLength(1);
    controller.dispose();
  });
  it('ignores T06 page events outside qiming and requires both explicit comparisons and both follow-up reads', () => {
    const state = createDefaultState(); state.modules.act2Research.stage = 'school'; state.game.flags.FLAG_A2_SS_MATCH_CONFIRMED = true;
    const bus = new EventBus(); const manager = new StateManager(bus, state); const controller = new Act2T06Controller(manager, bus); controller.start();
    manager.recordBrowserPageVisit('PAGE_A2_T06_006');
    expect(manager.getState().modules.browser.visitedPageIds).not.toContain('PAGE_A2_T06_006');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_FORUM_FOUND).not.toBe(true);
    controller.dispose();
  });
});
