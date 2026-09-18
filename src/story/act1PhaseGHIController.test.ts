import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { StateManager } from '../core/stateManager';
import { Act1PhaseGHIController } from './act1PhaseGHIController';

describe('Act1PhaseGHIController', () => {
  const setup = () => {
    const bus = new EventBus();
    const state = createDefaultState();
    state.game.phase = 'F';
    const manager = new StateManager(bus, state);
    const controller = new Act1PhaseGHIController(manager, bus);
    controller.start();
    return { manager, controller };
  };
  beforeEach(() => localStorage.clear());

  it('moves from F through the three trails into the cave without shortcutting', () => {
    const { manager, controller } = setup();
    manager.startJourney('SCENE_A1_G_001');
    expect(manager.getState().game.phase).toBe('G');
    manager.enterScene('SCENE_A1_H_001');
    expect(manager.getState().modules.scene.currentSceneId).toBe('SCENE_A1_G_001');
    manager.enterScene('SCENE_A1_G_002');
    manager.enterScene('SCENE_A1_G_003');
    manager.enterScene('SCENE_A1_H_001');
    expect(manager.getState().game.phase).toBe('H');
    controller.dispose();
  });

  it('requires actively noticing A.W before its photo unlocks the temple', () => {
    const { manager, controller } = setup();
    manager.startJourney('SCENE_A1_G_001');
    manager.enterScene('SCENE_A1_G_002'); manager.enterScene('SCENE_A1_G_003'); manager.enterScene('SCENE_A1_H_001');
    manager.captureScenePhoto('SCENE_A1_H_001', 'IMG_A1_H_003');
    expect(manager.getState().modules.scene.capturedPhotoIds).toEqual([]);
    manager.inspectSceneHotspot('HOTSPOT_A1_H_014');
    expect(manager.getState().game.flags.FLAG_A1_AW_FOUND).toBe(true);
    manager.captureScenePhoto('SCENE_A1_H_001', 'IMG_A1_H_003');
    expect(manager.getState().game.flags.FLAG_A1_AW_PHOTO_TAKEN).toBe(true);
    manager.enterScene('SCENE_A1_I_001');
    expect(manager.getState().game).toMatchObject({ phase: 'I', flags: { FLAG_A1_TEMPLE_FOUND: true } });
    controller.dispose();
  });

  it('requires the temple letter and photo before returning to the desktop', () => {
    const { manager, controller } = setup();
    manager.startJourney('SCENE_A1_G_001'); manager.enterScene('SCENE_A1_G_002'); manager.enterScene('SCENE_A1_G_003'); manager.enterScene('SCENE_A1_H_001');
    manager.inspectSceneHotspot('HOTSPOT_A1_H_014'); manager.captureScenePhoto('SCENE_A1_H_001', 'IMG_A1_H_003'); manager.enterScene('SCENE_A1_I_001');
    manager.finishJourney('SCENE_A1_I_001');
    expect(manager.getState().modules.scene.journeyStarted).toBe(true);
    manager.inspectSceneHotspot('HOTSPOT_A1_I_005');
    manager.captureScenePhoto('SCENE_A1_I_001', 'IMG_A1_I_004');
    manager.finishJourney('SCENE_A1_I_001');
    expect(manager.getState().modules.scene).toMatchObject({ journeyStarted: false, currentSceneId: null, capturedPhotoIds: ['IMG_A1_H_003', 'IMG_A1_I_004'] });
    expect(manager.getState().game.phase).toBe('I');
    controller.dispose();
  });
});
