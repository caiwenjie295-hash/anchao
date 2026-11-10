import { createRoot } from 'react-dom/client';
import { SAVE_KEY, saveState } from '../../src/core/saveManager';
import { buildCheckpoint, FIXTURE_MODES, type FixtureMode } from '../ux-casepath-20261003/validation/fixtureCheckpoints';
import { installFixtureMemoryStorage } from '../ux-casepath-20261003/validation/fixtureStorage';

// A separate development entry. Never bundled into the product or read from player storage.
const storage = installFixtureMemoryStorage(window).storage;
const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'opening';
const modes = ['opening', 'desktop', 'photo-editor', ...FIXTURE_MODES];
if (!modes.includes(mode)) throw new Error('Unknown isolated preview');
if (mode !== 'opening') {
  const state = buildCheckpoint(mode === 'desktop' ? 'a1-start' : mode === 'photo-editor' ? 'a1-f' : mode as FixtureMode);
  if (mode === 'desktop') state.modules.storyTransitions.seenIds = ['TRANSITION_A1_INTRO'];
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
