import { describe, expect, it } from 'vitest';
import { createDefaultState } from './defaultState';
import { hydrateState, loadState, SAVE_KEY } from './saveManager';

describe('saveManager', () => {
  it('round-trips a supported v1 save state', () => {
    const state = createDefaultState();
    state.desktop.windows.mail.status = 'normal';
    const hydrated = hydrateState(JSON.parse(JSON.stringify(state)));
    expect(hydrated.desktop.windows.mail.status).toBe('normal');
    expect(hydrated.schemaVersion).toBe(1);
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
});
