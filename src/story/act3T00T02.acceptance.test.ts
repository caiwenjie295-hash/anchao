import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { hydrateState } from '../core/saveManager';
import { StateManager } from '../core/stateManager';
import { act3FirstLensId, act3LensById, act3RequiredClueIds, act3StageDoc, ACT3_STAGE_COMPLETION_FLAG, ACT3_STAGE_GATE_FLAG } from '../data/act3Data';
import { act2T07 } from '../data/act2T07Data';
import { getPendingStoryTransition } from '../data/storyTransitionData';
import { findAct3RoutePathToClue } from './investigation/act3RoutePolicy';
import type { Act3ActiveStage } from '../core/types';

function completedT06() {
  const state = createDefaultState();
  state.game.act = 2;
  state.game.phase = 'A2_T06';
  state.game.flags = {
    FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true,
    FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true,
    FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SCORE_CHANGE_KNOWN: true,
    FLAG_A2_QIMING_OFFICIAL_FOUND: true, FLAG_A2_QIMING_TESTIMONIALS_READ: true,
    FLAG_A2_QIMING_FORUM_FOUND: true, FLAG_A2_HUANG_MATCH_INFERRED: true,
    FLAG_A2_ZHONG_MATCH_INFERRED: true, FLAG_A2_OTHER_CASES_ABNORMAL: true,
  };
  state.modules.act2Research.stage = 'qiming';
  state.modules.act2Research.school.visitedAreaIds = ['AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'];
  state.modules.act2Research.school.inspectedHotspotIds = ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_TEACHER'];
  state.modules.act2Research.school.selectedEvidenceIds = ['rank-record', 'teacher-account'];
  state.modules.act2Research.school.selectedInferenceId = 'bounded-timeline';
  state.modules.act2Research.school.symbolMatchConfirmed = true;
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
  manager.compareAct2T07TempleFrame(frame.id, 'square-opening');
  manager.confirmAct2T07TempleFrame();
  manager.inferAct2T07Location();
  manager.planAct2T07SecondTrip();
  manager.completeAct2T07Finale();
  expect(manager.getState().game.flags.FLAG_A2_COMPLETE).toBe(true);
  return manager.getState();
}

function inspectClue(manager: StateManager, stage: Act3ActiveStage, clueId: string, visiting = new Set<string>()) {
  const doc = act3StageDoc(stage);
  const lens = doc.lenses.find((item) => item.hotspots.some((hotspot) => hotspot.clueId === clueId));
  if (!lens) throw new Error(`No authored lens contains ${clueId}`);
  if (visiting.has(clueId)) throw new Error(`Cyclic clue prerequisite at ${clueId}`);
  visiting.add(clueId);
  for (const prerequisite of lens.requiresClueIds ?? []) {
    if (!manager.getState().modules.act3.inspectedClueIds.includes(prerequisite)) inspectClue(manager, stage, prerequisite, visiting);
  }
  const current = manager.getState().modules.act3.currentLensId;
  const path = findAct3RoutePathToClue(stage, current, clueId, manager.getState().modules.act3.inspectedClueIds);
  if (!path) throw new Error(`No open route to ${clueId} in ${stage}`);
  if (!current) manager.enterAct3Lens(act3FirstLensId(stage));
  for (const lensId of path) {
    if (!manager.enterAct3Lens(lensId)) throw new Error(`State manager rejected route to ${lensId}`);
  }
  manager.inspectAct3Clue(clueId);
  visiting.delete(clueId);
}

function inspectRequired(manager: StateManager, stage: Act3ActiveStage) {
  expect(manager.getState().modules.act3.stage).toBe(stage);
  for (const clueId of act3RequiredClueIds(stage)) inspectClue(manager, stage, clueId);
  expect(manager.getState().modules.act3.inspectedClueIds).toEqual(expect.arrayContaining(act3RequiredClueIds(stage)));
}

