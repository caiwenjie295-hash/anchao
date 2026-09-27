import { eventBus, type EventBus } from './eventBus';
import { createDefaultState } from './defaultState';
import { loadState, saveState } from './saveManager';
import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS, isAct2EvidenceAssetId, type Act2ActiveStage, type Act2ResearchState, type Act2Stage, type Act3State, type AppId, type AppState, type Bounds, type GamePhase, type HeibumuNamePart } from './types';
import { act1Scenes, hotspotById, hotspotsBySceneId, sceneById } from '../data/sceneData';
import { isSymbolVisible } from '../data/photoData';
import { taleById, taleCardById, taleCards, taleNoteIdById } from '../data/act2TalesData';
import { isAct2T06PageId } from '../data/browserData';
import { getPendingStoryTransition } from '../data/storyTransitionData';
import { act3FirstLensId, act3LensById, act3StageClueIds, ACT3_STAGE_COMPLETION_FLAG, ACT3_STAGE_GATE_FLAG, ACT3_STAGE_NEXT } from '../data/act3Data';
import { act2T07, isAct2T07MaterialId, isAct2T07SegmentId, keyFrameById } from '../data/act2T07Data';

type StateListener = () => void;

type Act2ResearchPatch = {
  stage?: Act2Stage;
  bridge?: Partial<Act2ResearchState['bridge']>;
  library?: Partial<Act2ResearchState['library']>;
  tales?: Partial<Act2ResearchState['tales']>;
  school?: Partial<Act2ResearchState['school']>;
  t07?: Partial<Act2ResearchState['t07']>;
};

