import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS, APP_IDS, isAct2EvidenceAssetId, type Act2ResearchState, type Act2Stage, type AppId, type AppState, type Bounds, type DesktopWindow, type WindowStatus } from './types';
import { createDefaultAct2ResearchState, createDefaultState, createDefaultWindow } from './defaultState';
import { sceneById } from '../data/sceneData';
import { taleById, taleCardById, taleCards } from '../data/act2TalesData';
import { browserPageById, findSearchQuery, isAct2T06Record, ACT2_T06_PAGE_IDS } from '../data/browserData';
import { isStoryTransitionReached, storyTransitions, storyTransitionIds } from '../data/storyTransitionData';

export const SAVE_KEY = 'anchao.save.v1';
/** schema 1–5 的有效进度全部迁移到 schema 6。 */
const supportedSchemaVersions = [1, 2, 3, 4, 5, 6];
const validStatuses: WindowStatus[] = ['closed', 'normal', 'minimized', 'maximized'];
const validAct2Stages: Act2Stage[] = ['inactive', 'search', 'bridge', 'library', 'tales', 'school', 'qiming'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finiteNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const safeStringIds = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))]
  : [];
const safeBounds = (candidate: unknown, fallback: Bounds): Bounds => {
  if (!isRecord(candidate)) return { ...fallback };
  return {
    x: finiteNumber(candidate.x, fallback.x),
    y: finiteNumber(candidate.y, fallback.y),
    width: Math.max(320, finiteNumber(candidate.width, fallback.width)),
    height: Math.max(240, finiteNumber(candidate.height, fallback.height)),
  };
};

const safeWindow = (appId: AppId, candidate: unknown, index: number): DesktopWindow => {
  const fallback = createDefaultWindow(appId, index + 1);
  if (!isRecord(candidate)) return fallback;
  const restoreBounds = candidate.restoreBounds === null ? null : safeBounds(candidate.restoreBounds, fallback.bounds);
  return {
    appId,
    status: validStatuses.includes(candidate.status as WindowStatus) ? candidate.status as WindowStatus : fallback.status,
    bounds: safeBounds(candidate.bounds, fallback.bounds),
    restoreBounds,
    zIndex: Math.max(1, finiteNumber(candidate.zIndex, fallback.zIndex)),
  };
};

const safeNameChoice = (value: unknown): string | null => typeof value === 'string' && value.trim().length > 0 ? value : null;

/** schema 1 存档没有第二幕字段；任何损坏或越界的第二幕字段都回退到默认值，不影响第一幕进度。 */
const safeAct2Research = (candidate: unknown): Act2ResearchState => {
  const fallback = createDefaultAct2ResearchState();
  if (!isRecord(candidate)) return fallback;
  const bridge = isRecord(candidate.bridge) ? candidate.bridge : null;
  const library = isRecord(candidate.library) ? candidate.library : null;
  const tales = isRecord(candidate.tales) ? candidate.tales : null;
  const school = isRecord(candidate.school) ? candidate.school : null;
  const nameChoices = bridge && isRecord(bridge.nameChoices) ? bridge.nameChoices : null;
  const readTaleIds = tales ? safeStringIds(tales.readTaleIds).filter((id) => taleById.has(id)) : [];
  const collectedTaleIds = tales ? safeStringIds(tales.collectedTaleIds).filter((id) => readTaleIds.includes(id)) : [];
  const placedCardIds = tales ? safeStringIds(tales.placedCardIds).filter((id) => taleCardById.has(id)) : [];
  const sorted = tales?.sorted === true && placedCardIds.length === taleCards.length;
  return {
    stage: validAct2Stages.includes(candidate.stage as Act2Stage) ? candidate.stage as Act2Stage : fallback.stage,
    bridge: {
      talkedElderIds: bridge ? safeStringIds(bridge.talkedElderIds) : [],
      shownEvidenceAssetIds: bridge ? safeStringIds(bridge.shownEvidenceAssetIds).filter((assetId) => isAct2EvidenceAssetId(assetId)) : [],
      heardPhrase: bridge?.heardPhrase === true,
      nameChoices: {
        first: nameChoices ? safeNameChoice(nameChoices.first) : null,
        middle: nameChoices ? safeNameChoice(nameChoices.middle) : null,
        last: nameChoices ? safeNameChoice(nameChoices.last) : null,
      },
    },
    library: {
      visitedSectionIds: library ? safeStringIds(library.visitedSectionIds) : [],
      openedVolumeIds: library ? safeStringIds(library.openedVolumeIds) : [],
      currentPageId: library && typeof library.currentPageId === 'string' && library.currentPageId.length > 0 ? library.currentPageId : null,
      bookmarkedPageIds: library ? safeStringIds(library.bookmarkedPageIds) : [],
      markedKeywordIds: library ? safeStringIds(library.markedKeywordIds) : [],
      excerptedEntryIds: library ? safeStringIds(library.excerptedEntryIds) : [],
    },
    tales: {
      readTaleIds,
      collectedTaleIds,
      placedCardIds,
      sorted,
      inferenceAcknowledged: sorted && tales?.inferenceAcknowledged === true,
    },
    school: {
      visitedAreaIds: school ? safeStringIds(school.visitedAreaIds).filter((id) => ACT2_SCHOOL_AREA_IDS.includes(id as (typeof ACT2_SCHOOL_AREA_IDS)[number])) : [],
      inspectedHotspotIds: school ? safeStringIds(school.inspectedHotspotIds).filter((id) => ACT2_SCHOOL_HOTSPOT_IDS.includes(id as (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number])) : [],
    },
  };
};

