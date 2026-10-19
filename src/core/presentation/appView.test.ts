import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../defaultState';
import { deriveAppView } from './appView';

const display = {
  dismissedAct2Stage: null,
  dismissedAct3: false,
  reviewAct3: false,
  dismissedAct4: false,
};

describe('deriveAppView', () => {
  it('preserves first-act ending priority and desktop label', () => {
    const state = createDefaultState();
    state.game.flags.FLAG_A1_COMPLETE = true;
    expect(deriveAppView(state, display)).toMatchObject({
      act1EndingOpen: true,
      secondActStarted: false,
      desktopLabel: '暗潮第一幕私人桌面',
    });
    state.modules.act2Research.stage = 'search';
    expect(deriveAppView(state, display)).toMatchObject({
      act1EndingOpen: false,
      secondActStarted: true,
      desktopLabel: '暗潮私人桌面',
    });
  });

  it('keeps scene takeover, completed-act review, and dismissal precedence', () => {
    const state = createDefaultState();
    state.modules.act2Research.stage = 'bridge';
    expect(deriveAppView(state, display)).toMatchObject({ act2SceneOpen: true, sceneOpen: true });
    expect(deriveAppView(state, { ...display, dismissedAct2Stage: 'bridge' })).toMatchObject({ act2SceneOpen: false, sceneOpen: false });

    state.modules.act3.stage = 'T07';
    state.game.flags.FLAG_A3_COMPLETE = true;
    state.game.flags.FLAG_A3_SITE_EXITED = true;
    expect(deriveAppView(state, display)).toMatchObject({ act3Active: true, act3Open: true });
    expect(deriveAppView(state, { ...display, reviewAct3: true })).toMatchObject({ act3Open: true });

    state.modules.act4.stage = 'T01';
    expect(deriveAppView(state, display)).toMatchObject({ act4Open: true, act3Open: false, sceneOpen: true });
    expect(deriveAppView(state, { ...display, dismissedAct4: true })).toMatchObject({ act4Open: false, act3Open: false });
  });

  it('keeps the phase-F reading surface visible until the player explicitly opens the departure intro', () => {
    const state = createDefaultState();
    state.game.phase = 'F';
    expect(deriveAppView(state, display)).toMatchObject({ act1SceneOpen: false, sceneOpen: false });
    expect(deriveAppView(state, { ...display, showAct1JourneyIntro: true })).toMatchObject({ act1SceneOpen: true, sceneOpen: true });
    state.modules.scene.currentSceneId = 'SCENE_A1_G1';
    expect(deriveAppView(state, display)).toMatchObject({ act1SceneOpen: true, sceneOpen: true });
  });
});
