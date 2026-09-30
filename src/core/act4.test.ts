import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { hydrateState, loadState } from './saveManager';
import { StateManager } from './stateManager';
import { act4OldMails } from '../data/act4/mail';
import { birthdayImageSlots } from '../data/act4/assets';
import { birthdayScenes } from '../data/act4/content';
import { laterScenesByStage } from '../data/act4/laterContent';
import { act2T07 } from '../data/act2T07Data';

const readyState = () => {
  const state = createDefaultState();
  state.game.act = 2;
  state.game.phase = 'A2_T06';
  state.game.flags = {
    FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true,
    FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true,
    FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true,
    FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SCORE_CHANGE_KNOWN: true,
    FLAG_A2_QIMING_OFFICIAL_FOUND: true, FLAG_A2_QIMING_TESTIMONIALS_READ: true,
  };
  state.modules.act2Research.stage = 'qiming';
  state.modules.act2Research.school = {
    visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'],
    inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_TEACHER'],
    selectedEvidenceIds: ['rank-record', 'teacher-account'], selectedInferenceId: 'bounded-timeline',
    symbolMatchConfirmed: true, legacyCompletionMigrated: false,
  };
  state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009'];
  const manager = new StateManager(new EventBus(), state);
  manager.reviewAct2QimingCase('huang', ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'], 'public-claims-and-followup-differ');
  manager.reviewAct2QimingCase('zhong', ['PAGE_A2_T06_004', 'PAGE_A2_T06_009'], 'public-claims-and-followup-differ');
  manager.enterAct2FinaleInvestigation();
  manager.viewAct2T07Material(act2T07.photoMaterialId);
  manager.confirmAct2T07PhotoSymbol();
  manager.viewAct2T07Material(act2T07.video.materialId);
  for (const segmentId of act2T07.video.requiredSegmentIds) manager.markAct2T07SegmentPlayed(segmentId);
  const frame = act2T07.video.keyFrames[0];
  manager.captureAct2T07Frame(frame.id, frame.startMs + 500);
  manager.submitAct2T07Comparison(frame.id, 'square-opening');
  manager.inferAct2T07Location();
  manager.planAct2T07SecondTrip();
  manager.completeAct2T07Finale();
  const completed = manager.getState();
  for (const flagId of ['FLAG_A3_GATE_REACHED', 'FLAG_A3_INNER_FENCE_PASSED', 'FLAG_A3_CLASSROOM_TURNED', 'FLAG_A3_STAIRS_DESCENDED', 'FLAG_A3_BROADCAST_DOOR_REACHED', 'FLAG_A3_KITCHEN_DOOR_REACHED', 'FLAG_A3_KITCHEN_EXITED', 'FLAG_A3_NOTEBOOK_FOUND', 'FLAG_A3_SITE_EXITED', 'FLAG_A3_COMPLETE'] as const) completed.game.flags[flagId] = true;
  completed.modules.act3.stage = 'T07';
  return completed;
};

const managerReadyForAct4 = () => new StateManager(new EventBus(), readyState());
const asLegacy = (state: ReturnType<typeof createDefaultState>, version = 10): Record<string, any> => {
  const result = JSON.parse(JSON.stringify(state)) as Record<string, any>;
  result.schemaVersion = version;
  if (version < 12) {
    result.game.flags.FLAG_A2_QIMING_FORUM_FOUND = true;
    result.game.flags.FLAG_A2_HUANG_MATCH_INFERRED = true;
    result.game.flags.FLAG_A2_ZHONG_MATCH_INFERRED = true;
    result.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL = true;
  }
  return result;
};

const legacyT05 = () => {
  const old = asLegacy(readyState());
  old.game.phase = 'A4_T05';
  old.modules.act4.stage = 'T05';
  old.modules.act4.solvedPuzzleIds = ['A4_P01', 'A4_P06', 'A4_P09', 'A4_P11'];
  old.modules.act4.unlockedAccountIds = ['weibo', 'mail'];
  old.modules.act4.checkedMailRecipients = ['protagonist', 'xiaoyue'];
  old.modules.act4.timelineReadDates = ['04-19'];
  old.modules.act4.viewedWakeMail = true;
  old.modules.act4.birthdayNodeId = 'taken';
  for (let index = 1; index <= 5; index += 1) old.game.flags[`FLAG_A4_T${String(index).padStart(2, '0')}_COMPLETE`] = true;
  return old;
};

const legacyThroughT08 = () => {
  const old = asLegacy(readyState());
  old.game.phase = 'A4_T10';
  old.modules.act4.stage = 'T10';
  old.modules.act4.solvedPuzzleIds = ['A4_P01', 'A4_P06', 'A4_P09', 'A4_P11', 'A4_P13', 'A4_P16', 'A4_P18'];
  old.modules.act4.unlockedAccountIds = ['weibo', 'mail'];
  old.modules.act4.checkedMailRecipients = ['protagonist', 'xiaoyue'];
  old.modules.act4.timelineReadDates = ['04-19'];
  old.modules.act4.viewedWakeMail = true;
  old.modules.act4.birthdayNodeId = 'taken';
  old.modules.act4.broadcastPeriodsConfirmed = ['morning', 'night'];
  old.modules.act4.seenLaterNodeIds = [
    ...laterScenesByStage('T06').map((scene) => scene.id),
    ...laterScenesByStage('T07').map((scene) => scene.id),
    ...laterScenesByStage('T08').map((scene) => scene.id),
  ];
  old.modules.act4.laterNodeId = 'A4_T08_KITCHEN';
  for (let index = 1; index <= 8; index += 1) old.game.flags[`FLAG_A4_T${String(index).padStart(2, '0')}_COMPLETE`] = true;
  return old;
};

describe('fourth act reading progression', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the third-act handoff explicit and requires real login, archive, note, doorway, and final-mail actions', () => {
    const manager = new StateManager(new EventBus(), createDefaultState());
    manager.startAct4();
    expect(manager.getState().modules.act4.stage).toBe('inactive');

    const ready = managerReadyForAct4();
    ready.startAct4();
    expect(ready.getState().modules.act4.stage).toBe('T01');

    ready.advanceAct4NarrativeSection('T01');
    expect(ready.getState().modules.act4.stage).toBe('T02');
    expect(ready.loginAct4Accounts('20200419')).toBe(false);
    ready.advanceAct4NarrativeSection('T02');
    expect(ready.getState().modules.act4.stage).toBe('T02');
    ready.checkAct4OldMail('protagonist');
    ready.checkAct4OldMail('xiaoyue');
    expect(ready.loginAct4Accounts('00000000')).toBe(false);
    expect(ready.loginAct4Accounts('20200419')).toBe(true);
    ready.advanceAct4NarrativeSection('T02');
    expect(ready.getState().modules.act4.stage).toBe('T03');

    ready.advanceAct4NarrativeSection('T03');
    ready.advanceAct4NarrativeSection('T02');
    expect(ready.getState().modules.act4.stage).toBe('T04');
    ready.advanceAct4NarrativeSection('T04');
    expect(ready.getState().modules.act4.stage).toBe('T04');
    ready.viewAct4WakeMail();
    ready.advanceAct4NarrativeSection('T04');
    ready.advanceAct4NarrativeSection('T05');
    expect(ready.getState().modules.act4.stage).toBe('T06');

    ready.advanceAct4NarrativeSection('T06');
    ready.advanceAct4NarrativeSection('T06');
    expect(ready.getState().modules.act4.stage).toBe('T07');
    ready.advanceAct4NarrativeSection('T07');
    expect(ready.getState().modules.act4.stage).toBe('T08');
    ready.advanceAct4NarrativeSection('T08');
    expect(ready.getState().modules.act4.stage).toBe('T08');
    expect(ready.openAct4Archive()).toBe(true);
    ready.advanceAct4NarrativeSection('T08');
    ready.advanceAct4NarrativeSection('T09');
    expect(ready.getState().modules.act4.stage).toBe('T09');
    expect(ready.exitAct4NarrativeDoor()).toBe(false);
    ready.advanceAct4NarrativeSection('T09');
    expect(ready.getState().modules.act4.stage).toBe('T09');
    expect(ready.hideAct4NarrativeNote()).toBe(true);
    expect(ready.exitAct4NarrativeDoor()).toBe(true);
    ready.advanceAct4NarrativeSection('T09');
    expect(ready.getState().modules.act4.stage).toBe('T10');
    ready.advanceAct4NarrativeSection('T10');
    expect(ready.getState().game.flags.FLAG_A4_COMPLETE).not.toBe(true);
    ready.openAct4FinalMail();
    ready.advanceAct4NarrativeSection('T10');
    const completedState = ready.getState();
    expect(completedState.game.flags.FLAG_A4_COMPLETE).toBe(true);
    expect(completedState.modules.act4.stage).toBe('T10');
    expect(completedState.modules.act4.solvedPuzzleIds).toEqual([]);
    ready.advanceAct4NarrativeSection('T10');
    expect(ready.getState()).toBe(completedState);
    expect(hydrateState(JSON.parse(JSON.stringify(completedState)))).toMatchObject({
      game: { flags: { FLAG_A4_T10_COMPLETE: true, FLAG_A4_COMPLETE: true } },
      modules: { act4: { stage: 'T10', finalMailOpened: true, completedNarrativeActionIds: expect.arrayContaining(['A4_T10_FINAL_MAIL_OPENED']) } },
    });
    expect(loadState(localStorage).modules.act4.stage).toBe('T10');
  });

  it('migrates a valid schema 10 T05 save and keeps T05 available until the reader continues', () => {
    const migrated = hydrateState(legacyT05());
    expect(migrated.schemaVersion).toBe(12);
    expect(migrated.modules.act4.stage).toBe('T05');
    expect(migrated.modules.act4.completedNarrativeSectionIds).toEqual([
      'A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04', 'A4_READ_T05',
    ]);
    const again = hydrateState(JSON.parse(JSON.stringify(migrated)));
    expect(again.modules.act4).toMatchObject({ stage: 'T05', completedNarrativeSectionIds: migrated.modules.act4.completedNarrativeSectionIds });
    const manager = new StateManager(new EventBus(), again);
    manager.startAct4T06();
    expect(manager.getState().modules.act4.stage).toBe('T06');
  });

  it('does not migrate high schema 10 flags without matching old evidence and prunes future state', () => {
    const forged = asLegacy(readyState());
    forged.game.phase = 'A4_T10';
    forged.modules.act4.stage = 'T10';
    forged.modules.act4.solvedPuzzleIds = [];
    forged.modules.act4.laterNodeId = 'A4_T10_MAIL';
    forged.modules.act4.seenLaterNodeIds = ['A4_T10_MAIL'];
    forged.modules.act4.packageStep = 3;
    forged.modules.act4.broadcastIndex = 6;
    forged.modules.act4.finalMailOpened = true;
    for (let index = 1; index <= 10; index += 1) forged.game.flags[`FLAG_A4_T${String(index).padStart(2, '0')}_COMPLETE`] = true;
    forged.game.flags.FLAG_A4_COMPLETE = true;

    const repaired = hydrateState(forged);
    expect(repaired.modules.act4.stage).toBe('T01');
    expect(repaired.game.phase).toBe('A4_T01');
    expect(repaired.modules.act4.completedNarrativeSectionIds).toEqual([]);
    expect(repaired.modules.act4.completedNarrativeActionIds).toEqual([]);
    expect(repaired.modules.act4.solvedPuzzleIds).toEqual([]);
    expect(repaired.modules.act4.laterNodeId).toBeNull();
    expect(repaired.modules.act4.seenLaterNodeIds).toEqual([]);
    expect(repaired.modules.act4.packageStep).toBe(0);
    expect(repaired.modules.act4.broadcastIndex).toBe(0);
    expect(repaired.modules.act4.finalMailOpened).toBe(false);
    expect(Object.keys(repaired.game.flags).filter((id) => id.startsWith('FLAG_A4_'))).toEqual([]);
  });

  it('keeps a genuinely opened legacy mail or archive even when the old chapter is unfinished', () => {
    const t04 = legacyT05();
    t04.modules.act4.stage = 'T04';
    t04.game.phase = 'A4_T04';
    t04.modules.act4.solvedPuzzleIds = ['A4_P01', 'A4_P06'];
    t04.modules.act4.birthdayNodeId = 'taken';
    delete t04.game.flags.FLAG_A4_T05_COMPLETE;
    delete t04.game.flags.FLAG_A4_T04_COMPLETE;
    t04.modules.act4.viewedWakeMail = true;
    const migratedT04 = hydrateState(t04);
    expect(migratedT04.modules.act4).toMatchObject({ stage: 'T04', viewedWakeMail: true, completedNarrativeActionIds: ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'] });
    expect(migratedT04.modules.act4.solvedPuzzleIds).not.toContain('A4_P11');
    expect(migratedT04.modules.act4.birthdayNodeId).toBe('study');
    expect(hydrateState(JSON.parse(JSON.stringify(migratedT04))).modules.act4.completedNarrativeActionIds).toEqual(migratedT04.modules.act4.completedNarrativeActionIds);

    const t08 = legacyThroughT08();
    t08.modules.act4.stage = 'T08';
    t08.game.phase = 'A4_T08';
    t08.modules.act4.seenLaterNodeIds = [
      ...laterScenesByStage('T06').map((scene) => scene.id),
      ...laterScenesByStage('T07').map((scene) => scene.id),
      ...laterScenesByStage('T08').slice(0, 8).map((scene) => scene.id),
    ];
    t08.modules.act4.laterNodeId = 'A4_T08_ARCHIVE';
    t08.modules.act4.solvedPuzzleIds.push('A4_P18');
    delete t08.game.flags.FLAG_A4_T08_COMPLETE;
    const migratedT08 = hydrateState(t08);
    expect(migratedT08.modules.act4).toMatchObject({ stage: 'T08', laterNodeId: 'A4_T08_ARCHIVE', completedNarrativeActionIds: expect.arrayContaining(['A4_T08_ARCHIVE_OPENED']) });
    expect(migratedT08.modules.act4.seenLaterNodeIds).not.toContain('A4_T08_MIRROR');
    expect(hydrateState(JSON.parse(JSON.stringify(migratedT08))).modules.act4.completedNarrativeActionIds).toEqual(migratedT08.modules.act4.completedNarrativeActionIds);
  });

  it('does not infer a schema 10 doorway exit from T10, package progress, or an end-stage number', () => {
    const forgedDoor = legacyThroughT08();
    forgedDoor.modules.act4.packageStep = 3;
    forgedDoor.modules.act4.broadcastIndex = 6;
    forgedDoor.modules.act4.laterNodeId = 'A4_T10_MAIL';
    forgedDoor.modules.act4.finalMailOpened = true;
    forgedDoor.game.flags.FLAG_A4_T09_COMPLETE = true;
    forgedDoor.game.flags.FLAG_A4_T10_COMPLETE = true;
    forgedDoor.game.flags.FLAG_A4_COMPLETE = true;

    const repaired = hydrateState(forgedDoor);
    expect(repaired.modules.act4.stage).toBe('T09');
    expect(repaired.modules.act4.completedNarrativeSectionIds).toHaveLength(8);
    expect(repaired.modules.act4.completedNarrativeActionIds).not.toContain('A4_T09_DOOR_EXITED');
    expect(repaired.modules.act4.completedNarrativeActionIds).not.toContain('A4_T10_FINAL_MAIL_OPENED');
    expect(repaired.modules.act4.packageStep).toBe(0);
    expect(repaired.modules.act4.broadcastIndex).toBe(0);
    expect(repaired.modules.act4.finalMailOpened).toBe(false);
    expect(repaired.modules.act4.laterNodeId).toBeNull();
    expect(repaired.modules.act4.seenLaterNodeIds).not.toContain('A4_T09_EXIT');
    expect(repaired.game.flags.FLAG_A4_COMPLETE).toBeUndefined();
  });

  it('keeps old mail ownership and birthday image slots aligned', () => {
    expect(act4OldMails[0].id).toBe('protagonist');
    expect(act4OldMails[1].sentAt).toBe('2020-04-19T23:41:00+08:00');
    expect(birthdayImageSlots.map((slot) => slot.nodeId)).toEqual(birthdayScenes.map((scene) => scene.id));
  });
});
