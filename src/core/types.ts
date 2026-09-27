export const APP_IDS = ['wechat', 'mail', 'browser', 'explorer', 'notepad', 'photos'] as const;

export type AppId = (typeof APP_IDS)[number];
export type WindowStatus = 'closed' | 'normal' | 'minimized' | 'maximized';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopWindow {
  appId: AppId;
  status: WindowStatus;
  bounds: Bounds;
  restoreBounds: Bounds | null;
  zIndex: number;
}

export interface GameState {
  act: number;
  phase: string;
  flags: Record<string, boolean | string | number>;
  discoveredClueIds: string[];
}

export type GamePhase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'A2_T01' | 'A2_T02' | 'A2_T03' | 'A2_T04' | 'A2_T05' | 'A2_T06' | 'A2_T07' | 'A3_T00' | 'A3_T01' | 'A3_T02' | 'A3_T03' | 'A3_T04' | 'A3_T05' | 'A3_T06';

export interface DesktopState {
  windows: Record<AppId, DesktopWindow>;
  activeAppId: AppId | null;
  openedOnceAppIds: AppId[];
}

export interface SettingsState {
  reducedMotion: boolean;
}

export interface MailState {
  readIds: string[];
  starredIds: string[];
}

export interface BrowserState {
  queryHistory: string[];
  visitedPageIds: string[];
}

export interface NotepadState {
  userText: string;
  autoEntryIds: string[];
}

export interface SceneState {
  journeyStarted: boolean;
  currentSceneId: string | null;
  visitedSceneIds: string[];
  inspectedHotspotIds: string[];
  capturedPhotoIds: string[];
}

export interface PhotosState {
  activePhotoId: string | null;
  openedPhotoIds: string[];
  adjustments: Record<string, { exposure: number; shadows: number; contrast: number }>;
  zoomByPhotoId: Record<string, number>;
  inspectedSymbolPhotoIds: string[];
}

export interface StoryTransitionsState { seenIds: string[] }

export interface AppState {
  schemaVersion: 7;
  game: GameState;
  desktop: DesktopState;
  settings: SettingsState;
  modules: {
    mail: MailState;
    browser: BrowserState;
    notepad: NotepadState;
    scene: SceneState;
    photos: PhotosState;
    act2Research: Act2ResearchState;
    act3: Act3State;
    storyTransitions: StoryTransitionsState;
  };
}

export type Act2Stage = 'inactive' | 'search' | 'bridge' | 'library' | 'tales' | 'school' | 'qiming' | 'finale';

export type Act2ActiveStage = Exclude<Act2Stage, 'inactive' | 'school' | 'qiming' | 'finale'>;

/** 第三幕已实现的调查阶段。 */
export type Act3Stage = 'inactive' | 'T00' | 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06';

