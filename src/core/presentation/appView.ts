import type { AppState, Act2Stage } from '../types';

export type Act2SceneStage = Extract<Act2Stage, 'bridge' | 'library' | 'tales' | 'school' | 'finale'>;

export interface AppDisplayState {
  dismissedAct2Stage: Act2SceneStage | null;
  dismissedAct3: boolean;
  reviewAct3: boolean;
  dismissedAct4: boolean;
}

export interface AppViewModel {
  act1EndingOpen: boolean;
  act1SceneOpen: boolean;
  act2SceneStage: Act2SceneStage | null;
  act2SceneOpen: boolean;
  act3Stage: AppState['modules']['act3']['stage'];
  act3Active: boolean;
  act3Open: boolean;
  act4Active: boolean;
  act4Open: boolean;
  sceneOpen: boolean;
  secondActStarted: boolean;
  desktopLabel: string;
}

/** Keep view priority and display-only dismissals derived without creating global route state. */
export function deriveAppView(state: AppState, display: AppDisplayState): AppViewModel {
  const act2Stage = state.modules.act2Research.stage;
  const act2SceneStage = isAct2SceneStage(act2Stage) ? act2Stage : null;
  const act3Stage = state.modules.act3.stage;
  const act3Active = act3Stage !== 'inactive';
  const act4Active = state.modules.act4.stage !== 'inactive';
  const act4Open = act4Active && !display.dismissedAct4;
  const act3Open = act3Active
    && !display.dismissedAct3
    && (!act4Active || display.dismissedAct4)
    && (state.game.flags.FLAG_A3_COMPLETE !== true
      || display.reviewAct3
      || (!act4Active && state.game.flags.FLAG_A3_SITE_EXITED === true && act3Stage === 'T07'));
  const act2SceneOpen = act2SceneStage !== null && !act3Active && display.dismissedAct2Stage !== act2SceneStage;
  const act1SceneOpen = (state.game.phase === 'F' && !state.modules.scene.journeyStarted)
    || state.modules.scene.currentSceneId !== null;
  const sceneOpen = act1SceneOpen || act2SceneOpen || act3Open || act4Open;
  const secondActStarted = act2Stage !== 'inactive';

  return {
    act1EndingOpen: state.game.flags.FLAG_A1_COMPLETE === true && !secondActStarted,
    act1SceneOpen,
    act2SceneStage,
    act2SceneOpen,
    act3Stage,
    act3Active,
    act3Open,
    act4Active,
    act4Open,
    sceneOpen,
    secondActStarted,
    desktopLabel: secondActStarted ? '暗潮私人桌面' : '暗潮第一幕私人桌面',
  };
}

/** Only these second-act stages replace the desktop with a full-screen investigation scene. */
export function isAct2SceneStage(stage: Act2Stage): stage is Act2SceneStage {
  return stage === 'bridge' || stage === 'library' || stage === 'tales' || stage === 'school' || stage === 'finale';
}
