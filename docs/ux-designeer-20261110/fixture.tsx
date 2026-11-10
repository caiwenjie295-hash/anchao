import { createRoot } from 'react-dom/client';
import { SAVE_KEY, saveState } from '../../src/core/saveManager';
import { buildCheckpoint, FIXTURE_MODES, type FixtureMode } from '../ux-casepath-20261003/validation/fixtureCheckpoints';
import { installFixtureMemoryStorage } from '../ux-casepath-20261003/validation/fixtureStorage';
import { isStoryTransitionReached, storyTransitions } from '../../src/data/storyTransitionData';

// A separate development entry. Never bundled into the product or read from player storage.
const storage = installFixtureMemoryStorage(window).storage;
const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'opening';
const modes = ['opening', 'desktop', 'photo-editor', 'a1-cave', 'a1-temple', ...FIXTURE_MODES];
if (!modes.includes(mode)) throw new Error('Unknown isolated preview');
if (mode !== 'opening') {
  const state = buildCheckpoint(mode === 'desktop' ? 'a1-start' : ['photo-editor', 'a1-cave', 'a1-temple'].includes(mode) ? 'a1-f' : mode as FixtureMode);
  if (mode === 'desktop') state.modules.storyTransitions.seenIds = ['TRANSITION_A1_INTRO'];
  if (mode === 'a1-cave' || mode === 'a1-temple') {
    state.game.phase = mode === 'a1-cave' ? 'H' : 'I';
    state.modules.scene.journeyStarted = true;
    state.modules.scene.currentSceneId = mode === 'a1-cave' ? 'SCENE_A1_H_001' : 'SCENE_A1_I_001';
    state.modules.scene.visitedSceneIds = ['SCENE_A1_G_001', 'SCENE_A1_G_002', 'SCENE_A1_G_003', 'SCENE_A1_H_001'];
    if (mode === 'a1-temple') {
      state.modules.scene.visitedSceneIds.push('SCENE_A1_I_001');
      state.game.flags.FLAG_A1_AW_FOUND = true;
      state.modules.scene.inspectedHotspotIds.push('HOTSPOT_A1_H_014');
      state.modules.scene.capturedPhotoIds.push('IMG_A1_H_003');
    }
    state.modules.storyTransitions.seenIds = storyTransitions.filter((item) => isStoryTransitionReached(state, item)).map((item) => item.id);
  }
  if (mode === 'photo-editor') {
    state.game.phase = 'J';
    state.modules.scene.journeyStarted = true;
    state.modules.scene.capturedPhotoIds = ['IMG_A1_H_003', 'IMG_A1_I_004'];
    state.modules.photos.openedPhotoIds = ['IMG_A1_H_003'];
    state.modules.photos.activePhotoId = 'IMG_A1_H_003';
    state.desktop.windows.photos.status = 'normal';
    state.desktop.activeAppId = 'photos';
    state.desktop.openedOnceAppIds.push('photos');
  }
  saveState(state, storage);
}
if (params.get('motion') === 'reduce') {
  const nativeMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query: string) => query.includes('prefers-reduced-motion')
    ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true }
    : nativeMatchMedia(query);
}
const { default: App } = await import('../../src/App');
createRoot(document.getElementById('root')!).render(<App />);
document.documentElement.dataset.redesignPreview = mode;
document.documentElement.dataset.previewSaveKey = SAVE_KEY;
