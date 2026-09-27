import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { hydrateState } from '../core/saveManager';
import { StateManager } from '../core/stateManager';
import { act3StageClueIds, act3StageDoc, ACT3_STAGE_COMPLETION_FLAG, ACT3_STAGE_GATE_FLAG } from '../data/act3Data';
import { act2T07 } from '../data/act2T07Data';
import { getPendingStoryTransition } from '../data/storyTransitionData';
import type { Act3ActiveStage } from '../core/types';

function completedT06() {
  const state = createDefaultState();
  state.game.act = 2;
  state.game.phase = 'A2_T06';
  state.game.flags = {
    FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true,
    FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true,
    FLAG_A2_QIMING_OFFICIAL_FOUND: true, FLAG_A2_QIMING_TESTIMONIALS_READ: true,
    FLAG_A2_QIMING_FORUM_FOUND: true, FLAG_A2_HUANG_MATCH_INFERRED: true,
    FLAG_A2_ZHONG_MATCH_INFERRED: true, FLAG_A2_OTHER_CASES_ABNORMAL: true,
  };
  state.modules.act2Research.stage = 'qiming';
  state.modules.act2Research.school.visitedAreaIds = ['AREA_A2_T05_XIAOA_CLASSROOM'];
  state.modules.act2Research.school.inspectedHotspotIds = ['HOTSPOT_A2_T05_SCHOLAR_NOTE'];
  state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009'];
  return state;
}

function completedT07() {
  const manager = new StateManager(undefined, completedT06());
  manager.enterAct2FinaleInvestigation();
  manager.viewAct2T07Material(act2T07.photoMaterialId);
  manager.confirmAct2T07PhotoSymbol();
  manager.viewAct2T07Material(act2T07.video.materialId);
  for (const id of act2T07.video.requiredSegmentIds) manager.markAct2T07SegmentPlayed(id);
  const frame = act2T07.video.keyFrames[0];
  manager.captureAct2T07Frame(frame.id, frame.startMs);
  manager.compareAct2T07TempleFrame(frame.id);
  manager.confirmAct2T07TempleFrame();
  manager.inferAct2T07Location();
  manager.planAct2T07SecondTrip();
  manager.completeAct2T07Finale();
  expect(manager.getState().game.flags.FLAG_A2_COMPLETE).toBe(true);
  return manager.getState();
}

function inspectStage(manager: StateManager, stage: Act3ActiveStage) {
  expect(manager.getState().modules.act3.stage).toBe(stage);
  for (const lens of act3StageDoc(stage).lenses) {
    manager.enterAct3Lens(lens.id);
    for (const hotspot of lens.hotspots) manager.inspectAct3Clue(hotspot.clueId);
  }
  expect(manager.getState().modules.act3.inspectedClueIds).toEqual(expect.arrayContaining(act3StageClueIds(stage)));
}

describe('Third-act T00–T02 continuous investigation', () => {
  it('requires every T00 clue and enters T01 with both gate flags', () => {
    const manager = new StateManager(undefined, completedT07());
    manager.startAct3();
    expect(manager.getState().game.phase).toBe('A3_T00');
    expect(getPendingStoryTransition(manager.getState())?.id).toBe('TRANSITION_A3_T00');
    manager.enterAct3Lens('LENS_A3_T00_001');
    manager.inspectAct3Clue('CLUE_A3_T01_GATE_VIEW');
    manager.confirmAct3Stage();
    expect(manager.getState().modules.act3.stage).toBe('T00');
    inspectStage(manager, 'T00');
    manager.confirmAct3Stage();
    const state = manager.getState();
    expect(state.modules.act3.stage).toBe('T01');
    expect(state.game.phase).toBe('A3_T01');
    expect(state.game.flags[ACT3_STAGE_COMPLETION_FLAG.T00]).toBe(true);
    expect(state.game.flags[ACT3_STAGE_GATE_FLAG.T00]).toBe(true);
    expect(state.modules.act3.currentLensId).toBe('LENS_A3_T01_001');
  });

  it('reloads each stage and reaches the T03 confinement conclusion', () => {
    let manager = new StateManager(undefined, completedT07());
    manager.startAct3();
    inspectStage(manager, 'T00');
    manager.confirmAct3Stage();
    manager = new StateManager(undefined, hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    expect(manager.getState().game).toMatchObject({ act: 3, phase: 'A3_T01' });
    inspectStage(manager, 'T01');
    manager.confirmAct3Stage();
    expect(manager.getState().game.flags[ACT3_STAGE_GATE_FLAG.T01]).toBe(true);
    manager = new StateManager(undefined, hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    expect(manager.getState().game).toMatchObject({ act: 3, phase: 'A3_T02' });
    inspectStage(manager, 'T02');
    manager.confirmAct3Stage();
    expect(manager.getState().modules.act3.stage).toBe('T03');
    expect(manager.getState().game.flags[ACT3_STAGE_COMPLETION_FLAG.T02]).toBe(true);
    expect(manager.getState().game.flags[ACT3_STAGE_GATE_FLAG.T02]).toBe(true);
    manager = new StateManager(undefined, hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    expect(manager.getState().game.phase).toBe('A3_T03');
    manager.confirmAct3Stage();
    expect(manager.getState().game.flags.FLAG_A3_CONFINEMENT_SITE_CONFIRMED).not.toBe(true);
    inspectStage(manager, 'T03');
    manager.confirmAct3Stage();
    expect(manager.getState().game.flags[ACT3_STAGE_COMPLETION_FLAG.T03]).toBe(true);
    expect(manager.getState().game.flags[ACT3_STAGE_GATE_FLAG.T03]).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T03_001');
    manager = new StateManager(undefined, hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    expect(manager.getState().game.phase).toBe('A3_T03');
    expect(manager.getState().modules.act3.stage).toBe('T03');
  });
});
