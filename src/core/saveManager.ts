import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS, APP_IDS, isAct2EvidenceAssetId, type Act2ResearchState, type Act2Stage, type Act3State, type Act3Stage, type Act4State, type Act4Stage, type AppId, type AppState, type Bounds, type DesktopWindow, type WindowStatus } from './types';
import { createDefaultAct2ResearchState, createDefaultAct3State, createDefaultAct4State, createDefaultState, createDefaultWindow } from './defaultState';
import { birthdayScenes, timeline } from '../data/act4/content';
import { sceneById } from '../data/sceneData';
import { taleById, taleCardById, taleCards } from '../data/act2TalesData';
import { browserPageById, findSearchQuery, isAct2T06Record, ACT2_T06_PAGE_IDS } from '../data/browserData';
import { isStoryTransitionReached, storyTransitions, storyTransitionIds } from '../data/storyTransitionData';
import { act3LensById } from '../data/act3Data';
import { act2T07, ACT2_T07_MATERIAL_IDS, ACT2_T07_SEGMENT_IDS, ACT2_T07_FRAME_IDS } from '../data/act2T07Data';

export const SAVE_KEY = 'anchao.save.v1';
/** schema 1–6 的有效进度迁移到 schema 7。 */
const supportedSchemaVersions = [1, 2, 3, 4, 5, 6, 7, 8];
const validStatuses: WindowStatus[] = ['closed', 'normal', 'minimized', 'maximized'];
const validAct2Stages: Act2Stage[] = ['inactive', 'search', 'bridge', 'library', 'tales', 'school', 'qiming', 'finale'];
const validAct3Stages: Act3Stage[] = ['inactive', 'T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'];

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
  const t07 = isRecord(candidate.t07) ? candidate.t07 : null;
  const nameChoices = bridge && isRecord(bridge.nameChoices) ? bridge.nameChoices : null;
  // 只保留可恢复的语义进度；比对过的帧必须是已经截到的帧。
  const capturedFrameIds = t07 ? safeStringIds(t07.capturedFrameIds).filter((id) => ACT2_T07_FRAME_IDS.includes(id)) : [];
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
    t07: {
      viewedMaterialIds: t07 ? safeStringIds(t07.viewedMaterialIds).filter((id) => ACT2_T07_MATERIAL_IDS.includes(id)) : [],
      playedSegmentIds: t07 ? safeStringIds(t07.playedSegmentIds).filter((id) => ACT2_T07_SEGMENT_IDS.includes(id)) : [],
      capturedFrameIds,
      comparedFrameIds: t07 ? safeStringIds(t07.comparedFrameIds).filter((id) => capturedFrameIds.includes(id)) : [],
    },
  };
};

/** schema 1–6 没有 act3 字段；任何损坏或越界的第三幕字段都回退到默认值，不影响既有进度。 */
const safeAct3 = (candidate: unknown): Act3State => {
  const fallback = createDefaultAct3State();
  if (!isRecord(candidate)) return fallback;
  const stage = validAct3Stages.includes(candidate.stage as Act3Stage) ? candidate.stage as Act3Stage : fallback.stage;
  const visitedLensIds = safeStringIds(candidate.visitedLensIds);
  const inspectedClueIds = safeStringIds(candidate.inspectedClueIds);
  const confirmedFlagIds = safeStringIds(candidate.confirmedFlagIds);
  // 只允许当前阶段已访问的镜头作为 currentLensId；脏数据回退到首镜头或 null。
  const expectedFirstLensId = stage === 'inactive' ? null : `LENS_A3_${stage}_001`;
  const requestedCurrentId = typeof candidate.currentLensId === 'string' && candidate.currentLensId.length > 0 ? candidate.currentLensId : expectedFirstLensId;
  const currentLensId = stage === 'inactive' ? null : (requestedCurrentId && visitedLensIds.includes(requestedCurrentId) && act3LensById(stage, requestedCurrentId) ? requestedCurrentId : expectedFirstLensId);
  return { stage, currentLensId, visitedLensIds, inspectedClueIds, confirmedFlagIds };
};

