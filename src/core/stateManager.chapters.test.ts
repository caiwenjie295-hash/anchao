import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from './defaultState';
import { buildLegacyChapterEntry } from './chapterNavigation';
import { EventBus } from './eventBus';
import { CHAPTER_HISTORY_KEY, emptyChapterHistory, readChapterHistory, recordChapterEntry, writeChapterHistory } from './persistence/chapterHistory';
import type { BrowserStoragePort } from './persistence/browserStorage';
import { act2T07 } from '../data/act2T07Data';
import { SAVE_KEY, readSave, writeSaveState } from './saveManager';
import { StateManager } from './stateManager';

class MemoryStorage implements BrowserStoragePort {
  values = new Map<string, string>();
  failSaveWrite = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (key === SAVE_KEY && this.failSaveWrite) throw new Error('save write blocked');
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

function reachedAct4State(storage: MemoryStorage) {
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
  const manager = new StateManager(new EventBus(), state, storage);
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

  const reached = manager.getState();
  for (const flagId of ['FLAG_A3_GATE_REACHED', 'FLAG_A3_INNER_FENCE_PASSED', 'FLAG_A3_CLASSROOM_TURNED', 'FLAG_A3_STAIRS_DESCENDED', 'FLAG_A3_BROADCAST_DOOR_REACHED', 'FLAG_A3_KITCHEN_DOOR_REACHED', 'FLAG_A3_KITCHEN_EXITED', 'FLAG_A3_NOTEBOOK_FOUND', 'FLAG_A3_SITE_EXITED', 'FLAG_A3_COMPLETE'] as const) reached.game.flags[flagId] = true;
  reached.modules.act3.stage = 'T07';
  manager.startAct4();
  expect(manager.getState().modules.act4.stage).toBe('T01');
  return manager.getState();
}

describe('StateManager chapter navigation', () => {
  let storage: MemoryStorage;
  let bus: EventBus;

  beforeEach(() => {
    storage = new MemoryStorage();
    bus = new EventBus();
  });

  it('does not change state for an unreached chapter and records a natural chapter entry', () => {
    const initial = createDefaultState();
    const manager = new StateManager(bus, initial, storage);
    expect(manager.replayChapter(2)).toEqual({ ok: false, reason: 'chapter-locked' });
    expect(manager.getState()).toBe(initial);
    initial.game.phase = 'K';
    initial.game.flags.FLAG_A1_COMPLETE = true;
    manager.startSecondAct();
    const history = readChapterHistory(storage).history;
    expect(history.unlockedThrough).toBe(2);
    expect(JSON.parse(history.snapshots[2] ?? '{}')).toMatchObject({ game: { act: 2, phase: 'A2_T01' }, modules: { act2Research: { stage: 'search' } } });
  });

  it('backfills reached chapter entry snapshots from a valid old fourth-act save', () => {
    const oldSave = reachedAct4State(storage);
    storage.removeItem(CHAPTER_HISTORY_KEY);
    expect(writeSaveState(oldSave, storage).ok).toBe(true);
    expect(readSave(storage)).toMatchObject({ kind: 'loaded', state: { game: { act: 4 }, modules: { act4: { stage: 'T01' } } } });
    const manager = new StateManager(bus, undefined, storage);
    expect(manager.getState().modules.act4.stage).toBe('T01');
    const history = readChapterHistory(storage).history;
    expect(history.unlockedThrough).toBe(4);
    for (const chapter of [2, 3, 4] as const) {
      const entry = JSON.parse(history.snapshots[chapter] ?? '{}');
      expect(entry.game.act).toBe(chapter);
    }
  });

  it('replaces an invalid old fourth-chapter snapshot before replaying chapter one and then chapter four', () => {
    const oldSave = reachedAct4State(storage);
    storage.removeItem(CHAPTER_HISTORY_KEY);
    expect(writeSaveState(oldSave, storage).ok).toBe(true);
    expect(writeChapterHistory({ ...emptyChapterHistory(), unlockedThrough: 4, snapshots: { 4: '{broken' } }, storage)).toBe(true);
    const manager = new StateManager(bus, undefined, storage);
    expect(JSON.parse(readChapterHistory(storage).history.snapshots[4] ?? '{}')).toMatchObject({ game: { act: 4 }, modules: { act4: { stage: 'T01' } } });

    expect(manager.replayChapter(1)).toEqual({ ok: true });
    expect(manager.getState().game.act).toBe(1);
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(4);
    expect(manager.replayChapter(4)).toEqual({ ok: true });
    expect(manager.getState()).toMatchObject({ game: { act: 4 }, modules: { act4: { stage: 'T01' } } });
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(4);
  });

  it('replays an earlier entry without losing later unlocks across a reload', () => {
    const current = reachedAct4State(storage);
    expect(writeSaveState(current, storage).ok).toBe(true);
    const act2Entry = buildLegacyChapterEntry(current, 2)!;
    const history = recordChapterEntry({ ...emptyChapterHistory(), unlockedThrough: 4 }, 2, act2Entry);
    expect(writeChapterHistory(history, storage)).toBe(true);
    const manager = new StateManager(bus, undefined, storage);
    expect(manager.replayChapter(2)).toEqual({ ok: true });
    expect(manager.getState().game.act).toBe(2);
    expect(manager.getState().modules.act2Research.stage).toBe('search');
    expect(manager.getState().game.flags).not.toHaveProperty('FLAG_A4_COMPLETE');
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(4);
    const reloaded = new StateManager(bus, undefined, storage);
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(4);
    expect(reloaded.getState().game.act).toBe(2);
  });

  it('leaves game state and unlock history intact when reset cannot write the save', () => {
    const current = reachedAct4State(storage);
    expect(writeSaveState(current, storage).ok).toBe(true);
    expect(writeChapterHistory({ ...emptyChapterHistory(), unlockedThrough: 4 }, storage)).toBe(true);
    const manager = new StateManager(bus, current, storage);
    storage.failSaveWrite = true;
    expect(manager.resetProgress()).toBe(false);
    expect(manager.getState().modules.act4.stage).toBe('T01');
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(4);
  });

  it('does not publish a replay when the primary save write fails', () => {
    const current = reachedAct4State(storage);
    expect(writeSaveState(current, storage).ok).toBe(true);
    const act2Entry = buildLegacyChapterEntry(current, 2)!;
    expect(writeChapterHistory(recordChapterEntry({ ...emptyChapterHistory(), unlockedThrough: 4 }, 2, act2Entry), storage)).toBe(true);
    const manager = new StateManager(bus, undefined, storage);
    const before = manager.exportSave();
    storage.failSaveWrite = true;
    expect(manager.replayChapter(2).ok).toBe(false);
    expect(manager.exportSave()).toBe(before);
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(4);
  });

  it('keeps chapters closed while original-save recovery is required', () => {
    storage.setItem(SAVE_KEY, '{broken');
    const manager = new StateManager(bus, undefined, storage);
    const before = manager.exportSave();
    expect(manager.replayChapter(1)).toEqual({ ok: false, reason: 'recovery-required' });
    expect(manager.exportSave()).toBe(before);
    expect(storage.getItem(CHAPTER_HISTORY_KEY)).toBeNull();
  });

  it('clears the sidecar only after a successful reset and resets to a fresh opening state', () => {
    const current = reachedAct4State(storage);
    expect(writeSaveState(current, storage).ok).toBe(true);
    expect(writeChapterHistory({ ...emptyChapterHistory(), unlockedThrough: 4 }, storage)).toBe(true);
    const manager = new StateManager(bus, current, storage);
    expect(manager.resetProgress()).toBe(true);
    expect(manager.getState()).toEqual(createDefaultState());
    expect(readChapterHistory(storage).history.unlockedThrough).toBe(1);
  });
});
