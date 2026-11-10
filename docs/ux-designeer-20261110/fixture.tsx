import { createRoot } from 'react-dom/client';
import { SAVE_KEY, saveState } from '../../src/core/saveManager';
import { buildCheckpoint, FIXTURE_MODES, type FixtureMode } from '../ux-casepath-20261003/validation/fixtureCheckpoints';
import { installFixtureMemoryStorage } from '../ux-casepath-20261003/validation/fixtureStorage';

// A separate development entry. Never bundled into the product or read from player storage.
const storage = installFixtureMemoryStorage(window).storage;
const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'opening';
const modes = ['opening', 'desktop', ...FIXTURE_MODES];
if (!modes.includes(mode)) throw new Error('Unknown isolated preview');
if (mode !== 'opening') {
  const state = buildCheckpoint(mode === 'desktop' ? 'a1-start' : mode as FixtureMode);
  if (mode === 'desktop') state.modules.storyTransitions.seenIds = ['TRANSITION_A1_INTRO'];
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