export const hydrateState = (candidate: unknown): AppState => {
  const fallback = createDefaultState();
  if (!isRecord(candidate) || !supportedSchemaVersions.includes(candidate.schemaVersion as number)) return fallback;
  const game = isRecord(candidate.game) ? candidate.game : {};
  const desktop = isRecord(candidate.desktop) ? candidate.desktop : {};
  const settings = isRecord(candidate.settings) ? candidate.settings : {};
  const modules = isRecord(candidate.modules) ? candidate.modules : {};
  const mail = isRecord(modules.mail) ? modules.mail : null;
  const browser = isRecord(modules.browser) ? modules.browser : null;
  const notepad = isRecord(modules.notepad) ? modules.notepad : null;
  const scene = isRecord(modules.scene) ? modules.scene : null;
  const photos = isRecord(modules.photos) ? modules.photos : null;
  const act2Research = safeAct2Research(modules.act2Research);
  const rawFlags = isRecord(game.flags)
    ? Object.fromEntries(Object.entries(game.flags).filter(([, value]) => ['boolean', 'string', 'number'].includes(typeof value))) as AppState['game']['flags']
    : {};
  const t05FlagIds = ['FLAG_A2_SCHOOL_ENTERED', 'FLAG_A2_FIRE_HYDRANT_SEEN', 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'FLAG_A2_SCORE_CHANGE_KNOWN', 'FLAG_A2_QIMING_NAME_FOUND', 'FLAG_A2_SCHOOL_SS_FOUND', 'FLAG_A2_SS_MATCH_CONFIRMED'];
  const t06FlagIds = ['FLAG_A2_QIMING_OFFICIAL_FOUND', 'FLAG_A2_QIMING_TESTIMONIALS_READ', 'FLAG_A2_QIMING_FORUM_FOUND', 'FLAG_A2_HUANG_MATCH_INFERRED', 'FLAG_A2_ZHONG_MATCH_INFERRED', 'FLAG_A2_OTHER_CASES_ABNORMAL'];
  for (const flagId of [...t05FlagIds, ...t06FlagIds]) if (rawFlags[flagId] !== true && rawFlags[flagId] !== false) delete rawFlags[flagId];
  const schoolPrerequisitesValid = rawFlags.FLAG_A2_SCHOOL_ENTERED === true && rawFlags.FLAG_A2_TRANSFER_RULE_INFERRED === true;
  let qimingStageValid = act2Research.stage === 'qiming' && schoolPrerequisitesValid && rawFlags.FLAG_A2_SS_MATCH_CONFIRMED === true;
  if (act2Research.stage === 'qiming' && !qimingStageValid) act2Research.stage = schoolPrerequisitesValid ? 'school' : 'tales';
  if (act2Research.stage === 'school' && !schoolPrerequisitesValid) act2Research.stage = 'tales';
  let schoolStageValid = (act2Research.stage === 'school' || qimingStageValid) && schoolPrerequisitesValid;
  const t05Dependencies: [string, string][] = [
    ['FLAG_A2_FIRE_HYDRANT_SEEN', 'FLAG_A2_SCHOOL_ENTERED'],
    ['FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'FLAG_A2_SCHOOL_ENTERED'],
    ['FLAG_A2_SCORE_CHANGE_KNOWN', 'FLAG_A2_SCHOOL_ENTERED'],
    ['FLAG_A2_QIMING_NAME_FOUND', 'FLAG_A2_SCORE_CHANGE_KNOWN'],
    ['FLAG_A2_SCHOOL_SS_FOUND', 'FLAG_A2_SCHOOL_ENTERED'],
    ['FLAG_A2_SS_MATCH_CONFIRMED', 'FLAG_A2_SCHOOL_SS_FOUND'],
  ];
  if (!schoolStageValid && !qimingStageValid) for (const flagId of t05FlagIds) delete rawFlags[flagId];
  else for (const [flagId, requiredFlag] of t05Dependencies) if (rawFlags[flagId] === true && rawFlags[requiredFlag] !== true) delete rawFlags[flagId];
  const visitedAreas = act2Research.school.visitedAreaIds;
  const inspectedHotspots = act2Research.school.inspectedHotspotIds;
  const t05EvidenceChecks: [string, boolean][] = [
    ['FLAG_A2_FIRE_HYDRANT_SEEN', visitedAreas.includes('AREA_A2_T05_CORRIDOR')],
    ['FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', inspectedHotspots.includes('HOTSPOT_A2_T05_TEACHER')],
    ['FLAG_A2_SCORE_CHANGE_KNOWN', inspectedHotspots.includes('HOTSPOT_A2_T05_RANKS')],
    ['FLAG_A2_QIMING_NAME_FOUND', inspectedHotspots.includes('HOTSPOT_A2_T05_QIMING_TEXT')],
    ['FLAG_A2_SCHOOL_SS_FOUND', inspectedHotspots.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE')],
    ['FLAG_A2_SS_MATCH_CONFIRMED', inspectedHotspots.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE') && rawFlags.FLAG_A1_SS_FOUND === true],
  ];
  for (const [flagId, evidencePresent] of t05EvidenceChecks) if (rawFlags[flagId] === true && !evidencePresent) delete rawFlags[flagId];
  // Evidence checks may remove a prerequisite after the first pass; close the
  // dependency chain again so no downstream T05 Flag survives without it.
  for (const [flagId, requiredFlag] of t05Dependencies) if (rawFlags[flagId] === true && rawFlags[requiredFlag] !== true) delete rawFlags[flagId];
  if (rawFlags.FLAG_A2_SS_MATCH_CONFIRMED === true && rawFlags.FLAG_A1_SS_FOUND !== true) delete rawFlags.FLAG_A2_SS_MATCH_CONFIRMED;
  if (qimingStageValid && rawFlags.FLAG_A2_SS_MATCH_CONFIRMED !== true) {
    qimingStageValid = false;
    act2Research.stage = schoolPrerequisitesValid ? 'school' : 'tales';
    schoolStageValid = act2Research.stage === 'school' && schoolPrerequisitesValid;
  }
  if (!schoolStageValid && !qimingStageValid) act2Research.school = { visitedAreaIds: [], inspectedHotspotIds: [] };
  const rawVisitedPageIds = browser ? safeStringIds(browser.visitedPageIds).filter((id) => browserPageById.has(id)) : [];
  const validT06VisitedIds = rawVisitedPageIds.filter((id) => ACT2_T06_PAGE_IDS.includes(id));
  const nonT06VisitedIds = rawVisitedPageIds.filter((id) => !id.startsWith('PAGE_A2_T06_'));
  const visitedT06 = qimingStageValid ? validT06VisitedIds : [];
  const setT06 = new Set(visitedT06);
  if (!qimingStageValid) for (const flagId of t06FlagIds) delete rawFlags[flagId];
  const t06Dependencies: [string, boolean][] = [
    ['FLAG_A2_QIMING_OFFICIAL_FOUND', visitedT06.some((id) => ['PAGE_A2_T06_001','PAGE_A2_T06_002','PAGE_A2_T06_003','PAGE_A2_T06_004','PAGE_A2_T06_005'].includes(id))],
    ['FLAG_A2_QIMING_TESTIMONIALS_READ', setT06.has('PAGE_A2_T06_004')],
    ['FLAG_A2_QIMING_FORUM_FOUND', setT06.has('PAGE_A2_T06_006')],
    ['FLAG_A2_HUANG_MATCH_INFERRED', setT06.has('PAGE_A2_T06_004') && setT06.has('PAGE_A2_T06_006')],
    ['FLAG_A2_ZHONG_MATCH_INFERRED', setT06.has('PAGE_A2_T06_004') && setT06.has('PAGE_A2_T06_007')],
    ['FLAG_A2_OTHER_CASES_ABNORMAL', setT06.has('PAGE_A2_T06_008') && setT06.has('PAGE_A2_T06_009')],
  ];
  for (const [flagId, evidencePresent] of t06Dependencies) if (rawFlags[flagId] === true && !evidencePresent) delete rawFlags[flagId];
  if (rawFlags.FLAG_A2_QIMING_OFFICIAL_FOUND !== true) {
    for (const flagId of ['FLAG_A2_QIMING_TESTIMONIALS_READ','FLAG_A2_HUANG_MATCH_INFERRED','FLAG_A2_ZHONG_MATCH_INFERRED','FLAG_A2_OTHER_CASES_ABNORMAL']) delete rawFlags[flagId];
  }
  if (rawFlags.FLAG_A2_QIMING_FORUM_FOUND !== true) for (const flagId of ['FLAG_A2_HUANG_MATCH_INFERRED','FLAG_A2_ZHONG_MATCH_INFERRED','FLAG_A2_OTHER_CASES_ABNORMAL']) delete rawFlags[flagId];
  if (rawFlags.FLAG_A2_HUANG_MATCH_INFERRED !== true || rawFlags.FLAG_A2_ZHONG_MATCH_INFERRED !== true) delete rawFlags.FLAG_A2_OTHER_CASES_ABNORMAL;
  const rawQueryHistory = browser ? safeStringIds(browser.queryHistory).slice(0, 20) : [];
  const queryHistory = rawQueryHistory.filter((query) => {
    const definition = findSearchQuery(query);
    return !definition || !isAct2T06Record(definition) || qimingStageValid;
  });
  const hydratedPhase = typeof game.phase === 'string' ? game.phase : fallback.game.phase;
  const phaseForStage: Partial<Record<Act2Stage, string>> = {
    search: 'A2_T01', bridge: 'A2_T02', library: 'A2_T03', tales: 'A2_T04', school: 'A2_T05', qiming: 'A2_T06',
  };
  const safePhase = phaseForStage[act2Research.stage] ?? (
    hydratedPhase.startsWith('A2_T') ? fallback.game.phase : hydratedPhase
  );
  const autoEntryIds = notepad ? safeStringIds(notepad.autoEntryIds).filter((id) => {
    const triggerFlagByNote: Record<string, string> = {
      NOTE_A2_T05_001: 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN',
      NOTE_A2_T05_002: 'FLAG_A2_SCORE_CHANGE_KNOWN',
      NOTE_A2_T05_003: 'FLAG_A2_QIMING_NAME_FOUND',
      NOTE_A2_T05_004: 'FLAG_A2_SS_MATCH_CONFIRMED',
      NOTE_A2_T06_001: 'FLAG_A2_QIMING_OFFICIAL_FOUND',
      NOTE_A2_T06_002: 'FLAG_A2_QIMING_FORUM_FOUND',
      NOTE_A2_T06_003: 'FLAG_A2_HUANG_MATCH_INFERRED',
      NOTE_A2_T06_004: 'FLAG_A2_OTHER_CASES_ABNORMAL',
    };
    const triggerFlag = triggerFlagByNote[id];
    if (id === 'NOTE_A2_T06_003') return rawFlags.FLAG_A2_HUANG_MATCH_INFERRED === true && rawFlags.FLAG_A2_ZHONG_MATCH_INFERRED === true;
    return triggerFlag === undefined || rawFlags[triggerFlag] === true;
  }) : [];
  const rawWindows = isRecord(desktop.windows) ? desktop.windows : {};
  const windows = Object.fromEntries(APP_IDS.map((appId, index) => [appId, safeWindow(appId, rawWindows[appId], index)])) as AppState['desktop']['windows'];
  const activeAppId = APP_IDS.includes(desktop.activeAppId as AppId) ? desktop.activeAppId as AppId : null;
  const openedOnceAppIds = Array.isArray(desktop.openedOnceAppIds)
    ? desktop.openedOnceAppIds.filter((appId): appId is AppId => APP_IDS.includes(appId as AppId))
    : [];
  const requestedSceneId = scene && typeof scene.currentSceneId === 'string' ? scene.currentSceneId : null;
  const sceneIsValid = requestedSceneId !== null && sceneById.has(requestedSceneId);
  const journeyStarted = scene?.journeyStarted === true && sceneIsValid;
  const hydrated: AppState = {
    schemaVersion: 6,
    game: {
      act: finiteNumber(game.act, fallback.game.act),
      phase: safePhase,
      flags: rawFlags,
      discoveredClueIds: Array.isArray(game.discoveredClueIds) ? game.discoveredClueIds.filter((id): id is string => typeof id === 'string') : [],
    },
    desktop: { windows, activeAppId, openedOnceAppIds },
    settings: { reducedMotion: settings.reducedMotion === true },
    modules: {
      mail: {
        readIds: mail ? safeStringIds(mail.readIds) : [...fallback.modules.mail.readIds],
        starredIds: mail ? safeStringIds(mail.starredIds) : [...fallback.modules.mail.starredIds],
      },
      browser: {
        queryHistory,
        visitedPageIds: [...nonT06VisitedIds, ...visitedT06],
      },
      notepad: {
        userText: notepad && typeof notepad.userText === 'string' ? notepad.userText : '',
        autoEntryIds,
      },
      scene: {
        journeyStarted,
        currentSceneId: journeyStarted ? requestedSceneId : null,
        visitedSceneIds: scene ? safeStringIds(scene.visitedSceneIds).filter((id) => sceneById.has(id)) : [],
        inspectedHotspotIds: scene ? safeStringIds(scene.inspectedHotspotIds) : [],
        capturedPhotoIds: scene ? safeStringIds(scene.capturedPhotoIds) : [],
      },
      photos: {
        activePhotoId: photos && typeof photos.activePhotoId === 'string' ? photos.activePhotoId : null,
        openedPhotoIds: photos ? safeStringIds(photos.openedPhotoIds) : [],
        adjustments: photos && isRecord(photos.adjustments)
          ? Object.fromEntries(Object.entries(photos.adjustments).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1])).map(([id, value]) => [id, {
            exposure: finiteNumber(value.exposure, 0), shadows: finiteNumber(value.shadows, 0), contrast: finiteNumber(value.contrast, 0),
          }]))
          : {},
        zoomByPhotoId: photos && isRecord(photos.zoomByPhotoId)
          ? Object.fromEntries(Object.entries(photos.zoomByPhotoId).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1])).map(([id, value]) => [id, Math.max(1, Math.min(2.5, value))]))
          : {},
        inspectedSymbolPhotoIds: photos ? safeStringIds(photos.inspectedSymbolPhotoIds) : [],
      },
      act2Research,
      storyTransitions: { seenIds: [] },
    },
  };
  const storyTransitionsCandidate = isRecord(modules.storyTransitions) ? modules.storyTransitions : null;
  hydrated.modules.storyTransitions.seenIds = candidate.schemaVersion === 6
    ? safeStringIds(storyTransitionsCandidate?.seenIds).filter((id) => storyTransitionIds.has(id) && isStoryTransitionReached(hydrated, storyTransitions.find((item) => item.id === id)!))
    : storyTransitions.filter((item) => !(safePhase === 'A' && item.id === 'TRANSITION_A1_INTRO') && isStoryTransitionReached(hydrated, item)).map((item) => item.id);
  return hydrated;
};

export const loadState = (storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): AppState => {
  if (!storage) return createDefaultState();
  try {
    const saved = storage.getItem(SAVE_KEY);
    return saved ? hydrateState(JSON.parse(saved)) : createDefaultState();
  } catch {
    return createDefaultState();
  }
};

export const saveState = (state: AppState, storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
