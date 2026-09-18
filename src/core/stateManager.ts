import { eventBus, type EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { loadState, saveState } from './saveManager';
import { isAct2EvidenceAssetId, type Act2ActiveStage, type Act2ResearchState, type Act2Stage, type AppId, type AppState, type Bounds, type GamePhase, type HeibumuNamePart } from './types';
import { act1Scenes, hotspotById, hotspotsBySceneId, sceneById } from '../data/sceneData';
import { isSymbolVisible } from '../data/photoData';

type StateListener = () => void;

type Act2ResearchPatch = {
  stage?: Act2Stage;
  bridge?: Partial<Act2ResearchState['bridge']>;
  library?: Partial<Act2ResearchState['library']>;
};

const act2ActiveStages: Act2ActiveStage[] = ['search', 'bridge', 'library'];
const act2StageOrder: Act2Stage[] = ['inactive', 'search', 'bridge', 'library'];
const act2StagePhases: Record<Act2ActiveStage, GamePhase> = { search: 'A2_T01', bridge: 'A2_T02', library: 'A2_T03' };
const heibumuNameParts: HeibumuNamePart[] = ['first', 'middle', 'last'];
const heibumuName = { first: '黑', middle: '补', last: '母' } as const;
const heibumuNameText = '黑补母';
const heibumuNameSolvedFlag = 'FLAG_A2_HEIBUMU_NAME_SOLVED';

const copyBounds = (bounds: Bounds): Bounds => ({ ...bounds });
const viewportBounds = (): Bounds => ({
  x: 0,
  y: 0,
  width: Math.max(320, typeof window === 'undefined' ? 1366 : window.innerWidth),
  height: Math.max(240, (typeof window === 'undefined' ? 768 : window.innerHeight) - 64),
});

export class StateManager {
  private state: AppState;
  private subscribers = new Set<StateListener>();

  constructor(private readonly bus: EventBus = eventBus, initialState: AppState = loadState()) {
    this.state = initialState;
  }

  getState = (): AppState => this.state;

  subscribe = (listener: StateListener): (() => void) => {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  };

  private commit(next: AppState): void {
    this.state = next;
    this.subscribers.forEach((listener) => listener());
    if (saveState(this.state)) this.bus.emit('save:completed', { schemaVersion: 2 });
  }

  private nextZIndex(): number {
    return Math.max(...Object.values(this.state.desktop.windows).map((window) => window.zIndex), 0) + 1;
  }

  private nextVisibleAppId(windows: AppState['desktop']['windows']): AppId | null {
    return Object.values(windows)
      .filter((window) => window.status === 'normal' || window.status === 'maximized')
      .sort((left, right) => right.zIndex - left.zIndex)[0]?.appId ?? null;
  }

  private restoreMinimizedWindow(appId: AppId): void {
    const current = this.state.desktop.windows[appId];
    const status = current.restoreBounds === null ? 'normal' as const : 'maximized' as const;
    const nextWindow = { ...current, status, zIndex: this.nextZIndex() };
    this.commit({ ...this.state, desktop: { ...this.state.desktop, windows: { ...this.state.desktop.windows, [appId]: nextWindow }, activeAppId: appId } });
    this.bus.emit('window:focused', { appId });
  }

  openApp(appId: AppId): void {
    const current = this.state.desktop.windows[appId];
    if (current.status !== 'closed') return this.focusWindow(appId);
    const openedOnceAppIds = this.state.desktop.openedOnceAppIds.includes(appId) ? this.state.desktop.openedOnceAppIds : [...this.state.desktop.openedOnceAppIds, appId];
    const nextWindow = { ...current, status: 'normal' as const, zIndex: this.nextZIndex() };
    this.commit({ ...this.state, desktop: { ...this.state.desktop, windows: { ...this.state.desktop.windows, [appId]: nextWindow }, activeAppId: appId, openedOnceAppIds } });
    this.bus.emit('app:opened', { appId });
    this.bus.emit('window:focused', { appId });
  }

  focusWindow(appId: AppId): void {
    const current = this.state.desktop.windows[appId];
    if (current.status === 'closed') return this.openApp(appId);
    if (current.status === 'minimized') return this.restoreMinimizedWindow(appId);
    const nextWindow = { ...current, zIndex: this.nextZIndex() };
    this.commit({ ...this.state, desktop: { ...this.state.desktop, windows: { ...this.state.desktop.windows, [appId]: nextWindow }, activeAppId: appId } });
    this.bus.emit('window:focused', { appId });
  }

  closeWindow(appId: AppId): void {
    const current = this.state.desktop.windows[appId];
    const nextWindow = { ...current, status: 'closed' as const };
    const windows = { ...this.state.desktop.windows, [appId]: nextWindow };
    const activeAppId = this.state.desktop.activeAppId === appId ? this.nextVisibleAppId(windows) : this.state.desktop.activeAppId;
    this.commit({ ...this.state, desktop: { ...this.state.desktop, windows, activeAppId } });
    this.bus.emit('app:closed', { appId });
  }

  minimizeWindow(appId: AppId): void {
    const current = this.state.desktop.windows[appId];
    if (current.status === 'closed') return;
    const windows = { ...this.state.desktop.windows, [appId]: { ...current, status: 'minimized' as const } };
    const activeAppId = this.state.desktop.activeAppId === appId ? this.nextVisibleAppId(windows) : this.state.desktop.activeAppId;
    this.commit({ ...this.state, desktop: { ...this.state.desktop, windows, activeAppId } });
  }

  toggleTaskbarApp(appId: AppId): void {
    const current = this.state.desktop.windows[appId];
    if (this.state.desktop.activeAppId === appId && (current.status === 'normal' || current.status === 'maximized')) {
      this.minimizeWindow(appId);
      return;
    }
    this.focusWindow(appId);
  }

  toggleMaximize(appId: AppId): void {
    const current = this.state.desktop.windows[appId];
    if (current.status === 'maximized') {
      const restored = current.restoreBounds ?? createDefaultState().desktop.windows[appId].bounds;
      this.commit({ ...this.state, desktop: { ...this.state.desktop, windows: { ...this.state.desktop.windows, [appId]: { ...current, status: 'normal', bounds: copyBounds(restored), restoreBounds: null, zIndex: this.nextZIndex() } }, activeAppId: appId } });
      return;
    }
    this.commit({ ...this.state, desktop: { ...this.state.desktop, windows: { ...this.state.desktop.windows, [appId]: { ...current, status: 'maximized', restoreBounds: copyBounds(current.bounds), bounds: viewportBounds(), zIndex: this.nextZIndex() } }, activeAppId: appId } });
  }

  setBounds(appId: AppId, bounds: Bounds): void {
    const current = this.state.desktop.windows[appId];
    if (current.status === 'maximized') return;
    const nextBounds = { x: Math.max(0, bounds.x), y: Math.max(0, bounds.y), width: Math.max(320, bounds.width), height: Math.max(240, bounds.height) };
    this.commit({ ...this.state, desktop: { ...this.state.desktop, windows: { ...this.state.desktop.windows, [appId]: { ...current, bounds: nextBounds } } } });
  }

  setFlag(flagId: string, value: boolean | string | number): void {
    this.commit({ ...this.state, game: { ...this.state.game, flags: { ...this.state.game.flags, [flagId]: value } } });
    this.bus.emit('flag:changed', { flagId, value });
  }

  setPhase(phase: GamePhase): void {
    if (this.state.game.phase === phase) return;
    this.commit({ ...this.state, game: { ...this.state.game, phase } });
    this.bus.emit('phase:changed', { phase });
  }

  markMailRead(mailId: string): void {
    const { readIds } = this.state.modules.mail;
    if (!readIds.includes(mailId)) {
      this.commit({
        ...this.state,
        modules: { ...this.state.modules, mail: { ...this.state.modules.mail, readIds: [...readIds, mailId] } },
      });
    }
    this.bus.emit('mail:opened', { mailId });
  }

  toggleMailStarred(mailId: string): void {
    const { starredIds } = this.state.modules.mail;
    const nextStarredIds = starredIds.includes(mailId)
      ? starredIds.filter((id) => id !== mailId)
      : [...starredIds, mailId];
    this.commit({
      ...this.state,
      modules: { ...this.state.modules, mail: { ...this.state.modules.mail, starredIds: nextStarredIds } },
    });
  }

  recordBrowserSearch(query: string): void {
    const normalized = query.trim();
    if (!normalized) return;
    const queryHistory = [normalized, ...this.state.modules.browser.queryHistory.filter((item) => item !== normalized)].slice(0, 20);
    this.commit({ ...this.state, modules: { ...this.state.modules, browser: { ...this.state.modules.browser, queryHistory } } });
    this.bus.emit('browser:searched', { query: normalized });
  }

  recordBrowserPageVisit(pageId: string): void {
    const { visitedPageIds } = this.state.modules.browser;
    if (!visitedPageIds.includes(pageId)) {
      this.commit({ ...this.state, modules: { ...this.state.modules, browser: { ...this.state.modules.browser, visitedPageIds: [...visitedPageIds, pageId] } } });
    }
    this.bus.emit('browser:page-opened', { pageId });
  }

  setNotepadUserText(userText: string): void {
    if (this.state.modules.notepad.userText === userText) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, notepad: { ...this.state.modules.notepad, userText } } });
  }

  addNotepadAutoEntry(entryId: string): void {
    const { autoEntryIds } = this.state.modules.notepad;
    if (autoEntryIds.includes(entryId)) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, notepad: { ...this.state.modules.notepad, autoEntryIds: [...autoEntryIds, entryId] } } });
    this.bus.emit('notepad:auto-entry-added', { entryId });
  }

  resetProgress(): void {
    this.commit(createDefaultState());
    this.bus.emit('progress:reset', { schemaVersion: 2 });
  }

  startJourney(sceneId: string): void {
    if (this.state.game.phase !== 'F' || this.state.modules.scene.journeyStarted || sceneId !== act1Scenes[0]?.id) return;
    const scene = this.state.modules.scene;
    this.commit({ ...this.state, modules: { ...this.state.modules, scene: { ...scene, journeyStarted: true, currentSceneId: sceneId, visitedSceneIds: [...new Set([...scene.visitedSceneIds, sceneId])] } } });
    this.bus.emit('journey:started', { sceneId });
  }

  enterScene(sceneId: string): void {
    const scene = this.state.modules.scene;
    const current = scene.currentSceneId ? sceneById.get(scene.currentSceneId) : null;
    if (!scene.journeyStarted || !current || current.nextSceneId !== sceneId || !current.requiredFlagIds.every((flagId) => this.state.game.flags[flagId] === true)) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, scene: { ...scene, currentSceneId: sceneId, visitedSceneIds: [...new Set([...scene.visitedSceneIds, sceneId])] } } });
    this.bus.emit('scene:entered', { sceneId });
  }

  inspectSceneHotspot(hotspotId: string): void {
    const scene = this.state.modules.scene;
    const hotspot = hotspotById.get(hotspotId);
    if (!scene.journeyStarted || hotspot?.sceneId !== scene.currentSceneId || scene.inspectedHotspotIds.includes(hotspotId)) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, scene: { ...scene, inspectedHotspotIds: [...scene.inspectedHotspotIds, hotspotId] } } });
    this.bus.emit('scene:hotspot-inspected', { hotspotId });
  }

  captureScenePhoto(sceneId: string, photoId: string): void {
    const scene = this.state.modules.scene;
    const current = sceneById.get(sceneId);
    const triggerFlags = [...new Set((hotspotsBySceneId.get(sceneId) ?? []).flatMap((hotspot) => hotspot.triggerFlags))];
    if (!scene.journeyStarted || scene.currentSceneId !== sceneId || current?.capturePhotoId !== photoId || !triggerFlags.every((flagId) => this.state.game.flags[flagId] === true) || scene.capturedPhotoIds.includes(photoId)) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, scene: { ...scene, capturedPhotoIds: [...scene.capturedPhotoIds, photoId] } } });
    this.bus.emit('scene:photo-captured', { sceneId, photoId });
  }

  finishJourney(lastSceneId: string): void {
    const scene = this.state.modules.scene;
    const current = sceneById.get(lastSceneId);
    if (!scene.journeyStarted || scene.currentSceneId !== lastSceneId || current?.nextSceneId !== null || !current.requiredFlagIds.every((flagId) => this.state.game.flags[flagId] === true)) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, scene: { ...scene, journeyStarted: false, currentSceneId: null } } });
    this.bus.emit('journey:finished', { lastSceneId });
  }

  openPhotoEditor(photoId: string): void {
    if (!this.state.modules.scene.capturedPhotoIds.includes(photoId)) return;
    const photos = this.state.modules.photos;
    this.commit({ ...this.state, modules: { ...this.state.modules, photos: { ...photos, activePhotoId: photoId, openedPhotoIds: [...new Set([...photos.openedPhotoIds, photoId])] } } });
    this.bus.emit('photo:editor-opened', { photoId });
  }

  setPhotoAdjustment(photoId: string, adjustment: 'exposure' | 'shadows' | 'contrast', value: number): void {
    if (!this.state.modules.scene.capturedPhotoIds.includes(photoId) || !Number.isFinite(value)) return;
    const photos = this.state.modules.photos;
    const current = photos.adjustments[photoId] ?? { exposure: 0, shadows: 0, contrast: 0 };
    const nextValue = Math.max(-100, Math.min(100, Math.round(value)));
    if (current[adjustment] === nextValue) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, photos: { ...photos, adjustments: { ...photos.adjustments, [photoId]: { ...current, [adjustment]: nextValue } } } } });
    this.bus.emit('photo:adjusted', { photoId });
  }

  inspectPhotoSymbol(photoId: string): void {
    const adjustment = this.state.modules.photos.adjustments[photoId] ?? { exposure: 0, shadows: 0, contrast: 0 };
    if (photoId !== 'IMG_A1_H_003' || !this.state.modules.scene.capturedPhotoIds.includes(photoId) || !isSymbolVisible(adjustment) || this.state.modules.photos.inspectedSymbolPhotoIds.includes(photoId)) return;
    const photos = this.state.modules.photos;
    this.commit({ ...this.state, modules: { ...this.state.modules, photos: { ...photos, inspectedSymbolPhotoIds: [...photos.inspectedSymbolPhotoIds, photoId] } } });
    this.bus.emit('photo:symbol-inspected', { photoId });
  }

  setPhotoZoom(photoId: string, zoom: number): void {
    if (!this.state.modules.scene.capturedPhotoIds.includes(photoId) || !Number.isFinite(zoom)) return;
    const photos = this.state.modules.photos;
    const nextZoom = Math.max(1, Math.min(2.5, Math.round(zoom * 10) / 10));
    if (photos.zoomByPhotoId[photoId] === nextZoom) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, photos: { ...photos, zoomByPhotoId: { ...photos.zoomByPhotoId, [photoId]: nextZoom } } } });
  }

  finishFirstAct(): void {
    if (this.state.game.phase === 'K' && this.state.game.flags.FLAG_A1_SS_CLUE_RECORDED === true) this.setFlag('FLAG_A1_COMPLETE', true);
  }

  private get act2Research(): Act2ResearchState {
    return this.state.modules.act2Research;
  }

  private commitAct2Research(patch: Act2ResearchPatch): void {
    const current = this.state.modules.act2Research;
    const next: Act2ResearchState = {
      stage: patch.stage ?? current.stage,
      bridge: patch.bridge ? { ...current.bridge, ...patch.bridge } : current.bridge,
      library: patch.library ? { ...current.library, ...patch.library } : current.library,
    };
    this.commit({ ...this.state, modules: { ...this.state.modules, act2Research: next } });
  }

  /** 只有第一幕完成且第二幕尚未启动时生效；保留全部第一幕状态。 */
  startSecondAct(): void {
    const { game, modules } = this.state;
    if (game.flags.FLAG_A1_COMPLETE !== true || modules.act2Research.stage !== 'inactive') return;
    this.commit({
      ...this.state,
      game: { ...game, act: 2, phase: 'A2_T01' },
      modules: { ...modules, act2Research: { ...modules.act2Research, stage: 'search' } },
    });
    this.bus.emit('act2:started', { act: 2 });
    this.bus.emit('phase:changed', { phase: 'A2_T01' });
  }

  /** 阶段只能沿 search → bridge → library 前进；未启动、重复或回退都无副作用。 */
  setAct2Stage(stage: Act2ActiveStage): void {
    const current = this.act2Research.stage;
    if (!act2ActiveStages.includes(stage)) return;
    if (current === 'inactive' || current === stage) return;
    if (act2StageOrder.indexOf(stage) < act2StageOrder.indexOf(current)) return;
    const phase = act2StagePhases[stage];
    this.commit({
      ...this.state,
      game: { ...this.state.game, phase },
      modules: { ...this.state.modules, act2Research: { ...this.act2Research, stage } },
    });
    this.bus.emit('act2:stage-changed', { stage });
    this.bus.emit('phase:changed', { phase });
  }

  talkToAct2Elder(elderId: string): void {
    const bridge = this.act2Research.bridge;
    const id = elderId.trim();
    if (this.act2Research.stage !== 'bridge' || !id || bridge.talkedElderIds.includes(id)) return;
    this.commitAct2Research({ bridge: { talkedElderIds: [...bridge.talkedElderIds, id] } });
    this.bus.emit('act2:elder-talked', { elderId: id });
  }

  /** 只接受契约冻结的三张第一幕证据图；出示证据后线索老人会说出“黑捕木”。 */
  showAct2Evidence(assetId: string): void {
    const bridge = this.act2Research.bridge;
    const asset = assetId.trim();
    if (this.act2Research.stage !== 'bridge' || !isAct2EvidenceAssetId(asset) || bridge.shownEvidenceAssetIds.includes(asset)) return;
    this.commitAct2Research({ bridge: { shownEvidenceAssetIds: [...bridge.shownEvidenceAssetIds, asset], heardPhrase: true } });
    this.bus.emit('act2:evidence-shown', { assetId: asset });
  }

  setHeibumuNameChoice(part: HeibumuNamePart, value: string): void {
    const bridge = this.act2Research.bridge;
    const choice = value.trim();
    if (this.act2Research.stage !== 'bridge' || !bridge.heardPhrase || !choice) return;
    if (!heibumuNameParts.includes(part) || bridge.nameChoices[part] === choice) return;
    this.commitAct2Research({ bridge: { nameChoices: { ...bridge.nameChoices, [part]: choice } } });
  }

  confirmHeibumuName(): void {
    const bridge = this.act2Research.bridge;
    const { first, middle, last } = bridge.nameChoices;
    if (this.act2Research.stage !== 'bridge' || !bridge.heardPhrase) return;
    if (first !== heibumuName.first || middle !== heibumuName.middle || last !== heibumuName.last) return;
    if (this.state.game.flags[heibumuNameSolvedFlag] === true) return;
    this.setFlag(heibumuNameSolvedFlag, true);
    this.bus.emit('act2:name-solved', { name: heibumuNameText });
  }

  visitGazetteSection(sectionId: string): void {
    const library = this.act2Research.library;
    const id = sectionId.trim();
    if (this.act2Research.stage !== 'library' || !id || library.visitedSectionIds.includes(id)) return;
    this.commitAct2Research({ library: { visitedSectionIds: [...library.visitedSectionIds, id] } });
    this.bus.emit('act2:gazette-section-visited', { sectionId: id });
  }

  /** 契约要求先收窄目录再打开卷册。 */
  openGazetteVolume(volumeId: string): void {
    const library = this.act2Research.library;
    const id = volumeId.trim();
    if (this.act2Research.stage !== 'library' || !id || library.visitedSectionIds.length === 0 || library.openedVolumeIds.includes(id)) return;
    this.commitAct2Research({ library: { openedVolumeIds: [...library.openedVolumeIds, id] } });
    this.bus.emit('act2:gazette-volume-opened', { volumeId: id });
  }

  openGazettePage(pageId: string): void {
    const library = this.act2Research.library;
    const id = pageId.trim();
    if (this.act2Research.stage !== 'library' || !id || library.openedVolumeIds.length === 0 || library.currentPageId === id) return;
    this.commitAct2Research({ library: { currentPageId: id } });
    this.bus.emit('act2:gazette-page-opened', { pageId: id });
  }

  /** 只能给正在阅读的页面加书签或取消书签。 */
  toggleGazetteBookmark(pageId: string): void {
    const library = this.act2Research.library;
    const id = pageId.trim();
    if (this.act2Research.stage !== 'library' || !id || library.currentPageId !== id) return;
    const bookmarkedPageIds = library.bookmarkedPageIds.includes(id)
      ? library.bookmarkedPageIds.filter((page) => page !== id)
      : [...library.bookmarkedPageIds, id];
    this.commitAct2Research({ library: { bookmarkedPageIds } });
  }

  markGazetteKeyword(keywordId: string): void {
    const library = this.act2Research.library;
    const id = keywordId.trim();
    if (this.act2Research.stage !== 'library' || !id || library.currentPageId === null || library.markedKeywordIds.includes(id)) return;
    this.commitAct2Research({ library: { markedKeywordIds: [...library.markedKeywordIds, id] } });
    this.bus.emit('act2:gazette-keyword-marked', { keywordId: id });
  }

  excerptGazetteEntry(entryId: string): void {
    const library = this.act2Research.library;
    const id = entryId.trim();
    if (this.act2Research.stage !== 'library' || !id || library.currentPageId === null || library.excerptedEntryIds.includes(id)) return;
    this.commitAct2Research({ library: { excerptedEntryIds: [...library.excerptedEntryIds, id] } });
    this.bus.emit('act2:gazette-entry-excerpted', { entryId: id });
  }
}

export const stateManager = new StateManager();
