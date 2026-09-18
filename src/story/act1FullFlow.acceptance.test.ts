import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { loadState } from '../core/saveManager';
import { StateManager } from '../core/stateManager';
import { MOM_CONTACT_ID, momMessageEvent } from '../data/wechatData';
import { Act1PhaseBController } from './act1PhaseBController';
import { Act1PhaseCController } from './act1PhaseCController';
import { Act1PhaseEFController } from './act1PhaseEFController';
import { Act1PhaseGHIController } from './act1PhaseGHIController';
import { Act1PhaseJKController } from './act1PhaseJKController';

describe('Independent first-act acceptance: controllers running together', () => {
  const running: { dispose(): void }[] = [];
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { running.splice(0).forEach((controller) => controller.dispose()); vi.useRealTimers(); });

  function setup(initialState = createDefaultState()) {
    const bus = new EventBus();
    const manager = new StateManager(bus, initialState);
    const controllers = [
      new Act1PhaseBController(manager, bus),
      new Act1PhaseCController(manager, bus),
      new Act1PhaseEFController(manager, bus),
      new Act1PhaseGHIController(manager, bus),
      new Act1PhaseJKController(manager, bus),
    ];
    controllers.forEach((controller) => controller.start());
    running.push(...controllers);
    return { manager, bus, controllers };
  }

  function investigate(manager: StateManager, bus: EventBus) {
    manager.openApp('wechat');
    vi.advanceTimersByTime(momMessageEvent.delayMs);
    bus.emit('chat:opened', { contactId: MOM_CONTACT_ID });
    manager.markMailRead('MAIL_A1_C_001');
    manager.recordBrowserSearch('鸡公岭');
    manager.recordBrowserPageVisit('PAGE_A1_E_001');
    manager.recordBrowserPageVisit('PAGE_A1_E_002');
    expect(manager.getState().game.phase).toBe('F');
  }

  function explore(manager: StateManager) {
    manager.startJourney('SCENE_A1_G_001');
    expect(manager.getState().game.phase).toBe('G');
    manager.enterScene('SCENE_A1_G_002');
    manager.enterScene('SCENE_A1_G_003');
    manager.enterScene('SCENE_A1_H_001');
    expect(manager.getState().game.phase).toBe('H');
    manager.inspectSceneHotspot('HOTSPOT_A1_H_014');
    expect(manager.getState().game.phase).toBe('H');
    manager.captureScenePhoto('SCENE_A1_H_001', 'IMG_A1_H_003');
    expect(manager.getState().game.phase).toBe('H');
    manager.enterScene('SCENE_A1_I_001');
    expect(manager.getState().game.phase).toBe('I');
    manager.inspectSceneHotspot('HOTSPOT_A1_I_005');
    expect(manager.getState().game.phase).toBe('I');
    manager.captureScenePhoto('SCENE_A1_I_001', 'IMG_A1_I_004');
    manager.finishJourney('SCENE_A1_I_001');
    expect(manager.getState().game.phase).toBe('I');
    expect(manager.getState().modules.scene.currentSceneId).toBeNull();
    expect(manager.getState().modules.scene.capturedPhotoIds).toEqual(['IMG_A1_H_003', 'IMG_A1_I_004']);
  }

  function finishAct(manager: StateManager) {
    manager.openApp('explorer');
    manager.openPhotoEditor('IMG_A1_H_003');
    expect(manager.getState().game.phase).toBe('J');
    manager.inspectPhotoSymbol('IMG_A1_H_003');
    expect(manager.getState().game.flags.FLAG_A1_SS_FOUND).not.toBe(true);
    manager.setPhotoAdjustment('IMG_A1_H_003', 'exposure', 55);
    manager.setPhotoAdjustment('IMG_A1_H_003', 'shadows', 50);
    manager.setPhotoAdjustment('IMG_A1_H_003', 'contrast', 35);
    manager.setPhotoZoom('IMG_A1_H_003', 1.8);
    expect(manager.getState().game.flags.FLAG_A1_SS_FOUND).not.toBe(true);
    manager.inspectPhotoSymbol('IMG_A1_H_003');
    expect(manager.getState().game).toMatchObject({ phase: 'K', flags: {
      FLAG_A1_PHOTO_EDIT_OPENED: true,
      FLAG_A1_SS_FOUND: true,
      FLAG_A1_SS_CLUE_RECORDED: true,
    } });
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A1_K_001');
    expect(manager.getState().game.flags.FLAG_A1_COMPLETE).not.toBe(true);
    manager.finishFirstAct();
    expect(manager.getState().game.flags.FLAG_A1_COMPLETE).toBe(true);
  }

  it('progresses A–I without earlier controllers pulling later phases backwards', () => {
    const { manager, bus } = setup();
    investigate(manager, bus);
    explore(manager);
    manager.recordBrowserPageVisit('PAGE_A1_E_001');
    manager.markMailRead('MAIL_A1_C_001');
    expect(manager.getState().game.phase).toBe('I');
  });

  it('restores a post-journey save without replaying the journey', () => {
    const { manager, bus, controllers } = setup();
    investigate(manager, bus);
    explore(manager);
    controllers.forEach((controller) => controller.dispose());
    const restored = setup(loadState()).manager;
    expect(restored.getState().game.phase).toBe('I');
    expect(restored.getState().modules.scene.currentSceneId).toBeNull();
  });

  it('clears saved and live domains and permits a second complete investigation', () => {
    const { manager, bus } = setup();
    investigate(manager, bus);
    explore(manager);
    finishAct(manager);
    manager.setNotepadUserText('验收临时笔记');
    manager.openApp('notepad');
    manager.toggleMaximize('notepad');
    manager.resetProgress();
    expect(manager.getState()).toEqual(createDefaultState());
    expect(loadState()).toEqual(createDefaultState());
    vi.runOnlyPendingTimers();
    expect(manager.getState()).toEqual(createDefaultState());
    investigate(manager, bus);
    explore(manager);
    finishAct(manager);
  });

  it('retains the completed act and edited evidence across reload and repeat interactions', () => {
    const { manager, bus, controllers } = setup();
    investigate(manager, bus);
    explore(manager);
    finishAct(manager);
    const completed = manager.getState();
    controllers.forEach((controller) => controller.dispose());
    const restored = setup(loadState()).manager;
    expect(restored.getState()).toEqual(completed);
    restored.recordBrowserPageVisit('PAGE_A1_E_001');
    restored.markMailRead('MAIL_A1_C_001');
    restored.openPhotoEditor('IMG_A1_H_003');
    restored.inspectPhotoSymbol('IMG_A1_H_003');
    expect(restored.getState().game.phase).toBe('K');
    expect(restored.getState().modules.notepad.autoEntryIds.filter((id) => id === 'NOTE_A1_K_001')).toHaveLength(1);
    restored.resetProgress();
    expect(loadState()).toEqual(createDefaultState());
  });

  it('cancels an in-flight mother message when resetting and starts a new timer on replay', () => {
    const { manager, bus } = setup();
    manager.openApp('wechat');
    vi.advanceTimersByTime(momMessageEvent.delayMs / 2);
    manager.resetProgress();
    vi.advanceTimersByTime(momMessageEvent.delayMs * 2);
    expect(loadState()).toEqual(createDefaultState());
    investigate(manager, bus);
    expect(manager.getState().game.phase).toBe('F');
  });
});