const act2ActiveStages: Act2ActiveStage[] = ['search', 'bridge', 'library', 'tales'];
const act2StageOrder: Act2Stage[] = ['inactive', 'search', 'bridge', 'library', 'tales', 'school', 'qiming', 'finale'];
const act2StagePhases: Record<Act2ActiveStage, GamePhase> = { search: 'A2_T01', bridge: 'A2_T02', library: 'A2_T03', tales: 'A2_T04' };
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

  /** 订阅 flag:changed 事件，返回取消订阅函数。 */
  subscribeFlagChanged = (handler: (payload: { flagId: string; value: boolean | string | number }) => void): (() => void) => {
    return this.bus.on('flag:changed', handler);
  };

  private commit(next: AppState): void {
    this.state = next;
    this.subscribers.forEach((listener) => listener());
    if (saveState(this.state)) this.bus.emit('save:completed', { schemaVersion: 7 });
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

  acknowledgeStoryTransition(id: string): void {
    const pending = getPendingStoryTransition(this.state);
    if (pending?.id !== id) return;
    this.commit({ ...this.state, modules: { ...this.state.modules, storyTransitions: { seenIds: [...this.state.modules.storyTransitions.seenIds, id] } } });
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
    if (pageId.startsWith('PAGE_A2_T06_') && (!isAct2T06PageId(pageId) || this.act2Research.stage !== 'qiming')) return;
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
    this.bus.emit('progress:reset', { schemaVersion: 7 });
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
      tales: patch.tales ? { ...current.tales, ...patch.tales } : current.tales,
      school: patch.school ? { ...current.school, ...patch.school } : current.school,
      t07: patch.t07 ? { ...current.t07, ...patch.t07 } : current.t07,
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
    if (act2StageOrder.indexOf(stage) !== act2StageOrder.indexOf(current) + 1) return;
    if (stage === 'tales' && this.state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN !== true) return;
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

  readAct2Tale(taleId: string): void {
    const tales = this.act2Research.tales;
    const id = taleId.trim();
    if (this.act2Research.stage !== 'tales' || !id || !taleById.has(id) || tales.readTaleIds.includes(id)) return;
    this.commitAct2Research({ tales: { readTaleIds: [...tales.readTaleIds, id] } });
    this.setFlag(taleById.get(id)?.readFlagId ?? '', true);
    this.bus.emit('act2:tale-read', { taleId: id });
  }

  collectAct2Tale(taleId: string): void {
    const tales = this.act2Research.tales;
    const id = taleId.trim();
    if (this.act2Research.stage !== 'tales' || !id || !taleById.has(id) || !tales.readTaleIds.includes(id) || tales.collectedTaleIds.includes(id)) return;
    this.commitAct2Research({ tales: { collectedTaleIds: [...tales.collectedTaleIds, id] } });
    this.addNotepadAutoEntry(taleNoteIdById.get(id) ?? '');
    this.bus.emit('act2:tale-collected', { taleId: id });
  }

  placeAct2TaleCard(cardId: string): void {
    const tales = this.act2Research.tales;
    const id = cardId.trim();
    if (this.act2Research.stage !== 'tales' || !id || !taleCardById.has(id) || tales.collectedTaleIds.length !== taleById.size || tales.placedCardIds.includes(id)) return;
    this.commitAct2Research({ tales: { placedCardIds: [...tales.placedCardIds, id] } });
    this.bus.emit('act2:tale-card-placed', { cardId: id });
  }

  finishAct2TaleSorting(): void {
    const tales = this.act2Research.tales;
    if (this.act2Research.stage !== 'tales' || tales.sorted || tales.placedCardIds.length !== taleCards.length) return;
    this.commitAct2Research({ tales: { sorted: true } });
    this.setFlag('FLAG_A2_TALES_SORTED', true);
    this.bus.emit('act2:tales-sorted', {});
  }

  acknowledgeAct2TransferInference(): void {
    const tales = this.act2Research.tales;
    if (this.act2Research.stage !== 'tales' || !tales.sorted || tales.inferenceAcknowledged) return;
    this.commitAct2Research({ tales: { inferenceAcknowledged: true } });
    this.addNotepadAutoEntry('NOTE_A2_T04_004');
    this.setFlag('FLAG_A2_TRANSFER_RULE_INFERRED', true);
    this.bus.emit('act2:transfer-inferred', {});
  }

  /** 只能由小月的新微信内容主动触发；重载不会越级进入。 */
  enterAct2School(): void {
    const { game } = this.state;
    if (this.act2Research.stage !== 'tales' || game.flags.FLAG_A2_TRANSFER_RULE_INFERRED !== true || game.flags.FLAG_A2_SCHOOL_ENTERED === true) return;
    this.commit({
      ...this.state,
      game: { ...game, phase: 'A2_T05', flags: { ...game.flags, FLAG_A2_SCHOOL_ENTERED: true } },
      modules: { ...this.state.modules, act2Research: { ...this.act2Research, stage: 'school' } },
    });
    this.bus.emit('phase:changed', { phase: 'A2_T05' });
    this.bus.emit('flag:changed', { flagId: 'FLAG_A2_SCHOOL_ENTERED', value: true });
    this.bus.emit('act2:school-entered', {});
  }

  /** 只有 T05 双 S 已确认且玩家进行了有效启明搜索时才能进入 T06。 */
  enterAct2QimingResearch(): void {
    const { game } = this.state;
    if (this.act2Research.stage !== 'school' || game.flags.FLAG_A2_SS_MATCH_CONFIRMED !== true) return;
    this.commit({
      ...this.state,
      game: { ...game, phase: 'A2_T06' },
      modules: { ...this.state.modules, act2Research: { ...this.act2Research, stage: 'qiming' } },
    });
    this.bus.emit('act2:qiming-entered', {});
    this.bus.emit('phase:changed', { phase: 'A2_T06' });
  }

  inferAct2QimingNameMatch(person: 'huang' | 'zhong'): void {
    const { game, modules } = this.state;
    const flags = game.flags;
    const pages = modules.browser.visitedPageIds;
    if (person !== 'huang' && person !== 'zhong') return;
    if (this.act2Research.stage !== 'qiming' || flags.FLAG_A2_QIMING_TESTIMONIALS_READ !== true || flags.FLAG_A2_QIMING_FORUM_FOUND !== true || !pages.includes('PAGE_A2_T06_004') || !pages.includes('PAGE_A2_T06_006')) return;
    if (person === 'zhong' && !pages.includes('PAGE_A2_T06_007')) return;
    const flagId = person === 'huang' ? 'FLAG_A2_HUANG_MATCH_INFERRED' : 'FLAG_A2_ZHONG_MATCH_INFERRED';
    if (flags[flagId] === true) return;
    this.setFlag(flagId, true);
    this.bus.emit('act2:qiming-name-matched', { person });
    const nextFlags = this.state.game.flags;
    if (nextFlags.FLAG_A2_HUANG_MATCH_INFERRED === true && nextFlags.FLAG_A2_ZHONG_MATCH_INFERRED === true) this.addNotepadAutoEntry('NOTE_A2_T06_003');
  }

  confirmAct2OtherCasesAbnormal(): void {
    const { flags } = this.state.game;
    const pages = this.state.modules.browser.visitedPageIds;
    if (this.act2Research.stage !== 'qiming' || flags.FLAG_A2_HUANG_MATCH_INFERRED !== true || flags.FLAG_A2_ZHONG_MATCH_INFERRED !== true || !pages.includes('PAGE_A2_T06_008') || !pages.includes('PAGE_A2_T06_009') || flags.FLAG_A2_OTHER_CASES_ABNORMAL === true) return;
    this.setFlag('FLAG_A2_OTHER_CASES_ABNORMAL', true);
    this.addNotepadAutoEntry('NOTE_A2_T06_004');
    this.bus.emit('act2:qiming-cases-confirmed', {});
  }

  visitAct2SchoolArea(areaId: string): void {
    const id = areaId.trim();
    const school = this.act2Research.school;
    if (this.act2Research.stage !== 'school' || !ACT2_SCHOOL_AREA_IDS.includes(id as (typeof ACT2_SCHOOL_AREA_IDS)[number]) || school.visitedAreaIds.includes(id)) return;
    this.commitAct2Research({ school: { visitedAreaIds: [...school.visitedAreaIds, id] } });
    this.bus.emit('act2:school-area-visited', { areaId: id });
    if (id === 'AREA_A2_T05_CORRIDOR' && this.state.game.flags.FLAG_A2_FIRE_HYDRANT_SEEN !== true) this.setFlag('FLAG_A2_FIRE_HYDRANT_SEEN', true);
  }

  inspectAct2SchoolHotspot(hotspotId: string): void {
    const id = hotspotId.trim();
    const areaByHotspot: Record<(typeof ACT2_SCHOOL_HOTSPOT_IDS)[number], string> = {
      HOTSPOT_A2_T05_TEACHER: 'AREA_A2_T05_TEACHER_OFFICE',
      HOTSPOT_A2_T05_RANKS: 'AREA_A2_T05_HONOR_ROLL',
      HOTSPOT_A2_T05_QIMING_TEXT: 'AREA_A2_T05_HONOR_ROLL',
      HOTSPOT_A2_T05_SCHOLAR_NOTE: 'AREA_A2_T05_XIAOA_CLASSROOM',
    };
    if (this.act2Research.stage !== 'school' || !ACT2_SCHOOL_HOTSPOT_IDS.includes(id as (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number]) || this.act2Research.school.inspectedHotspotIds.includes(id) || !this.act2Research.school.visitedAreaIds.includes(areaByHotspot[id as (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number]])) return;
    this.commitAct2Research({ school: { inspectedHotspotIds: [...this.act2Research.school.inspectedHotspotIds, id] } });
    this.bus.emit('act2:school-hotspot-inspected', { hotspotId: id });
  }

  acknowledgeAct2TeacherAccount(): void {
    if (this.act2Research.stage !== 'school' || !this.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_TEACHER') || this.state.game.flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN === true) return;
    this.setFlag('FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', true);
    this.addNotepadAutoEntry('NOTE_A2_T05_001');
  }

  readAct2SchoolRanks(): void {
    if (this.act2Research.stage !== 'school' || !this.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_RANKS') || this.state.game.flags.FLAG_A2_SCORE_CHANGE_KNOWN === true) return;
    this.setFlag('FLAG_A2_SCORE_CHANGE_KNOWN', true);
    this.addNotepadAutoEntry('NOTE_A2_T05_002');
  }

  readAct2QimingTestimonial(): void {
    if (this.act2Research.stage !== 'school' || this.state.game.flags.FLAG_A2_SCORE_CHANGE_KNOWN !== true || !this.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_QIMING_TEXT') || this.state.game.flags.FLAG_A2_QIMING_NAME_FOUND === true) return;
    this.setFlag('FLAG_A2_QIMING_NAME_FOUND', true);
    this.addNotepadAutoEntry('NOTE_A2_T05_003');
  }

  inspectAct2SchoolNotebook(): void {
    if (this.act2Research.stage !== 'school' || !this.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE') || this.state.game.flags.FLAG_A2_SCHOOL_SS_FOUND === true) return;
    this.setFlag('FLAG_A2_SCHOOL_SS_FOUND', true);
  }

  confirmAct2SchoolSymbolMatch(): void {
    if (this.act2Research.stage !== 'school' || this.state.game.flags.FLAG_A1_SS_FOUND !== true || this.state.game.flags.FLAG_A2_SCHOOL_SS_FOUND !== true || !this.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE') || this.state.game.flags.FLAG_A2_SS_MATCH_CONFIRMED === true) return;
    this.setFlag('FLAG_A2_SS_MATCH_CONFIRMED', true);
    this.addNotepadAutoEntry('NOTE_A2_T05_004');
    this.bus.emit('act2:school-symbol-matched', {});
  }

  // ─── 第三幕 T00–T02 接口 ───────────────────────────────────────────

  /** 第三幕在第二幕 T07 完整收束后，由玩家主动进入。 */
  static readonly ACT3_ENTRY_FLAG = 'FLAG_A2_COMPLETE';
  static readonly ACT3_GATE_FLAG_T00 = 'FLAG_A3_GATE_REACHED';
  static readonly ACT3_GATE_FLAG_T01 = 'FLAG_A3_INNER_FENCE_PASSED';
  static readonly ACT3_GATE_FLAG_T02 = 'FLAG_A3_CLASSROOM_TURNED';
  static readonly ACT3_COMPLETE_FLAG_T00 = 'FLAG_A3_OLD_ROAD_FOUND';
  static readonly ACT3_COMPLETE_FLAG_T01 = 'FLAG_A3_QIMING_SITE_CONFIRMED';
  static readonly ACT3_COMPLETE_FLAG_T02 = 'FLAG_A3_CLASSROOM_CONTRADICTION_NOTED';
  static readonly ACT3_COMPLETE_FLAG_T03 = 'FLAG_A3_CONFINEMENT_SITE_CONFIRMED';
  static readonly ACT3_COMPLETE_FLAG_T04 = 'FLAG_A3_VVAKE_PAPER_FOUND';
  static readonly ACT3_COMPLETE_FLAG_T05 = 'FLAG_A3_13ACK_PAPER_FOUND';

  private get act3(): Act3State { return this.state.modules.act3; }

  private commitAct3(patch: Partial<Act3State>): void {
    const next: Act3State = { ...this.act3, ...patch };
    this.commit({ ...this.state, modules: { ...this.state.modules, act3: next } });
  }

  /** 启动第三幕；只在第二幕 T07 完成、第三幕尚未启动时生效。 */
  startAct3(): void {
    if (this.state.game.flags[StateManager.ACT3_ENTRY_FLAG] !== true || this.act3.stage !== 'inactive') return;
    this.commit({
      ...this.state,
      game: { ...this.state.game, act: 3, phase: 'A3_T00' },
      modules: { ...this.state.modules, act3: { ...this.act3, stage: 'T00' } },
    });
    this.bus.emit('act3:started', { act: 3 });
    this.bus.emit('phase:changed', { phase: 'A3_T00' });
  }

  /** 切换当前镜头；不允许跨 T。 */
  enterAct3Lens(lensId: string): void {
    const id = lensId.trim();
    const stage = this.act3.stage;
    if (stage === 'inactive' || !id) return;
    const lens = act3LensById(stage, id);
    if (!lens || lens.requiresClueIds?.some((required) => !this.act3.inspectedClueIds.includes(required))) return;
    const visitedLensIds = this.act3.visitedLensIds.includes(id) ? this.act3.visitedLensIds : [...this.act3.visitedLensIds, id];
    this.commitAct3({ currentLensId: id, visitedLensIds });
    this.bus.emit('act3:lens-entered', { lensId: id });
  }

  /** 检视线索；镜头与线索必须属于当前 T。 */
  inspectAct3Clue(clueId: string): void {
    const id = clueId.trim();
    const stage = this.act3.stage;
    const currentId = this.act3.currentLensId;
    if (stage === 'inactive' || !id || !currentId) return;
    const lens = act3LensById(stage, currentId);
    if (!lens || !lens.hotspots.some((hotspot) => hotspot.clueId === id)) return;
    if (this.act3.inspectedClueIds.includes(id)) return;
    this.commitAct3({ inspectedClueIds: [...this.act3.inspectedClueIds, id] });
    this.bus.emit('act3:clue-inspected', { clueId: id });
    if (stage === 'T05' && id === 'CLUE_A3_T05_13ACK_PAPER') {
      this.setFlag('FLAG_A3_13ACK_PAPER_FOUND', true);
      this.addNotepadAutoEntry('NOTE_A3_T05_001');
    }
  }

  /** 玩家主动确认阶段结论；线索、Flag 与下一阶段均由当前阶段的固定数据决定。 */
  confirmAct3Stage(): void {
    const stage = this.act3.stage;
    if (stage === 'inactive') return;
    const required = act3StageClueIds(stage);
    const id = ACT3_STAGE_COMPLETION_FLAG[stage];
    if (!required.length || !required.every((clueId) => this.act3.inspectedClueIds.includes(clueId)) || this.act3.confirmedFlagIds.includes(id)) return;
    const gateId = ACT3_STAGE_GATE_FLAG[stage];
    const nextStage = ACT3_STAGE_NEXT[stage];
    const confirmedFlagIds = [...new Set([...this.act3.confirmedFlagIds, id, gateId])];
    const nextLensId = nextStage ? act3FirstLensId(nextStage) : this.act3.currentLensId;
    this.commit({
      ...this.state,
      game: { ...this.state.game, flags: { ...this.state.game.flags, [id]: true, [gateId]: true }, phase: nextStage ? `A3_${nextStage}` as GamePhase : this.state.game.phase },
      modules: { ...this.state.modules, act3: { ...this.act3, confirmedFlagIds, stage: nextStage ?? stage, currentLensId: nextLensId, visitedLensIds: nextLensId && !this.act3.visitedLensIds.includes(nextLensId) ? [...this.act3.visitedLensIds, nextLensId] : this.act3.visitedLensIds } },
    });
    this.bus.emit('act3:stage-confirmed', { flagId: id });
    if (stage === 'T03') this.addNotepadAutoEntry('NOTE_A3_T03_001');
    if (stage === 'T04') this.addNotepadAutoEntry('NOTE_A3_T04_001');
    if (nextStage) {
      this.bus.emit('act3:stage-changed', { stage: nextStage });
      this.bus.emit('phase:changed', { phase: `A3_${nextStage}` as GamePhase });
    }
  }

  /** 只有 T06 收束且玩家主动点击入口才进入 T07；重复点击无副作用。 */
  enterAct2FinaleInvestigation(): void {
    const { game, modules } = this.state;
    if (modules.act2Research.stage !== 'qiming' || game.flags.FLAG_A2_OTHER_CASES_ABNORMAL !== true) return;
    this.commit({
      ...this.state,
      game: { ...game, phase: 'A2_T07' },
      modules: { ...modules, act2Research: { ...modules.act2Research, stage: 'finale' } },
    });
    this.bus.emit('phase:changed', { phase: 'A2_T07' });
    this.bus.emit('act2:t07-entered', {});
  }

  /** 只接受冻结的资料 ID；打开受访视频后写入 FOUND。 */
  viewAct2T07Material(materialId: string): void {
    const id = materialId.trim();
    if (this.act2Research.stage !== 'finale' || !isAct2T07MaterialId(id)) return;
    const t07 = this.act2Research.t07;
    if (!t07.viewedMaterialIds.includes(id)) this.commitAct2Research({ t07: { viewedMaterialIds: [...t07.viewedMaterialIds, id] } });
    if (act2T07.video.materialId === id && this.state.game.flags.FLAG_A2_PROMO_VIDEO_FOUND !== true) this.setFlag('FLAG_A2_PROMO_VIDEO_FOUND', true);
    this.bus.emit('act2:t07-material-viewed', { materialId: id });
  }

  /** 只在真实播放推进时调用；拖动进度条不算覆盖。 */
  markAct2T07SegmentPlayed(segmentId: string): void {
    const id = segmentId.trim();
    if (this.act2Research.stage !== 'finale' || this.state.game.flags.FLAG_A2_PROMO_VIDEO_FOUND !== true || !isAct2T07SegmentId(id)) return;
    const t07 = this.act2Research.t07;
    if (!t07.playedSegmentIds.includes(id)) this.commitAct2Research({ t07: { playedSegmentIds: [...t07.playedSegmentIds, id] } });
    if (this.state.game.flags.FLAG_A2_PROMO_VIDEO_WATCHED === true) return;
    const played = this.state.modules.act2Research.t07.playedSegmentIds;
    if (act2T07.video.requiredSegmentIds.every((segmentId2) => played.includes(segmentId2))) this.setFlag('FLAG_A2_PROMO_VIDEO_WATCHED', true);
  }

  /** 截图必须落在登记的关键帧窗口内；不接受伪造帧 ID 或窗口外的时间。 */
  captureAct2T07Frame(frameId: string, timeMs: number): void {
    const id = frameId.trim();
    const frame = keyFrameById.get(id);
    if (this.act2Research.stage !== 'finale' || !frame || this.state.game.flags.FLAG_A2_PROMO_VIDEO_FOUND !== true) return;
    if (!Number.isFinite(timeMs) || timeMs < frame.startMs || timeMs > frame.endMs) return;
    const t07 = this.act2Research.t07;
    if (t07.capturedFrameIds.includes(id)) return;
    this.commitAct2Research({ t07: { capturedFrameIds: [...t07.capturedFrameIds, id] } });
    this.bus.emit('act2:t07-frame-captured', { frameId: id });
  }

  /** 只能核对已经截到的帧；比对结果持久化，缩放与开合只是瞬时状态。 */
  compareAct2T07TempleFrame(frameId: string): void {
    const id = frameId.trim();
    const t07 = this.act2Research.t07;
    if (this.act2Research.stage !== 'finale' || !t07.capturedFrameIds.includes(id) || t07.comparedFrameIds.includes(id)) return;
    this.commitAct2Research({ t07: { comparedFrameIds: [...t07.comparedFrameIds, id] } });
    this.bus.emit('act2:t07-frame-compared', { frameId: id });
  }

  confirmAct2T07TempleFrame(): void {
    if (this.act2Research.stage !== 'finale' || this.act2Research.t07.comparedFrameIds.length === 0) return;
    if (this.state.game.flags.FLAG_A2_TEMPLE_FRAME_FOUND === true) return;
    this.setFlag('FLAG_A2_TEMPLE_FRAME_FOUND', true);
    this.addNotepadAutoEntry('NOTE_A2_T07_002');
    this.bus.emit('act2:t07-temple-confirmed', {});
  }

  /** 双 S 只来自合影右下角的主动检查与确认。 */
  confirmAct2T07PhotoSymbol(): void {
    if (this.act2Research.stage !== 'finale' || !this.act2Research.t07.viewedMaterialIds.includes(act2T07.photoMaterialId)) return;
    if (this.state.game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true) return;
    this.setFlag('FLAG_A2_PROMO_PHOTO_SS_FOUND', true);
    this.addNotepadAutoEntry('NOTE_A2_T07_001');
  }

  /** 地点结论要求合影双 S、有效截图比对与视频主要片段全部亲自完成。 */
  inferAct2T07Location(): void {
    const flags = this.state.game.flags;
    if (this.act2Research.stage !== 'finale') return;
    if (flags.FLAG_A2_PROMO_PHOTO_SS_FOUND !== true || flags.FLAG_A2_TEMPLE_FRAME_FOUND !== true || flags.FLAG_A2_PROMO_VIDEO_WATCHED !== true) return;
    if (flags.FLAG_A2_QIMING_LOCATION_INFERRED === true) return;
    this.setFlag('FLAG_A2_QIMING_LOCATION_INFERRED', true);
    this.addNotepadAutoEntry('NOTE_A2_T07_003');
    this.bus.emit('act2:t07-location-inferred', {});
  }

  planAct2T07SecondTrip(): void {
    if (this.act2Research.stage !== 'finale' || this.state.game.flags.FLAG_A2_QIMING_LOCATION_INFERRED !== true) return;
    if (this.state.game.flags.FLAG_A2_SECOND_TRIP_PLANNED === true) return;
    this.setFlag('FLAG_A2_SECOND_TRIP_PLANNED', true);
    this.addNotepadAutoEntry('NOTE_A2_T07_004');
    this.bus.emit('act2:t07-trip-planned', {});
  }

  /** 幕末收束只在行程确认后写入一次；之后可回看资料但不自动进入第三幕。 */
  completeAct2T07Finale(): void {
    if (this.act2Research.stage !== 'finale' || this.state.game.flags.FLAG_A2_SECOND_TRIP_PLANNED !== true) return;
    if (this.state.game.flags.FLAG_A2_COMPLETE === true) return;
    this.setFlag('FLAG_A2_COMPLETE', true);
    this.bus.emit('act2:t07-complete', {});
  }

  /** 新阶段上线后，已确认上一阶段的旧存档仍可由玩家主动继续。 */
  advanceAct3Stage(): void {
    const stage = this.act3.stage;
    if (stage === 'inactive') return;
    const nextStage = ACT3_STAGE_NEXT[stage];
    if (!nextStage || this.state.game.flags[ACT3_STAGE_COMPLETION_FLAG[stage]] !== true || this.state.game.flags[ACT3_STAGE_GATE_FLAG[stage]] !== true) return;
    const nextLensId = act3FirstLensId(nextStage);
    this.commit({
      ...this.state,
      game: { ...this.state.game, phase: `A3_${nextStage}` as GamePhase },
      modules: { ...this.state.modules, act3: { ...this.act3, stage: nextStage, currentLensId: nextLensId, visitedLensIds: this.act3.visitedLensIds.includes(nextLensId) ? this.act3.visitedLensIds : [...this.act3.visitedLensIds, nextLensId] } },
    });
    this.bus.emit('act3:stage-changed', { stage: nextStage });
    this.bus.emit('phase:changed', { phase: `A3_${nextStage}` as GamePhase });
  }
}

export const stateManager = new StateManager();
