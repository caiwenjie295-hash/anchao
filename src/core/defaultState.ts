import { APP_IDS, type Act2ResearchState, type Act3State, type AppId, type AppState, type Bounds, type DesktopWindow } from './types';
import { initiallyStarredMailIds } from '../data/mailData';

const initialBounds: Record<AppId, Bounds> = {
  wechat: { x: 120, y: 70, width: 760, height: 530 },
  mail: { x: 180, y: 88, width: 800, height: 550 },
  browser: { x: 230, y: 64, width: 860, height: 560 },
  explorer: { x: 150, y: 105, width: 770, height: 510 },
  notepad: { x: 290, y: 130, width: 620, height: 460 },
  photos: { x: 250, y: 100, width: 720, height: 500 },
};

const cloneBounds = (bounds: Bounds): Bounds => ({ ...bounds });

export const createDefaultWindow = (appId: AppId, zIndex: number): DesktopWindow => ({
  appId,
  status: 'closed',
  bounds: cloneBounds(initialBounds[appId]),
  restoreBounds: null,
  zIndex,
});

export const createDefaultAct2ResearchState = (): Act2ResearchState => ({
  stage: 'inactive',
  bridge: {
    talkedElderIds: [],
    shownEvidenceAssetIds: [],
    heardPhrase: false,
    nameChoices: { first: null, middle: null, last: null },
  },
  library: {
    visitedSectionIds: [],
    openedVolumeIds: [],
    currentPageId: null,
    bookmarkedPageIds: [],
    markedKeywordIds: [],
    excerptedEntryIds: [],
  },
  tales: {
    readTaleIds: [],
    collectedTaleIds: [],
    placedCardIds: [],
    sorted: false,
    inferenceAcknowledged: false,
  },
  school: { visitedAreaIds: [], inspectedHotspotIds: [] },
  t07: { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], comparedFrameIds: [] },
});

export const createDefaultAct3State = (): Act3State => ({
  stage: 'inactive',
  currentLensId: null,
  visitedLensIds: [],
  inspectedClueIds: [],
  confirmedFlagIds: [],
});

export const createDefaultState = (): AppState => ({
  schemaVersion: 7,
  game: { act: 1, phase: 'A', flags: {}, discoveredClueIds: [] },
  desktop: {
    windows: Object.fromEntries(APP_IDS.map((appId, index) => [appId, createDefaultWindow(appId, index + 1)])) as Record<AppId, DesktopWindow>,
    activeAppId: null,
    openedOnceAppIds: [],
  },
  settings: { reducedMotion: false },
  modules: {
    mail: { readIds: [], starredIds: [...initiallyStarredMailIds] },
    browser: { queryHistory: [], visitedPageIds: [] },
    notepad: { userText: '', autoEntryIds: [] },
    scene: { journeyStarted: false, currentSceneId: null, visitedSceneIds: [], inspectedHotspotIds: [], capturedPhotoIds: [] },
    photos: { activePhotoId: null, openedPhotoIds: [], adjustments: {}, zoomByPhotoId: {}, inspectedSymbolPhotoIds: [] },
    act2Research: createDefaultAct2ResearchState(),
    act3: createDefaultAct3State(),
    storyTransitions: { seenIds: [] },
  },
});
