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
    expect(hydrated.schemaVersion).toBe(3);
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
    expect(migrated.schemaVersion).toBe(3);
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
    });
    expect(hydrated.game.flags).toEqual({ FLAG_A1_COMPLETE: true });
    expect(hydrated.modules.notepad.userText).toBe('第一幕笔记');
  });

  it('rejects unsupported schema versions and keeps the save key stable', () => {
    expect(hydrateState({ ...createDefaultState(), schemaVersion: 4 })).toEqual(createDefaultState());
    expect(hydrateState({ ...createDefaultState(), schemaVersion: '2' })).toEqual(createDefaultState());
    expect(SAVE_KEY).toBe('anchao.save.v1');
    localStorage.setItem(SAVE_KEY, JSON.stringify(asLegacyFirstActSave()));
    const loaded = loadState(localStorage);
    expect(loaded.schemaVersion).toBe(3);
    expect(loaded.modules.act2Research.stage).toBe('inactive');
  });
});