describe('Third-act evidence, route and departure flow', () => {
  it('keeps confirming a judgement separate from leaving the current stage', () => {
    const manager = new StateManager(undefined, completedT07());
    manager.startAct3();
    expect(manager.getState().game.phase).toBe('A3_T00');
    expect(getPendingStoryTransition(manager.getState())?.id).toBe('TRANSITION_A3_T00');
    manager.enterAct3Lens('LENS_A3_T00_001');
    manager.inspectAct3Clue('CLUE_A3_T01_GATE_VIEW');
    manager.confirmAct3Stage();
    expect(manager.getState().modules.act3.stage).toBe('T00');
    expect(manager.getState().game.flags[ACT3_STAGE_COMPLETION_FLAG.T00]).not.toBe(true);

    inspectRequired(manager, 'T00');
    manager.confirmAct3Stage();
    expect(manager.getState().modules.act3.stage).toBe('T00');
    expect(manager.getState().game.phase).toBe('A3_T00');
    expect(manager.getState().game.flags[ACT3_STAGE_COMPLETION_FLAG.T00]).toBe(true);
    expect(manager.getState().game.flags[ACT3_STAGE_GATE_FLAG.T00]).not.toBe(true);
    manager.advanceAct3Stage();
    expect(manager.getState().modules.act3.stage).toBe('T01');
    expect(manager.getState().game.phase).toBe('A3_T01');
    expect(manager.getState().game.flags[ACT3_STAGE_GATE_FLAG.T00]).toBe(true);
    expect(manager.getState().modules.act3.currentLensId).toBe('LENS_A3_T01_001');
  });

  it('can finish all stages with core evidence and leaves T07 only after the notebook is confirmed', () => {
    let manager = new StateManager(undefined, completedT07());
    manager.startAct3();

    const stages: Act3ActiveStage[] = ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06'];
    for (const stage of stages) {
      inspectRequired(manager, stage);
      manager.confirmAct3Stage();
      expect(manager.getState().modules.act3.stage).toBe(stage);
      expect(manager.getState().game.flags[ACT3_STAGE_GATE_FLAG[stage]]).not.toBe(true);
      const saved = hydrateState(JSON.parse(JSON.stringify(manager.getState())));
      manager = new StateManager(undefined, saved);
      manager.advanceAct3Stage();
      const nextStage = `T${String(Number(stage.slice(1)) + 1).padStart(2, '0')}`;
      expect(manager.getState().modules.act3.stage).toBe(nextStage);
      expect(manager.getState().game.flags[ACT3_STAGE_GATE_FLAG[stage]]).toBe(true);
    }

    inspectRequired(manager, 'T07');
    expect(manager.getState().game.flags.FLAG_A3_NOTEBOOK_FOUND).toBe(true);
    expect(manager.getState().game.flags.FLAG_A3_COMPLETE).not.toBe(true);
    expect(manager.getState().game.flags.FLAG_A3_SITE_EXITED).not.toBe(true);
    manager = new StateManager(undefined, hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    manager.leaveAct3Stage();
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T04_001');
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T05_001');
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T06_001');
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T07_001');
    expect(manager.getState().game.flags.FLAG_A3_SITE_EXITED).toBe(true);
    expect(manager.getState().game.flags.FLAG_A3_COMPLETE).toBe(true);
    expect(manager.getState().game.phase).toBe('A3_T07');
    manager.leaveAct3Stage();
    expect(manager.getState().modules.act3.confirmedFlagIds.filter((id) => id === 'FLAG_A3_COMPLETE')).toHaveLength(1);
  });

  it('continues a saved judgement from the active stage after reload', () => {
    const manager = new StateManager(undefined, completedT07());
    manager.startAct3();
    inspectRequired(manager, 'T00');
    manager.confirmAct3Stage();
    const restored = new StateManager(undefined, hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    restored.advanceAct3Stage();
    expect(restored.getState().game.phase).toBe('A3_T01');
    expect(act3LensById('T01', restored.getState().modules.act3.currentLensId ?? '')?.id).toBe('LENS_A3_T01_001');
  });
});
