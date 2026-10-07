import type { AppId, AppState } from '../types';

export type StateSelector<Selected> = (state: AppState) => Selected;

export const selectAppState: StateSelector<AppState> = (state) => state;
export const selectDesktop: StateSelector<AppState['desktop']> = (state) => state.desktop;
export const selectWindow = (appId: AppId): StateSelector<AppState['desktop']['windows'][AppId]> => (state) => state.desktop.windows[appId];
export const selectMail: StateSelector<AppState['modules']['mail']> = (state) => state.modules.mail;
export const selectBrowser: StateSelector<AppState['modules']['browser']> = (state) => state.modules.browser;
export const selectNotepad: StateSelector<AppState['modules']['notepad']> = (state) => state.modules.notepad;
export const selectScene: StateSelector<AppState['modules']['scene']> = (state) => state.modules.scene;
export const selectPhotos: StateSelector<AppState['modules']['photos']> = (state) => state.modules.photos;
export const selectAct2Research: StateSelector<AppState['modules']['act2Research']> = (state) => state.modules.act2Research;
export const selectAct3: StateSelector<AppState['modules']['act3']> = (state) => state.modules.act3;
export const selectAct4: StateSelector<AppState['modules']['act4']> = (state) => state.modules.act4;

export type WechatSnapshot = {
  game: AppState['game'];
  modules: { act2Research: Pick<AppState['modules']['act2Research'], 'stage'> };
};
export const selectWechatSnapshot: StateSelector<WechatSnapshot> = (state) => ({ game: state.game, modules: { act2Research: { stage: state.modules.act2Research.stage } } });
export const equalWechatSnapshot: EqualityFn<WechatSnapshot> = (left, right) => left.game === right.game && left.modules.act2Research.stage === right.modules.act2Research.stage;

export type BrowserSnapshot = {
  modules: Pick<AppState['modules'], 'browser' | 'act2Research'>;
  game: Pick<AppState['game'], 'phase' | 'flags'>;
};
export const selectBrowserSnapshot: StateSelector<BrowserSnapshot> = (state) => ({ modules: { browser: state.modules.browser, act2Research: state.modules.act2Research }, game: { phase: state.game.phase, flags: state.game.flags } });
export const equalBrowserSnapshot: EqualityFn<BrowserSnapshot> = (left, right) => left.modules.browser === right.modules.browser
  && left.modules.act2Research === right.modules.act2Research && left.game.phase === right.game.phase && left.game.flags === right.game.flags;

export type NotepadSnapshot = {
  modules: { notepad: AppState['modules']['notepad']; act3: Pick<AppState['modules']['act3'], 'stage'> };
  game: { flags: Pick<AppState['game']['flags'], 'FLAG_A3_COMPLETE'> };
};
export const selectNotepadSnapshot: StateSelector<NotepadSnapshot> = (state) => ({ modules: { notepad: state.modules.notepad, act3: { stage: state.modules.act3.stage } }, game: { flags: { FLAG_A3_COMPLETE: state.game.flags.FLAG_A3_COMPLETE } } });
export const equalNotepadSnapshot: EqualityFn<NotepadSnapshot> = (left, right) => left.modules.notepad === right.modules.notepad
  && left.modules.act3.stage === right.modules.act3.stage && left.game.flags.FLAG_A3_COMPLETE === right.game.flags.FLAG_A3_COMPLETE;

export type Act2LibrarySnapshot = {
  modules: Pick<AppState['modules'], 'act2Research'>;
  game: Pick<AppState['game'], 'flags'>;
};
export const selectAct2LibrarySnapshot: StateSelector<Act2LibrarySnapshot> = (state) => ({ modules: { act2Research: state.modules.act2Research }, game: { flags: state.game.flags } });
export const equalAct2LibrarySnapshot: EqualityFn<Act2LibrarySnapshot> = (left, right) => left.modules.act2Research === right.modules.act2Research && left.game.flags === right.game.flags;

