import { describe, expect, it } from 'vitest';
import { createDefaultAct2ResearchState, createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { hydrateState } from '../core/saveManager';
import { StateManager } from '../core/stateManager';
import type { AppState } from '../core/types';
import { act2T07 } from '../data/act2T07Data';

/** T06 已完成、等待玩家主动进入 T07 的存档。 */
const createQimingState = (): AppState => {
  const state = createDefaultState();
  state.game.act = 2;
  state.game.phase = 'A2_T06';
  state.game.flags = {
    FLAG_A1_COMPLETE: true,
    FLAG_A1_SS_FOUND: true,
    FLAG_A2_TRANSFER_RULE_INFERRED: true,
    FLAG_A2_SCHOOL_ENTERED: true,
    FLAG_A2_SCHOOL_SS_FOUND: true,
    FLAG_A2_SS_MATCH_CONFIRMED: true,
    FLAG_A2_QIMING_OFFICIAL_FOUND: true,
    FLAG_A2_QIMING_TESTIMONIALS_READ: true,
    FLAG_A2_QIMING_FORUM_FOUND: true,
    FLAG_A2_HUANG_MATCH_INFERRED: true,
    FLAG_A2_ZHONG_MATCH_INFERRED: true,
    FLAG_A2_OTHER_CASES_ABNORMAL: true,
  };
  state.modules.act2Research.stage = 'qiming';
  state.modules.act2Research.school = { visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM'], inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE'] };
  state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009'];
  state.modules.notepad.autoEntryIds = ['NOTE_A2_T06_004'];
  return state;
};

const enterT07 = (): { manager: StateManager; bus: EventBus } => {
  const bus = new EventBus();
  const manager = new StateManager(bus, createQimingState());
  manager.enterAct2FinaleInvestigation();
  return { manager, bus };
};

