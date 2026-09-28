import { describe, expect, it } from 'vitest';
import { createDefaultAct2ResearchState, createDefaultState } from './defaultState';
import { hydrateState, loadState, SAVE_KEY } from './saveManager';

/** 还原第一幕真实旧存档：schema 1，没有第二幕字段。 */
const asLegacyFirstActSave = (): Record<string, unknown> => {
  const legacy = JSON.parse(JSON.stringify(createDefaultState())) as Record<string, unknown>;
  legacy.schemaVersion = 1;
  delete (legacy.modules as Record<string, unknown>).act2Research;
  return legacy;
};

describe('saveManager', () => {
  it('round-trips the current save state', () => {
    const state = createDefaultState();
    state.desktop.windows.mail.status = 'normal';
    const hydrated = hydrateState(JSON.parse(JSON.stringify(state)));
    expect(hydrated.desktop.windows.mail.status).toBe('normal');
    expect(hydrated.schemaVersion).toBe(9);
  });

  it('falls back safely when storage contains malformed JSON', () => {
    localStorage.setItem(SAVE_KEY, '{invalid');
    expect(loadState(localStorage)).toEqual(createDefaultState());
  });

  it('ignores unknown fields and repairs incomplete window data', () => {
    const state = hydrateState({ schemaVersion: 1, desktop: { windows: { browser: { status: 'normal', bounds: { x: 2, y: 4, width: 50, height: 10 }, unknown: true } }, activeAppId: 'browser' }, game: { unknown: true }, settings: { reducedMotion: true }, unexpected: 'ignored' });
    expect(state.desktop.windows.browser.bounds.width).toBe(320);
    expect(state.desktop.windows.browser.bounds.height).toBe(240);
    expect(state.settings.reducedMotion).toBe(true);
  });

  it('migrates v1 saves without mail module state and preserves valid mail state', () => {
    const oldSave = createDefaultState();
    const withoutModules = JSON.parse(JSON.stringify(oldSave)) as Record<string, unknown>;
    delete withoutModules.modules;
    expect(hydrateState(withoutModules).modules.mail).toEqual(createDefaultState().modules.mail);
    const restored = hydrateState({ ...oldSave, modules: { mail: { readIds: ['MAIL_A1_C_001', 'MAIL_A1_C_001', 4], starredIds: ['MAIL_A1_C_006'] } } });
    expect(restored.modules.mail).toEqual({ readIds: ['MAIL_A1_C_001'], starredIds: ['MAIL_A1_C_006'] });
  });

  it('migrates legacy v1 module data and repairs browser and notepad persistence', () => {
    const legacy = createDefaultState() as unknown as { modules: Record<string, unknown> };
    legacy.modules = { mail: legacy.modules.mail };
    expect(hydrateState(legacy).modules.browser).toEqual({ queryHistory: [], visitedPageIds: [] });
    expect(hydrateState(legacy).modules.notepad).toEqual({ userText: '', autoEntryIds: [] });
    const restored = hydrateState({ ...createDefaultState(), modules: { mail: { readIds: [], starredIds: [] }, browser: { queryHistory: ['鸡公岭', '鸡公岭', 9], visitedPageIds: ['PAGE_A1_E_001', 'PAGE_A1_E_001'] }, notepad: { userText: '自己的记录', autoEntryIds: ['NOTE_A1_E_001', 'NOTE_A1_E_001'] } } });
    expect(restored.modules.browser).toEqual({ queryHistory: ['鸡公岭'], visitedPageIds: ['PAGE_A1_E_001'] });
    expect(restored.modules.notepad).toEqual({ userText: '自己的记录', autoEntryIds: ['NOTE_A1_E_001'] });
  });

  it('migrates old saves with no scene state and safely returns corrupted scenes to desktop', () => {
    const legacy = createDefaultState() as unknown as { modules: Record<string, unknown> };
    delete legacy.modules.scene;
    expect(hydrateState(legacy).modules.scene).toEqual(createDefaultState().modules.scene);
    const restored = hydrateState({ ...createDefaultState(), modules: { ...createDefaultState().modules, scene: { journeyStarted: true, currentSceneId: 'SCENE_A1_H_001', visitedSceneIds: ['SCENE_A1_H_001', 'SCENE_A1_H_001'], inspectedHotspotIds: ['HOTSPOT_A1_H_014', 'HOTSPOT_A1_H_014'], capturedPhotoIds: ['IMG_A1_H_003', 'IMG_A1_H_003'] } } });
    expect(restored.modules.scene).toEqual({ journeyStarted: true, currentSceneId: 'SCENE_A1_H_001', visitedSceneIds: ['SCENE_A1_H_001'], inspectedHotspotIds: ['HOTSPOT_A1_H_014'], capturedPhotoIds: ['IMG_A1_H_003'] });
    const invalid = hydrateState({ ...createDefaultState(), modules: { ...createDefaultState().modules, scene: { journeyStarted: true, currentSceneId: 'broken', visitedSceneIds: ['broken'], inspectedHotspotIds: [], capturedPhotoIds: [] } } });
    expect(invalid.modules.scene).toMatchObject({ journeyStarted: false, currentSceneId: null, visitedSceneIds: [] });
  });

  it('migrates a completed schema 1 first-act save to schema 3 without losing progress', () => {
    const legacy = asLegacyFirstActSave();
    legacy.game = { act: 1, phase: 'K', flags: { FLAG_A1_SS_FOUND: true, FLAG_A1_COMPLETE: true }, discoveredClueIds: ['CLUE_A1_K_001'] };
    legacy.modules = {
      mail: { readIds: ['MAIL_A1_C_001'], starredIds: ['MAIL_A1_C_001'] },
      browser: { queryHistory: ['鸡公岭'], visitedPageIds: ['PAGE_A1_E_001'] },
      notepad: { userText: '临时记录', autoEntryIds: ['NOTE_A1_E_001'] },
      scene: { journeyStarted: false, currentSceneId: null, visitedSceneIds: ['SCENE_A1_I_001'], inspectedHotspotIds: ['HOTSPOT_A1_I_005'], capturedPhotoIds: ['IMG_A1_H_003', 'IMG_A1_I_004'] },
      photos: { activePhotoId: 'IMG_A1_H_003', openedPhotoIds: ['IMG_A1_H_003'], adjustments: { IMG_A1_H_003: { exposure: 55, shadows: 50, contrast: 35 } }, zoomByPhotoId: { IMG_A1_H_003: 1.8 }, inspectedSymbolPhotoIds: ['IMG_A1_H_003'] },
    };
    const migrated = hydrateState(legacy);
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.game).toEqual({ act: 1, phase: 'K', flags: { FLAG_A1_SS_FOUND: true, FLAG_A1_COMPLETE: true }, discoveredClueIds: ['CLUE_A1_K_001'] });
    expect(migrated.modules.mail).toEqual({ readIds: ['MAIL_A1_C_001'], starredIds: ['MAIL_A1_C_001'] });
    expect(migrated.modules.browser).toEqual({ queryHistory: ['鸡公岭'], visitedPageIds: ['PAGE_A1_E_001'] });
    expect(migrated.modules.notepad).toEqual({ userText: '临时记录', autoEntryIds: ['NOTE_A1_E_001'] });
    expect(migrated.modules.scene.capturedPhotoIds).toEqual(['IMG_A1_H_003', 'IMG_A1_I_004']);
    expect(migrated.modules.photos.adjustments.IMG_A1_H_003).toEqual({ exposure: 55, shadows: 50, contrast: 35 });
    expect(migrated.modules.photos.inspectedSymbolPhotoIds).toEqual(['IMG_A1_H_003']);
    expect(migrated.modules.act2Research).toEqual(createDefaultAct2ResearchState());
  });

  it('migrates schema 2 second-act research state to schema 3', () => {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T03';
    state.modules.act2Research = {
      stage: 'library',
      bridge: { talkedElderIds: ['ELDER_A2_T02_001'], shownEvidenceAssetIds: ['IMG_A1_I_002'], heardPhrase: true, nameChoices: { first: '黑', middle: '补', last: '母' } },
      library: { visitedSectionIds: ['SECTION_A2_T03_001'], openedVolumeIds: ['VOLUME_A2_T03_001'], currentPageId: 'PAGE_A2_T03_004', bookmarkedPageIds: ['PAGE_A2_T03_004'], markedKeywordIds: ['KEYWORD_A2_T03_001'], excerptedEntryIds: ['ENTRY_A2_T03_001'] },
      tales: { readTaleIds: [], collectedTaleIds: [], placedCardIds: [], sorted: false, inferenceAcknowledged: false },
      school: { visitedAreaIds: [], inspectedHotspotIds: [] },
      t07: { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], comparedFrameIds: [] },
    };
    const hydrated = hydrateState(JSON.parse(JSON.stringify(state)));
    expect(hydrated).toEqual(state);
    expect(hydrated.modules.act2Research.bridge.nameChoices).toEqual({ first: '黑', middle: '补', last: '母' });
  });

  it('repairs corrupted second-act fields without touching first-act progress', () => {
    const base = createDefaultState();
    base.game.act = 2;
    base.game.phase = 'A2_T02';
    base.game.flags = { FLAG_A1_COMPLETE: true };
    base.modules.notepad.userText = '第一幕笔记';
    const hydrated = hydrateState({
      ...base,
      modules: {
        ...base.modules,
        act2Research: {
          stage: 'nowhere',
          bridge: { talkedElderIds: ['ELDER_A2_T02_001', 'ELDER_A2_T02_001', 7], shownEvidenceAssetIds: ['IMG_A1_I_002', 'IMG_A1_I_002', 'IMG_A1_X_999'], heardPhrase: 'yes', nameChoices: { first: '黑', middle: '   ', last: 12 } },
          library: { visitedSectionIds: 'broken', openedVolumeIds: ['VOLUME_A2_T03_001'], currentPageId: 42, bookmarkedPageIds: null, markedKeywordIds: ['KEYWORD_A2_T03_001', 'KEYWORD_A2_T03_001'], excerptedEntryIds: [] },
        },
      },
    });
    expect(hydrated.modules.act2Research).toEqual({
      stage: 'inactive',
      bridge: { talkedElderIds: ['ELDER_A2_T02_001'], shownEvidenceAssetIds: ['IMG_A1_I_002'], heardPhrase: false, nameChoices: { first: '黑', middle: null, last: null } },
      library: { visitedSectionIds: [], openedVolumeIds: ['VOLUME_A2_T03_001'], currentPageId: null, bookmarkedPageIds: [], markedKeywordIds: ['KEYWORD_A2_T03_001'], excerptedEntryIds: [] },
      tales: { readTaleIds: [], collectedTaleIds: [], placedCardIds: [], sorted: false, inferenceAcknowledged: false },
      school: { visitedAreaIds: [], inspectedHotspotIds: [] },
      t07: { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], comparedFrameIds: [] },
    });
    expect(hydrated.game.flags).toEqual({ FLAG_A1_COMPLETE: true });
    expect(hydrated.modules.notepad.userText).toBe('第一幕笔记');
  });

  it('migrates schema 2 and sanitizes malformed schema 3 tale progress', () => {
    const v2 = createDefaultState() as unknown as Record<string, unknown>;
    v2.schemaVersion = 2;
    delete ((v2.modules as Record<string, unknown>).act2Research as Record<string, unknown>).tales;
    expect(hydrateState(v2).modules.act2Research.tales).toEqual(createDefaultAct2ResearchState().tales);
    const state = createDefaultState(); state.game.flags = { FLAG_A1_COMPLETE: true }; state.modules.notepad.userText = '保留';
    const repaired = hydrateState({ ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, tales: { readTaleIds: ['TALE_A2_T04_001', 'bad'], collectedTaleIds: ['TALE_A2_T04_002', 'TALE_A2_T04_001'], placedCardIds: ['CARD_A2_T04_001', 'bad'], sorted: true, inferenceAcknowledged: true } } } });
    expect(repaired.modules.act2Research.tales).toEqual({ readTaleIds: ['TALE_A2_T04_001'], collectedTaleIds: ['TALE_A2_T04_001'], placedCardIds: ['CARD_A2_T04_001'], sorted: false, inferenceAcknowledged: false });
    expect(repaired.game.flags).toEqual({ FLAG_A1_COMPLETE: true }); expect(repaired.modules.notepad.userText).toBe('保留');
  });

  it('migrates schema 3 T04 progress to schema 4 without losing earlier evidence', () => {
    const legacy = JSON.parse(JSON.stringify(createDefaultState())) as Record<string, any>;
    legacy.schemaVersion = 3;
    legacy.game.act = 2; legacy.game.phase = 'A2_T04';
    legacy.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TALES_SORTED: true, FLAG_A2_TRANSFER_RULE_INFERRED: true };
    legacy.modules.act2Research.stage = 'tales';
    legacy.modules.act2Research.tales = { readTaleIds: ['TALE_A2_T04_001'], collectedTaleIds: ['TALE_A2_T04_001'], placedCardIds: Array.from({ length: 12 }, (_, index) => `CARD_A2_T04_${String(index + 1).padStart(3, '0')}`), sorted: true, inferenceAcknowledged: true };
    legacy.modules.notepad.autoEntryIds = ['NOTE_A1_K_001', 'NOTE_A2_T04_004'];
    const migrated = hydrateState(legacy);
    expect(migrated.schemaVersion).toBe(9);
    expect(migrated.game.flags).toEqual(legacy.game.flags);
    expect(migrated.modules.act2Research.tales).toEqual(legacy.modules.act2Research.tales);
    expect(migrated.modules.notepad.autoEntryIds).toEqual(legacy.modules.notepad.autoEntryIds);
    expect(migrated.modules.act2Research.school).toEqual({ visitedAreaIds: [], inspectedHotspotIds: [] });
  });

  it('restores valid schema 4 school progress and deduplicates only known area and hotspot IDs', () => {
    const school = createDefaultState();
    school.game.act = 2; school.game.phase = 'A2_T05';
    school.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_FIRE_HYDRANT_SEEN: true, FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SCORE_CHANGE_KNOWN: true, FLAG_A2_QIMING_NAME_FOUND: true, FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true };
    school.modules.act2Research.stage = 'school';
    school.modules.act2Research.school = { visitedAreaIds: ['AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE', 'AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_CORRIDOR', 'unknown'], inspectedHotspotIds: ['HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_QIMING_TEXT', 'HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_TEACHER', 'unknown'] };
    school.modules.notepad.autoEntryIds = ['NOTE_A2_T05_001', 'NOTE_A2_T05_004'];
    const restored = hydrateState(JSON.parse(JSON.stringify(school)));
    expect(restored.schemaVersion).toBe(9);
    expect(restored.game.phase).toBe('A2_T05');
    expect(restored.modules.act2Research.stage).toBe('school');
    expect(restored.modules.act2Research.school).toEqual({ visitedAreaIds: ['AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE', 'AREA_A2_T05_XIAOA_CLASSROOM'], inspectedHotspotIds: ['HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_QIMING_TEXT', 'HOTSPOT_A2_T05_SCHOLAR_NOTE'] });
    expect(restored.game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
  });

  it('cleans contradictory T05 phase, stage, flags and note IDs while retaining first-act state', () => {
    const broken = createDefaultState();
    broken.game.act = 2; broken.game.phase = 'A2_T05';
    broken.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: 'true' as unknown as boolean, FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SS_MATCH_CONFIRMED: true };
    broken.modules.act2Research.stage = 'school';
    broken.modules.act2Research.school = { visitedAreaIds: ['unknown'], inspectedHotspotIds: ['HOTSPOT_A2_T05_TEACHER'] };
    broken.modules.notepad.autoEntryIds = ['NOTE_A1_K_001', 'NOTE_A2_T05_001', 'NOTE_A2_T05_004'];
    const cleaned = hydrateState(JSON.parse(JSON.stringify(broken)));
    expect(cleaned.modules.act2Research.stage).toBe('tales');
    expect(cleaned.game.phase).toBe('A2_T04');
    expect(Object.keys(cleaned.game.flags).filter((id) => id.startsWith('FLAG_A2_') && /SCHOOL|FIRE_HYDRANT|LEAVE_OF_ABSENCE|SCORE_CHANGE|QIMING|SS_MATCH/.test(id))).toEqual([]);
    expect(cleaned.modules.act2Research.school).toEqual({ visitedAreaIds: [], inspectedHotspotIds: [] });
    expect(cleaned.modules.notepad.autoEntryIds).toEqual(['NOTE_A1_K_001']);
    expect(cleaned.game.flags.FLAG_A1_COMPLETE).toBe(true);

    const mismatched = createDefaultState();
    mismatched.game.phase = 'A2_T05';
    mismatched.game.flags = { FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true };
    mismatched.modules.act2Research.stage = 'tales';
    expect(hydrateState(mismatched)).toMatchObject({ game: { phase: 'A2_T04', flags: { FLAG_A2_TRANSFER_RULE_INFERRED: true } }, modules: { act2Research: { stage: 'tales' } } });
  });

  it('removes downstream Qiming state and its note when its rank evidence is missing', () => {
    const broken = createDefaultState();
    broken.game.act = 2; broken.game.phase = 'A2_T05';
    broken.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SCORE_CHANGE_KNOWN: true, FLAG_A2_QIMING_NAME_FOUND: true };
    broken.modules.act2Research.stage = 'school';
    broken.modules.act2Research.school = { visitedAreaIds: ['AREA_A2_T05_HONOR_ROLL'], inspectedHotspotIds: ['HOTSPOT_A2_T05_QIMING_TEXT'] };
    broken.modules.notepad.autoEntryIds = ['NOTE_A2_T05_002', 'NOTE_A2_T05_003'];
    const cleaned = hydrateState(JSON.parse(JSON.stringify(broken)));
    expect(cleaned.game.flags.FLAG_A2_SCORE_CHANGE_KNOWN).not.toBe(true);
    expect(cleaned.game.flags.FLAG_A2_QIMING_NAME_FOUND).not.toBe(true);
    expect(cleaned.modules.notepad.autoEntryIds).toEqual([]);
  });

  it('does not restore the hydrant flag from visiting only the restroom approach', () => {
    const broken = createDefaultState();
    broken.game.act = 2; broken.game.phase = 'A2_T05';
    broken.game.flags = { FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_FIRE_HYDRANT_SEEN: true };
    broken.modules.act2Research.stage = 'school';
    broken.modules.act2Research.school.visitedAreaIds = ['AREA_A2_T05_RESTROOM_APPROACH'];
    const cleaned = hydrateState(JSON.parse(JSON.stringify(broken)));
    expect(cleaned.modules.act2Research.stage).toBe('school');
    expect(cleaned.modules.act2Research.school.visitedAreaIds).toEqual(['AREA_A2_T05_RESTROOM_APPROACH']);
    expect(cleaned.game.flags.FLAG_A2_FIRE_HYDRANT_SEEN).toBeUndefined();
  });

  it('migrates valid qiming progress and strips it when its T05 match prerequisite is missing', () => {
    const qiming = createDefaultState();
    qiming.game.act = 2; qiming.game.phase = 'A2_T06';
    qiming.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true, FLAG_A2_QIMING_OFFICIAL_FOUND: true, FLAG_A2_QIMING_TESTIMONIALS_READ: true, FLAG_A2_QIMING_FORUM_FOUND: true, FLAG_A2_HUANG_MATCH_INFERRED: true, FLAG_A2_ZHONG_MATCH_INFERRED: true, FLAG_A2_OTHER_CASES_ABNORMAL: true };
    qiming.modules.act2Research.stage = 'qiming';
    qiming.modules.act2Research.school = { visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM'], inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE'] };
    qiming.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009', 'not-a-page'];
    qiming.modules.browser.queryHistory = ['启明 投诉', '鸡公岭'];
    qiming.modules.notepad.autoEntryIds = ['NOTE_A2_T06_001', 'NOTE_A2_T06_002', 'NOTE_A2_T06_003', 'NOTE_A2_T06_004'];
    const restored = hydrateState(JSON.parse(JSON.stringify(qiming)));
    expect(restored.schemaVersion).toBe(9);
    expect(restored.modules.act2Research.stage).toBe('qiming');
    expect(restored.game.phase).toBe('A2_T06');
    expect(restored.modules.browser.visitedPageIds).toEqual(['PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009']);
    expect(restored.modules.browser.queryHistory).toEqual(['启明 投诉', '鸡公岭']);
    const broken = JSON.parse(JSON.stringify(qiming));
    delete broken.game.flags.FLAG_A2_SS_MATCH_CONFIRMED;
    const cleaned = hydrateState(broken);
    expect(cleaned.modules.act2Research.stage).toBe('school');
    expect(cleaned.game.phase).toBe('A2_T05');
    expect(cleaned.modules.browser.visitedPageIds).toEqual([]);
    expect(cleaned.modules.browser.queryHistory).toEqual(['鸡公岭']);
    expect(cleaned.modules.notepad.autoEntryIds).toEqual([]);
    expect(cleaned.game.flags.FLAG_A2_QIMING_FORUM_FOUND).toBeUndefined();
    expect(cleaned.game.flags.FLAG_A2_SCHOOL_ENTERED).toBe(true);
    expect(cleaned.game.flags.FLAG_A2_SCHOOL_SS_FOUND).toBe(true);
  });

  it('derives a phase from the validated Act2 stage instead of preserving a forged T06 phase', () => {
    const forged = createDefaultState();
    forged.game.act = 2; forged.game.phase = 'A2_T06';
    forged.modules.act2Research.stage = 'search';
    expect(hydrateState(JSON.parse(JSON.stringify(forged)))).toMatchObject({ game: { phase: 'A2_T01' }, modules: { act2Research: { stage: 'search' } } });
    forged.modules.act2Research.stage = 'bridge';
    expect(hydrateState(JSON.parse(JSON.stringify(forged)))).toMatchObject({ game: { phase: 'A2_T02' }, modules: { act2Research: { stage: 'bridge' } } });
    forged.modules.act2Research.stage = 'library';
    expect(hydrateState(JSON.parse(JSON.stringify(forged)))).toMatchObject({ game: { phase: 'A2_T03' }, modules: { act2Research: { stage: 'library' } } });
  });

  it('rejects unsupported schema versions and keeps the save key stable', () => {
    expect(hydrateState({ ...createDefaultState(), schemaVersion: 7 })).toEqual(createDefaultState());
    expect(hydrateState({ ...createDefaultState(), schemaVersion: '2' })).toEqual(createDefaultState());
    expect(SAVE_KEY).toBe('anchao.save.v1');
    localStorage.setItem(SAVE_KEY, JSON.stringify(asLegacyFirstActSave()));
    const loaded = loadState(localStorage);
    expect(loaded.schemaVersion).toBe(9);
    expect(loaded.modules.act2Research.stage).toBe('inactive');
  });

  it('migrates old progress without replaying earlier story cards', () => {
    const old = JSON.parse(JSON.stringify(createDefaultState()));
    old.schemaVersion = 5;
    old.game.phase = 'H';
    delete old.modules.storyTransitions;
    const restored = hydrateState(old);
    expect(restored.modules.storyTransitions.seenIds).toContain('TRANSITION_A1_INTRO');
    expect(restored.modules.storyTransitions.seenIds).toContain('TRANSITION_A1_H');
    expect(restored.modules.storyTransitions.seenIds).not.toContain('TRANSITION_A2_T01');
  });

  it('cleans corrupt and future card IDs while retaining valid acknowledgement', () => {
    const current = createDefaultState();
    current.game.phase = 'C';
    const raw = JSON.parse(JSON.stringify(current));
    raw.modules.storyTransitions.seenIds = ['TRANSITION_A1_INTRO', 'TRANSITION_A1_INTRO', 'TRANSITION_A1_B', 'TRANSITION_A2_T05', 'unknown', 42];
    const restored = hydrateState(raw);
    expect(restored.modules.storyTransitions.seenIds).toEqual(['TRANSITION_A1_INTRO']);
    expect(restored.game.phase).toBe('C');
  });
});