export const ACT2_SCHOOL_AREA_IDS = ['AREA_A2_T05_GATE', 'AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_XIAOYUE_CLASSROOM', 'AREA_A2_T05_RESTROOM_APPROACH', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE', 'AREA_A2_T05_NOTICE_BOARD'] as const;
export const ACT2_SCHOOL_HOTSPOT_IDS = ['HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_QIMING_TEXT', 'HOTSPOT_A2_T05_SCHOLAR_NOTE'] as const;
export interface Act2SchoolState { visitedAreaIds: string[]; inspectedHotspotIds: string[] }

/** T07 只保存可恢复的语义进度：已看资料、实际播放覆盖的片段、有效截图与已比对帧。 */
export interface Act2T07State {
  viewedMaterialIds: string[];
  playedSegmentIds: string[];
  capturedFrameIds: string[];
  comparedFrameIds: string[];
}

export type HeibumuNamePart = 'first' | 'middle' | 'last';

/** 第二幕 T02 只允许复用第一幕破庙现场的三张证据图。 */
export const ACT2_EVIDENCE_ASSET_IDS = ['IMG_A1_I_001', 'IMG_A1_I_002', 'IMG_A1_I_003'] as const;

export const isAct2EvidenceAssetId = (assetId: string): boolean => ACT2_EVIDENCE_ASSET_IDS.some((id) => id === assetId);

export interface Act2ResearchState {
  stage: Act2Stage;
  bridge: {
    talkedElderIds: string[];
    shownEvidenceAssetIds: string[];
    heardPhrase: boolean;
    nameChoices: { first: string | null; middle: string | null; last: string | null };
  };
  library: {
    visitedSectionIds: string[];
    openedVolumeIds: string[];
    currentPageId: string | null;
    bookmarkedPageIds: string[];
    markedKeywordIds: string[];
    excerptedEntryIds: string[];
  };
  tales: {
    readTaleIds: string[];
    collectedTaleIds: string[];
    placedCardIds: string[];
    sorted: boolean;
    inferenceAcknowledged: boolean;
  };
  school: Act2SchoolState;
  t07: Act2T07State;
}

/** 第三幕镜头调查通用状态。currentLensId 由 T00 写入为 'LENS_A3_T00_001'。 */
export interface Act3State {
  stage: Act3Stage;
  /** 当前镜头 ID；切换只在确认进入 T 时重置。 */
  currentLensId: string | null;
  /** 已访问过的镜头 ID，重载后用于按需预载与回看。 */
  visitedLensIds: string[];
  /** 已检视过的线索 ID。 */
  inspectedClueIds: string[];
  /** 玩家已主动确认的对应阶段结论 Flag 名。 */
  confirmedFlagIds: string[];
}

/** 第三幕关卡内的镜头定义。 */
export interface Act3Lens {
  id: string;
  /** 同一镜头标题；保持地点与朝向。 */
  title: string;
  /** 站位描述（看向/靠近/蹲下）。 */
  stance: 'look' | 'approach' | 'crouch' | 'enter';
  /** 镜头对应的资源 ID；图片未接入时仍保留稳定 ID。 */
  assetId: string;
  /** 镜头场景文本；不放入谜底。 */
  description: string;
  /** 镜头上可点选的热点：写为线索 ID + 可见动作标签。 */
  hotspots: Act3Hotspot[];
  /** 邻近镜头的 ID（沿同一站位/朝向）。 */
  links: string[];
  /** 进入此镜头前必须检视的线索；未满足时路线保持可见但不可进入。 */
  requiresClueIds?: string[];
}

export interface Act3Hotspot {
  clueId: string;
  /** 显示动作标签：看向、靠近、蹲下、检查、比对、收集、确认。 */
  label: string;
}

/** 第三幕场景内的事件支持。 */
export type Act3ActiveStage = Exclude<Act3Stage, 'inactive'>;

export const ACT3_PHASE_FOR_STAGE: Record<Act3ActiveStage, GamePhase> = {
  T00: 'A3_T00',
  T01: 'A3_T01',
  T02: 'A3_T02',
  T03: 'A3_T03',
  T04: 'A3_T04',
  T05: 'A3_T05',
  T06: 'A3_T06',
};

export type AnchaoEventMap = {
  'app:opened': { appId: AppId };
  'app:closed': { appId: AppId };
  'window:focused': { appId: AppId };
  'flag:changed': { flagId: string; value: boolean | string | number };
  'phase:changed': { phase: GamePhase };
  'chat:opened': { contactId: string };
  'mail:opened': { mailId: string };
  'browser:searched': { query: string };
  'browser:page-opened': { pageId: string };
  'notepad:auto-entry-added': { entryId: string };
  'journey:started': { sceneId: string };
  'scene:entered': { sceneId: string };
  'scene:hotspot-inspected': { hotspotId: string };
  'scene:photo-captured': { sceneId: string; photoId: string };
  'journey:finished': { lastSceneId: string };
  'photo:editor-opened': { photoId: string };
  'photo:adjusted': { photoId: string };
  'photo:symbol-inspected': { photoId: string };
  'act2:started': { act: 2 };
  'act2:stage-changed': { stage: Act2ActiveStage };
  'act2:elder-talked': { elderId: string };
  'act2:evidence-shown': { assetId: string };
  'act2:name-solved': { name: string };
  'act2:gazette-section-visited': { sectionId: string };
  'act2:gazette-volume-opened': { volumeId: string };
  'act2:gazette-page-opened': { pageId: string };
  'act2:gazette-keyword-marked': { keywordId: string };
  'act2:gazette-entry-excerpted': { entryId: string };
  'act2:tale-read': { taleId: string };
  'act2:tale-collected': { taleId: string };
  'act2:tale-card-placed': { cardId: string };
  'act2:tales-sorted': Record<string, never>;
  'act2:transfer-inferred': Record<string, never>;
  'act2:school-entered': Record<string, never>;
  'act2:school-area-visited': { areaId: string };
  'act2:school-hotspot-inspected': { hotspotId: string };
  'act2:school-symbol-matched': Record<string, never>;
  'act2:qiming-entered': Record<string, never>;
  'act2:qiming-name-matched': { person: 'huang' | 'zhong' };
  'act2:qiming-cases-confirmed': Record<string, never>;
  'act3:started': { act: 3 };
  'act3:stage-changed': { stage: Act3ActiveStage };
  'act3:lens-entered': { lensId: string };
  'act3:clue-inspected': { clueId: string };
  'act3:stage-confirmed': { flagId: string };
  'act2:t07-entered': Record<string, never>;
  'act2:t07-material-viewed': { materialId: string };
  'act2:t07-frame-captured': { frameId: string };
  'act2:t07-frame-compared': { frameId: string };
  'act2:t07-temple-confirmed': Record<string, never>;
  'act2:t07-location-inferred': Record<string, never>;
  'act2:t07-trip-planned': Record<string, never>;
  'act2:t07-complete': Record<string, never>;
  'progress:reset': { schemaVersion: 7 };
  'save:completed': { schemaVersion: 7 };
};