describe('T07 acceptance', () => {
  it('never enters T07 before the T06 conclusion and never skips the entry on reload', () => {
    const pending = createQimingState();
    delete pending.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL;
    const manager = new StateManager(new EventBus(), pending);
    manager.enterAct2FinaleInvestigation();
    expect(manager.getState().modules.act2Research.stage).toBe('qiming');
    expect(manager.getState().game.phase).toBe('A2_T06');
    // 重载也不会自动进入：入口必须由玩家点击。
    const reloaded = new StateManager(new EventBus(), hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    expect(reloaded.getState().modules.act2Research.stage).toBe('qiming');
    expect(reloaded.getState().modules.act2Research.t07).toEqual(createDefaultAct2ResearchState().t07);
  });

  it('enters once on the explicit entry and ignores forged ids', () => {
    const { manager, bus } = enterT07();
    expect(manager.getState().modules.act2Research.stage).toBe('finale');
    expect(manager.getState().game.phase).toBe('A2_T07');
    const entered: string[] = [];
    bus.on('act2:t07-entered', () => entered.push('entered'));
    manager.enterAct2FinaleInvestigation();
    expect(entered).toEqual([]);

    manager.viewAct2T07Material('MATERIAL_UNKNOWN');
    manager.markAct2T07SegmentPlayed('SEG_UNKNOWN');
    manager.captureAct2T07Frame('FRAME_UNKNOWN', 20000);
    manager.captureAct2T07Frame('FRAME_A2_T07_001', 5000);
    manager.compareAct2T07TempleFrame('FRAME_A2_T07_001');
    manager.confirmAct2T07PhotoSymbol();
    manager.confirmAct2T07TempleFrame();
    manager.inferAct2T07Location();
    manager.planAct2T07SecondTrip();
    manager.completeAct2T07Finale();
    expect(manager.getState().modules.act2Research.t07).toEqual(createDefaultAct2ResearchState().t07);
    for (const flagId of ['FLAG_A2_PROMO_VIDEO_FOUND', 'FLAG_A2_PROMO_PHOTO_SS_FOUND', 'FLAG_A2_TEMPLE_FRAME_FOUND', 'FLAG_A2_QIMING_LOCATION_INFERRED', 'FLAG_A2_SECOND_TRIP_PLANNED', 'FLAG_A2_COMPLETE']) {
      expect(manager.getState().game.flags[flagId]).not.toBe(true);
    }
  });

  it('records photo double S, video playback, valid capture, comparison, inference, trip and finale exactly once', () => {
    const { manager, bus } = enterT07();
    const events: string[] = [];
    bus.on('act2:t07-material-viewed', ({ materialId }) => events.push(`material:${materialId}`));
    bus.on('act2:t07-frame-captured', ({ frameId }) => events.push(`frame:${frameId}`));
    bus.on('act2:t07-frame-compared', ({ frameId }) => events.push(`compared:${frameId}`));
    bus.on('act2:t07-temple-confirmed', () => events.push('temple'));
    bus.on('act2:t07-location-inferred', () => events.push('location'));
    bus.on('act2:t07-trip-planned', () => events.push('trip'));
    bus.on('act2:t07-complete', () => events.push('complete'));

    manager.viewAct2T07Material(act2T07.photoMaterialId);
    manager.confirmAct2T07PhotoSymbol();
    expect(manager.getState().game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_001');

    manager.viewAct2T07Material(act2T07.video.materialId);
    expect(manager.getState().game.flags.FLAG_A2_PROMO_VIDEO_FOUND).toBe(true);
    // 只拖动不播放：不写入 WATCHED。
    manager.markAct2T07SegmentPlayed('SEG_A2_T07_002');
    expect(manager.getState().game.flags.FLAG_A2_PROMO_VIDEO_WATCHED).not.toBe(true);
    manager.markAct2T07SegmentPlayed('SEG_A2_T07_003');
    expect(manager.getState().game.flags.FLAG_A2_PROMO_VIDEO_WATCHED).toBe(true);

    manager.captureAct2T07Frame('FRAME_A2_T07_001', act2T07.video.keyFrames[0].startMs + 500);
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual(['FRAME_A2_T07_001']);
    // 重复截图幂等。
    manager.captureAct2T07Frame('FRAME_A2_T07_001', act2T07.video.keyFrames[0].startMs + 600);
    expect(manager.getState().modules.act2Research.t07.capturedFrameIds).toEqual(['FRAME_A2_T07_001']);

    expect(manager.getState().game.flags.FLAG_A2_TEMPLE_FRAME_FOUND).not.toBe(true);
    manager.compareAct2T07TempleFrame('FRAME_A2_T07_001');
    manager.confirmAct2T07TempleFrame();
    expect(manager.getState().game.flags.FLAG_A2_TEMPLE_FRAME_FOUND).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_002');

    manager.inferAct2T07Location();
    expect(manager.getState().game.flags.FLAG_A2_QIMING_LOCATION_INFERRED).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_003');
    manager.planAct2T07SecondTrip();
    expect(manager.getState().game.flags.FLAG_A2_SECOND_TRIP_PLANNED).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T07_004');
    manager.completeAct2T07Finale();
    expect(manager.getState().game.flags.FLAG_A2_COMPLETE).toBe(true);

    // 重复调用不重复触发事件。
    manager.planAct2T07SecondTrip();
    manager.completeAct2T07Finale();
    expect(events).toEqual(['material:MATERIAL_A2_T07_PHOTO', 'material:MATERIAL_A2_T07_VIDEO', 'frame:FRAME_A2_T07_001', 'compared:FRAME_A2_T07_001', 'temple', 'location', 'trip', 'complete']);
  });

  it('migrates schema 1–6 T06 saves to schema 7 and keeps T07 progress across reloads', () => {
    const { manager } = enterT07();
    manager.viewAct2T07Material(act2T07.photoMaterialId);
    manager.confirmAct2T07PhotoSymbol();
    manager.viewAct2T07Material(act2T07.video.materialId);
    manager.markAct2T07SegmentPlayed('SEG_A2_T07_002');
    manager.markAct2T07SegmentPlayed('SEG_A2_T07_003');
    manager.captureAct2T07Frame('FRAME_A2_T07_001', 7000);
    manager.compareAct2T07TempleFrame('FRAME_A2_T07_001');

    const legacy = JSON.parse(JSON.stringify(manager.getState())) as Record<string, unknown>;
    legacy.schemaVersion = 6;
    const restored = hydrateState(legacy);
    expect(restored.schemaVersion).toBe(7);
    expect(restored.modules.act2Research.stage).toBe('finale');
    expect(restored.game.phase).toBe('A2_T07');
    expect(restored.modules.act2Research.t07).toEqual({
      viewedMaterialIds: ['MATERIAL_A2_T07_PHOTO', 'MATERIAL_A2_T07_VIDEO'],
      playedSegmentIds: ['SEG_A2_T07_002', 'SEG_A2_T07_003'],
      capturedFrameIds: ['FRAME_A2_T07_001'],
      comparedFrameIds: ['FRAME_A2_T07_001'],
    });
    expect(restored.game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND).toBe(true);
    expect(restored.game.flags.FLAG_A2_PROMO_VIDEO_WATCHED).toBe(true);
    // T06 进度在 T07 阶段仍然保留。
    expect(restored.modules.browser.visitedPageIds).toContain('PAGE_A2_T06_009');
    expect(restored.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).toBe(true);
    expect(restored.modules.notepad.autoEntryIds).toContain('NOTE_A2_T06_004');
  });

  it('keeps the finale completed across reloads without advancing to the next act', () => {
    const { manager } = enterT07();
    manager.viewAct2T07Material(act2T07.photoMaterialId);
    manager.confirmAct2T07PhotoSymbol();
    manager.viewAct2T07Material(act2T07.video.materialId);
    manager.markAct2T07SegmentPlayed('SEG_A2_T07_002');
    manager.markAct2T07SegmentPlayed('SEG_A2_T07_003');
    manager.captureAct2T07Frame('FRAME_A2_T07_001', 7000);
    manager.compareAct2T07TempleFrame('FRAME_A2_T07_001');
    manager.confirmAct2T07TempleFrame();
    manager.inferAct2T07Location();
    manager.planAct2T07SecondTrip();
    manager.completeAct2T07Finale();

    // 完成后重载：仍停在 finale，可回看资料，但不出现第三幕入口、也不重复触发完成事件。
    const restored = new StateManager(new EventBus(), hydrateState(JSON.parse(JSON.stringify(manager.getState()))));
    expect(restored.getState().schemaVersion).toBe(7);
    expect(restored.getState().modules.act2Research.stage).toBe('finale');
    expect(restored.getState().game.phase).toBe('A2_T07');
    expect(restored.getState().game.flags.FLAG_A2_COMPLETE).toBe(true);
    expect(restored.getState().modules.act2Research.t07).toEqual({
      viewedMaterialIds: ['MATERIAL_A2_T07_PHOTO', 'MATERIAL_A2_T07_VIDEO'],
      playedSegmentIds: ['SEG_A2_T07_002', 'SEG_A2_T07_003'],
      capturedFrameIds: ['FRAME_A2_T07_001'],
      comparedFrameIds: ['FRAME_A2_T07_001'],
    });
    expect(restored.getState().game.act).toBe(2);
    expect(restored.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T06_004', 'NOTE_A2_T07_001', 'NOTE_A2_T07_002', 'NOTE_A2_T07_003', 'NOTE_A2_T07_004']);

    const completed: string[] = [];
    restored.subscribe(() => completed.push('changed'));
    restored.completeAct2T07Finale();
    restored.enterAct2FinaleInvestigation();
    expect(completed).toEqual([]);
  });

  it('cleans contradictory T07 stages, flags and progress', () => {
    const state = createQimingState();
    state.modules.act2Research.stage = 'finale';
    state.modules.act2Research.t07 = { viewedMaterialIds: ['MATERIAL_A2_T07_VIDEO'], playedSegmentIds: ['SEG_A2_T07_002'], capturedFrameIds: ['FRAME_A2_T07_001'], comparedFrameIds: ['FRAME_A2_T07_001'] };
    state.game.flags.FLAG_A2_TEMPLE_FRAME_FOUND = true;
    state.game.flags.FLAG_A2_PROMO_VIDEO_FOUND = true;
    state.game.flags.FLAG_A2_PROMO_VIDEO_WATCHED = true;
    state.game.flags.FLAG_A2_QIMING_LOCATION_INFERRED = true;
    state.game.flags.FLAG_A2_SECOND_TRIP_PLANNED = true;
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.modules.notepad.autoEntryIds = ['NOTE_A2_T07_001', 'NOTE_A2_T07_002', 'NOTE_A2_T07_003'];

    // 缺少 T06 结论：退回 qiming 并清空 T07。
    delete state.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL;
    const downgraded = hydrateState(JSON.parse(JSON.stringify(state)));
    expect(downgraded.modules.act2Research.stage).toBe('qiming');
    expect(downgraded.game.phase).toBe('A2_T06');
    expect(downgraded.modules.act2Research.t07).toEqual(createDefaultAct2ResearchState().t07);
    for (const flagId of ['FLAG_A2_PROMO_VIDEO_FOUND', 'FLAG_A2_PROMO_VIDEO_WATCHED', 'FLAG_A2_TEMPLE_FRAME_FOUND', 'FLAG_A2_QIMING_LOCATION_INFERRED', 'FLAG_A2_SECOND_TRIP_PLANNED', 'FLAG_A2_COMPLETE']) {
      expect(downgraded.game.flags[flagId]).toBeUndefined();
    }
    expect(downgraded.modules.notepad.autoEntryIds).toEqual([]);

    // 有 T06 结论但证据链矛盾：只保留有证据支撑的部分。
    state.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL = true;
    const cleaned = hydrateState(JSON.parse(JSON.stringify(state)));
    expect(cleaned.modules.act2Research.stage).toBe('finale');
    expect(cleaned.game.flags.FLAG_A2_PROMO_VIDEO_FOUND).toBe(true);
    expect(cleaned.game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND).toBeUndefined();
    expect(cleaned.game.flags.FLAG_A2_QIMING_LOCATION_INFERRED).toBeUndefined();
    expect(cleaned.game.flags.FLAG_A2_SECOND_TRIP_PLANNED).toBeUndefined();
    expect(cleaned.game.flags.FLAG_A2_COMPLETE).toBeUndefined();
    expect(cleaned.modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T07_002']);

    // 比对过的帧必须是已截到的帧。
    const orphan = createQimingState();
    orphan.modules.act2Research.stage = 'finale';
    orphan.modules.act2Research.t07 = { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], comparedFrameIds: ['FRAME_A2_T07_001'] };
    const sanitized = hydrateState(JSON.parse(JSON.stringify(orphan)));
    expect(sanitized.modules.act2Research.t07.comparedFrameIds).toEqual([]);
  });
});