export type Act2BridgeSnapshot = {
  modules: Pick<AppState['modules'], 'act2Research'>;
  game: Pick<AppState['game'], 'flags'>;
};
export const selectAct2BridgeSnapshot: StateSelector<Act2BridgeSnapshot> = (state) => ({ modules: { act2Research: state.modules.act2Research }, game: { flags: state.game.flags } });
export const equalAct2BridgeSnapshot: EqualityFn<Act2BridgeSnapshot> = equalAct2LibrarySnapshot;

export type Act2TalesSnapshot = { stage: AppState['modules']['act2Research']['stage']; tales: AppState['modules']['act2Research']['tales'] };
export const selectAct2TalesSnapshot: StateSelector<Act2TalesSnapshot> = (state) => ({ stage: state.modules.act2Research.stage, tales: state.modules.act2Research.tales });
export const equalAct2TalesSnapshot: EqualityFn<Act2TalesSnapshot> = (left, right) => left.stage === right.stage && left.tales === right.tales;

export type Act2SchoolSnapshot = {
  modules: Pick<AppState['modules'], 'act2Research'>;
  game: Pick<AppState['game'], 'flags'>;
};
export const selectAct2SchoolSnapshot: StateSelector<Act2SchoolSnapshot> = (state) => ({ modules: { act2Research: state.modules.act2Research }, game: { flags: state.game.flags } });
export const equalAct2SchoolSnapshot: EqualityFn<Act2SchoolSnapshot> = equalAct2LibrarySnapshot;

export type Act2T07Snapshot = {
  modules: { act2Research: Pick<AppState['modules']['act2Research'], 'stage' | 't07'>; browser: AppState['modules']['browser'] };
  settings: { reducedMotion: boolean };
  game: Pick<AppState['game'], 'flags'>;
};
export const selectAct2T07Snapshot: StateSelector<Act2T07Snapshot> = (state) => ({
  modules: { act2Research: { stage: state.modules.act2Research.stage, t07: state.modules.act2Research.t07 }, browser: state.modules.browser },
  settings: { reducedMotion: state.settings.reducedMotion },
  game: { flags: state.game.flags },
});
export const equalAct2T07Snapshot: EqualityFn<Act2T07Snapshot> = (left, right) => left.modules.act2Research.stage === right.modules.act2Research.stage
  && left.modules.act2Research.t07 === right.modules.act2Research.t07 && left.modules.browser === right.modules.browser
  && left.settings.reducedMotion === right.settings.reducedMotion && left.game.flags === right.game.flags;

export type Act2T07EntrySnapshot = { stage: AppState['modules']['act2Research']['stage']; complete: boolean };
export const selectAct2T07EntrySnapshot: StateSelector<Act2T07EntrySnapshot> = (state) => ({ stage: state.modules.act2Research.stage, complete: state.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL === true });
export const equalAct2T07EntrySnapshot: EqualityFn<Act2T07EntrySnapshot> = (left, right) => left.stage === right.stage && left.complete === right.complete;

export type Act3Snapshot = {
  modules: Pick<AppState['modules'], 'act3'>;
  game: Pick<AppState['game'], 'flags'>;
};
export const selectAct3Snapshot: StateSelector<Act3Snapshot> = (state) => ({ modules: { act3: state.modules.act3 }, game: { flags: state.game.flags } });
export const equalAct3Snapshot: EqualityFn<Act3Snapshot> = (left, right) => left.modules.act3 === right.modules.act3 && left.game.flags === right.game.flags;

export type Act4ReaderSnapshot = { act4: AppState['modules']['act4']; complete: boolean };
export const selectAct4ReaderSnapshot: StateSelector<Act4ReaderSnapshot> = (state) => ({ act4: state.modules.act4, complete: state.game.flags.FLAG_A4_COMPLETE === true });
export const equalAct4ReaderSnapshot: EqualityFn<Act4ReaderSnapshot> = (left, right) => left.act4 === right.act4 && left.complete === right.complete;

export type EqualityFn<Selected> = (left: Selected, right: Selected) => boolean;