const act4Stages: Act4Stage[] = ['inactive', 'T01', 'T02', 'T03', 'T04', 'T05'];
const act4PuzzleIds = Array.from({ length: 12 }, (_, index) => `A4_P${String(index + 1).padStart(2, '0')}`);
const safeAct4 = (candidate: unknown, flags: AppState['game']['flags']): Act4State => {
  const fallback = createDefaultAct4State();
  if (!isRecord(candidate) || flags.FLAG_A3_COMPLETE !== true || !act4Stages.includes(candidate.stage as Act4Stage)) return fallback;
  const readNotebookPages = Array.isArray(candidate.readNotebookPages) ? [...new Set(candidate.readNotebookPages.filter((page): page is number => Number.isInteger(page) && page >= 1 && page <= 9))] : [];
  const stage = candidate.stage as Act4Stage;
  const stageNumber = stage === 'inactive' ? 0 : Number(stage.slice(1));
  const puzzleStageNumber = (id: string) => { const n = Number(id.slice(-2)); return n <= 3 ? 1 : n <= 5 ? 2 : n <= 8 ? 3 : n <= 10 ? 4 : 5; };
  const solvedPuzzleIds = safeStringIds(candidate.solvedPuzzleIds).filter((id) => act4PuzzleIds.includes(id) && puzzleStageNumber(id) <= stageNumber);
  const requiredByStage: Record<Act4Stage, string[]> = { inactive: [], T01: [], T02: ['A4_P01'], T03: ['A4_P01', 'A4_P04'], T04: ['A4_P01', 'A4_P04', 'A4_P06'], T05: ['A4_P01', 'A4_P04', 'A4_P06', 'A4_P09'] };
  if (!requiredByStage[stage].every((id) => solvedPuzzleIds.includes(id))) return fallback;
  const unlockedAccountIds = solvedPuzzleIds.includes('A4_P04') ? safeStringIds(candidate.unlockedAccountIds).filter((id) => ['weibo', 'mail'].includes(id)) : [];
  if (stageNumber >= 3 && unlockedAccountIds.length !== 2) return fallback;
  const checkedMailRecipients = safeStringIds(candidate.checkedMailRecipients).filter((id) => ['protagonist', 'xiaoyue'].includes(id));
  const timelineReadDates = safeStringIds(candidate.timelineReadDates).filter((date) => timeline.some(([id]) => id === date));
  const birthdayNodeId = stage === 'T05' && birthdayScenes.some((scene) => scene.id === candidate.birthdayNodeId) && (candidate.birthdayNodeId !== 'taken' || solvedPuzzleIds.includes('A4_P11')) ? candidate.birthdayNodeId as string : 'study';
  return { stage, readNotebookPages, solvedPuzzleIds, unlockedAccountIds, checkedMailRecipients, timelineReadDates, viewedWakeMail: candidate.viewedWakeMail === true && stage === 'T04', wakePaperConfirmed: solvedPuzzleIds.includes('A4_P09') && candidate.wakePaperConfirmed === true, birthdayNodeId };
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
  let act3 = safeAct3(modules.act3);
  const rawFlags = isRecord(game.flags)
    ? Object.fromEntries(Object.entries(game.flags).filter(([, value]) => ['boolean', 'string', 'number'].includes(typeof value))) as AppState['game']['flags']
    : {};
  let act4 = safeAct4(modules.act4, rawFlags);
  if (act4.stage !== 'inactive') {
    const stageNumber = Number(act4.stage.slice(1));
    for (let index = 1; index < stageNumber; index++) if (rawFlags[`FLAG_A4_T${String(index).padStart(2, '0')}_COMPLETE`] !== true) act4 = createDefaultAct4State();
  }
  if (act4.stage === 'inactive') {
    for (const key of Object.keys(rawFlags)) if (/^FLAG_A4_/.test(key)) delete rawFlags[key];
  } else {
    for (let index = 1; index <= 5; index++) {
      const id = `FLAG_A4_T${String(index).padStart(2, '0')}_COMPLETE`;
      if (rawFlags[id] === true && !act4.solvedPuzzleIds.includes(`A4_P${String([1, 4, 6, 9, 11][index - 1]).padStart(2, '0')}`)) delete rawFlags[id];
    }
    if (act4.birthdayNodeId !== 'taken') delete rawFlags.FLAG_A4_T05_COMPLETE;
  }
  const t05FlagIds = ['FLAG_A2_SCHOOL_ENTERED', 'FLAG_A2_FIRE_HYDRANT_SEEN', 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'FLAG_A2_SCORE_CHANGE_KNOWN', 'FLAG_A2_QIMING_NAME_FOUND', 'FLAG_A2_SCHOOL_SS_FOUND', 'FLAG_A2_SS_MATCH_CONFIRMED'];
  const t06FlagIds = ['FLAG_A2_QIMING_OFFICIAL_FOUND', 'FLAG_A2_QIMING_TESTIMONIALS_READ', 'FLAG_A2_QIMING_FORUM_FOUND', 'FLAG_A2_HUANG_MATCH_INFERRED', 'FLAG_A2_ZHONG_MATCH_INFERRED', 'FLAG_A2_OTHER_CASES_ABNORMAL'];
  const t07FlagIds = ['FLAG_A2_PROMO_VIDEO_FOUND', 'FLAG_A2_PROMO_VIDEO_WATCHED', 'FLAG_A2_PROMO_PHOTO_SS_FOUND', 'FLAG_A2_TEMPLE_FRAME_FOUND', 'FLAG_A2_QIMING_LOCATION_INFERRED', 'FLAG_A2_SECOND_TRIP_PLANNED', 'FLAG_A2_COMPLETE'];
  for (const flagId of [...t05FlagIds, ...t06FlagIds, ...t07FlagIds]) if (rawFlags[flagId] !== true && rawFlags[flagId] !== false) delete rawFlags[flagId];
  const schoolPrerequisitesValid = rawFlags.FLAG_A2_SCHOOL_ENTERED === true && rawFlags.FLAG_A2_TRANSFER_RULE_INFERRED === true;
  // T07 阶段同样保留 T06 已完成的进度；不合格时退回 qiming。
  const act2StageWasFinale = act2Research.stage === 'finale';
  let qimingStageValid = (act2Research.stage === 'qiming' || act2StageWasFinale) && schoolPrerequisitesValid && rawFlags.FLAG_A2_SS_MATCH_CONFIRMED === true;
  if ((act2Research.stage === 'qiming' || act2StageWasFinale) && !qimingStageValid) act2Research.stage = schoolPrerequisitesValid ? 'school' : 'tales';
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
  // T07：只有在 T06 收束后进入的阶段才保留 T07 语义进度与 Flag。
  let t07StageValid = act2Research.stage === 'finale' && rawFlags.FLAG_A2_OTHER_CASES_ABNORMAL === true;
  if (act2Research.stage === 'finale' && !t07StageValid) act2Research.stage = 'qiming';
  if (!t07StageValid) {
    act2Research.t07 = { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], comparedFrameIds: [] };
    for (const flagId of t07FlagIds) delete rawFlags[flagId];
  } else {
    const t07 = act2Research.t07;
    if (rawFlags.FLAG_A2_PROMO_VIDEO_FOUND === true && !t07.viewedMaterialIds.includes(act2T07.video.materialId)) delete rawFlags.FLAG_A2_PROMO_VIDEO_FOUND;
    if (rawFlags.FLAG_A2_PROMO_VIDEO_WATCHED === true && (rawFlags.FLAG_A2_PROMO_VIDEO_FOUND !== true || !act2T07.video.requiredSegmentIds.every((id) => t07.playedSegmentIds.includes(id)))) delete rawFlags.FLAG_A2_PROMO_VIDEO_WATCHED;
    if (rawFlags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true && !t07.viewedMaterialIds.includes(act2T07.photoMaterialId)) delete rawFlags.FLAG_A2_PROMO_PHOTO_SS_FOUND;
    if (rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND === true && t07.comparedFrameIds.length === 0) delete rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND;
    if (rawFlags.FLAG_A2_QIMING_LOCATION_INFERRED === true && !(rawFlags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true && rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND === true && rawFlags.FLAG_A2_PROMO_VIDEO_WATCHED === true)) delete rawFlags.FLAG_A2_QIMING_LOCATION_INFERRED;
    if (rawFlags.FLAG_A2_SECOND_TRIP_PLANNED === true && rawFlags.FLAG_A2_QIMING_LOCATION_INFERRED !== true) delete rawFlags.FLAG_A2_SECOND_TRIP_PLANNED;
    if (rawFlags.FLAG_A2_COMPLETE === true && rawFlags.FLAG_A2_SECOND_TRIP_PLANNED !== true) delete rawFlags.FLAG_A2_COMPLETE;
  }
  if (act3.stage !== 'inactive' && (rawFlags.FLAG_A2_COMPLETE !== true
    || (act3.stage === 'T01' && rawFlags.FLAG_A3_GATE_REACHED !== true)
    || (act3.stage === 'T02' && rawFlags.FLAG_A3_INNER_FENCE_PASSED !== true)
    || (act3.stage === 'T03' && rawFlags.FLAG_A3_CLASSROOM_TURNED !== true)
    || (act3.stage === 'T04' && rawFlags.FLAG_A3_STAIRS_DESCENDED !== true)
    || (act3.stage === 'T05' && rawFlags.FLAG_A3_BROADCAST_DOOR_REACHED !== true)
    || (act3.stage === 'T06' && rawFlags.FLAG_A3_KITCHEN_DOOR_REACHED !== true)
    || (act3.stage === 'T07' && rawFlags.FLAG_A3_KITCHEN_EXITED !== true))) {
    act3 = createDefaultAct3State();
  }
  const rawQueryHistory = browser ? safeStringIds(browser.queryHistory).slice(0, 20) : [];
  const queryHistory = rawQueryHistory.filter((query) => {
    const definition = findSearchQuery(query);
    return !definition || !isAct2T06Record(definition) || qimingStageValid;
  });
  const hydratedPhase = typeof game.phase === 'string' ? game.phase : fallback.game.phase;
  const phaseForStage: Partial<Record<Act2Stage, string>> = {
    search: 'A2_T01', bridge: 'A2_T02', library: 'A2_T03', tales: 'A2_T04', school: 'A2_T05', qiming: 'A2_T06', finale: 'A2_T07',
  };
  const safePhase = act4.stage !== 'inactive' ? `A4_${act4.stage}` as AppState['game']['phase'] : act3.stage !== 'inactive' ? `A3_${act3.stage}` as AppState['game']['phase'] : phaseForStage[act2Research.stage] ?? (
    hydratedPhase.startsWith('A2_T') || hydratedPhase.startsWith('A4_T') ? fallback.game.phase : hydratedPhase
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
      NOTE_A2_T07_001: 'FLAG_A2_PROMO_PHOTO_SS_FOUND',
      NOTE_A2_T07_002: 'FLAG_A2_TEMPLE_FRAME_FOUND',
      NOTE_A2_T07_003: 'FLAG_A2_QIMING_LOCATION_INFERRED',
      NOTE_A2_T07_004: 'FLAG_A2_SECOND_TRIP_PLANNED',
      NOTE_A3_T03_001: 'FLAG_A3_CONFINEMENT_SITE_CONFIRMED',
      NOTE_A3_T04_001: 'FLAG_A3_VVAKE_PAPER_FOUND',
      NOTE_A3_T05_001: 'FLAG_A3_13ACK_PAPER_FOUND',
      NOTE_A3_T06_001: 'FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED',
      NOTE_A3_T07_001: 'FLAG_A3_NOTEBOOK_FOUND',
    };
    const triggerFlag = triggerFlagByNote[id];
    if (id === 'NOTE_A2_T06_003') return rawFlags.FLAG_A2_HUANG_MATCH_INFERRED === true && rawFlags.FLAG_A2_ZHONG_MATCH_INFERRED === true;
    if (id === 'NOTE_A2_T07_003') return rawFlags.FLAG_A2_QIMING_LOCATION_INFERRED === true && rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND === true && rawFlags.FLAG_A2_PROMO_VIDEO_WATCHED === true;
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
    schemaVersion: 8,
    game: {
      act: act4.stage !== 'inactive' ? 4 : act3.stage !== 'inactive' ? 3 : finiteNumber(game.act, fallback.game.act),
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
      act3,
      act4,
      storyTransitions: { seenIds: [] },
    },
  };
  const storyTransitionsCandidate = isRecord(modules.storyTransitions) ? modules.storyTransitions : null;
  hydrated.modules.storyTransitions.seenIds = (candidate.schemaVersion as number) >= 6
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
