import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS, APP_IDS, isAct2EvidenceAssetId, type Act2ResearchState, type Act2Stage, type Act3State, type Act3Stage, type Act4State, type Act4Stage, type AppId, type AppState, type Bounds, type DesktopWindow, type WindowStatus } from './types';
import { createDefaultAct2ResearchState, createDefaultAct3State, createDefaultAct4State, createDefaultState, createDefaultWindow } from './defaultState';
import { birthdayScenes, timeline } from '../data/act4/content';
import { laterSceneById, laterScenesByStage } from '../data/act4/laterContent';
import { sceneById } from '../data/sceneData';
import { taleById, taleCardById, taleCards, taleEvidenceById } from '../data/act2TalesData';
import { browserPageById, findSearchQuery, isAct2T06Record, ACT2_T06_PAGE_IDS } from '../data/browserData';
import { isStoryTransitionReached, storyTransitions, storyTransitionIds } from '../data/storyTransitionData';
import { act3LensById } from '../data/act3Data';
import { act2T07, ACT2_T07_MATERIAL_IDS, ACT2_T07_SEGMENT_IDS, ACT2_T07_FRAME_IDS } from '../data/act2T07Data';
import { act4NarrativeActionsSatisfied, act4NarrativeStageSequence } from '../story/act4/narrativePolicy';
import { clearAct4ReadingPositions } from './uiPreferences';
import { resolveSaveStorage, type SaveStoragePort } from './persistence/browserStorage';

export const SAVE_KEY = 'anchao.save.v1';
export const SAVE_BACKUP_KEY = 'anchao.save.backup.v1';
export const SAVE_RECOVERY_KEY = 'anchao.save.recovery.v1';
/** schema 1–6 的有效进度迁移到 schema 7。 */
const supportedSchemaVersions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const validStatuses: WindowStatus[] = ['closed', 'normal', 'minimized', 'maximized'];
const validAct2Stages: Act2Stage[] = ['inactive', 'search', 'bridge', 'library', 'tales', 'school', 'qiming', 'finale'];
const validAct3Stages: Act3Stage[] = ['inactive', 'T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'];
const validSavePhases = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', ...Array.from({ length: 7 }, (_, index) => `A2_T${String(index + 1).padStart(2, '0')}`), ...Array.from({ length: 8 }, (_, index) => `A3_T${String(index).padStart(2, '0')}`), ...Array.from({ length: 10 }, (_, index) => `A4_T${String(index + 1).padStart(2, '0')}`)]);

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

export type SaveReadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; state: AppState }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'unsupported-version'; raw: string; version: number }
  | { kind: 'unavailable'; raw?: string };

export type SaveWriteFailureReason =
  | 'storage-unavailable'
  | 'backup-unavailable'
  | 'recovery-required'
  | 'recovery-protection-failed'
  | 'recovery-slot-occupied';

export type SaveWriteResult = { ok: true } | { ok: false; reason: SaveWriteFailureReason; recovery?: Exclude<SaveReadResult, { kind: 'empty' | 'loaded' | 'unavailable' }> };

export type SaveRecoveryWriteOptions = { replaceProtectedOriginal?: boolean; preserveOriginalText?: string };

/** schema 1 存档没有第二幕字段；任何损坏或越界的第二幕字段都回退到默认值，不影响第一幕进度。 */
const safeAct2Research = (candidate: unknown): Act2ResearchState => {
  const fallback = createDefaultAct2ResearchState();
  if (!isRecord(candidate)) return fallback;
  const bridge = isRecord(candidate.bridge) ? candidate.bridge : null;
  const library = isRecord(candidate.library) ? candidate.library : null;
  const tales = isRecord(candidate.tales) ? candidate.tales : null;
  const school = isRecord(candidate.school) ? candidate.school : null;
  const t06 = isRecord(candidate.t06) ? candidate.t06 : null;
  const t07 = isRecord(candidate.t07) ? candidate.t07 : null;
  const nameChoices = bridge && isRecord(bridge.nameChoices) ? bridge.nameChoices : null;
  // 只保留可恢复的语义进度；比对过的帧必须是已经截到的帧。
  const capturedFrameIds = t07 ? safeStringIds(t07.capturedFrameIds).filter((id) => ACT2_T07_FRAME_IDS.includes(id)) : [];
  const rawCapturedTimes = t07 && isRecord(t07.capturedAtMsByFrameId) ? t07.capturedAtMsByFrameId : {};
  const capturedAtMsByFrameId = Object.fromEntries(capturedFrameIds.flatMap((frameId) => {
    const frame = act2T07.video.keyFrames.find((item) => item.id === frameId);
    const time = rawCapturedTimes[frameId];
    return frame && typeof time === 'number' && Number.isFinite(time) && time >= frame.startMs && time <= frame.endMs
      ? [[frameId, time]]
      : [];
  }));
  const comparedFrameIds = t07 ? safeStringIds(t07.comparedFrameIds).filter((id) => capturedFrameIds.includes(id)) : [];
  const rawComparisonFeatureMap = t07 && isRecord(t07.comparisonFeatureIdByFrameId) ? t07.comparisonFeatureIdByFrameId : {};
  const comparisonFeatureIdByFrameId = Object.fromEntries(Object.entries(rawComparisonFeatureMap).filter(([frameId, featureId]) =>
    comparedFrameIds.includes(frameId)
      && act2T07.video.keyFrames.find((frame) => frame.id === frameId)?.supportsExteriorMatch === true
      && featureId === act2T07.comparison.matchFeatureId,
  )) as Record<string, string>;
  const readTaleIds = tales ? safeStringIds(tales.readTaleIds).filter((id) => taleById.has(id)) : [];
  const collectedTaleIds = tales ? safeStringIds(tales.collectedTaleIds).filter((id) => readTaleIds.includes(id)) : [];
  const placedCardIds = tales ? safeStringIds(tales.placedCardIds).filter((id) => taleCardById.has(id)) : [];
  const sorted = tales?.sorted === true && placedCardIds.length === taleCards.length;
  const supportingEvidenceIds = tales ? safeStringIds(tales.supportingEvidenceIds).filter((id) => taleEvidenceById.has(id)) : [];
  const inferenceIds = ['accompanied-change', 'recovery-or-imitation', 'complete-transfer'];
  const selectedInferenceId = typeof tales?.selectedInferenceId === 'string' && inferenceIds.includes(tales.selectedInferenceId) ? tales.selectedInferenceId as 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer' : null;
  const rawReviewedCases = t06 && Array.isArray(t06.reviewedCases) ? t06.reviewedCases.filter(isRecord) : [];
  const reviewedCases = rawReviewedCases.flatMap((review) => {
    const caseId = review.caseId === 'huang' || review.caseId === 'zhong' ? review.caseId : null;
    const expectedPages = caseId === 'huang' ? ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'] : caseId === 'zhong' ? ['PAGE_A2_T06_004', 'PAGE_A2_T06_009'] : null;
    const expectedConclusion = caseId === 'huang' || caseId === 'zhong' ? 'public-claims-and-followup-differ' : null;
    const sourcePageIds = safeStringIds(review.sourcePageIds);
    return caseId !== null && expectedPages && expectedConclusion && review.conclusionId === expectedConclusion
      && sourcePageIds.length === expectedPages.length && expectedPages.every((id) => sourcePageIds.includes(id))
      ? [{ caseId, sourcePageIds: expectedPages, conclusionId: expectedConclusion } as const]
      : [];
  }).filter((review, index, all) => all.findIndex((candidate) => candidate.caseId === review.caseId) === index);
  const evidenceSourceCount = new Set(supportingEvidenceIds.map((id) => taleEvidenceById.get(id)?.taleId).filter(Boolean)).size;
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
      inferenceAcknowledged: tales?.inferenceAcknowledged === true && (sorted || evidenceSourceCount >= 2),
      supportingEvidenceIds,
      selectedInferenceId,
    },
    school: {
      visitedAreaIds: school ? safeStringIds(school.visitedAreaIds).filter((id) => ACT2_SCHOOL_AREA_IDS.includes(id as (typeof ACT2_SCHOOL_AREA_IDS)[number])) : [],
      inspectedHotspotIds: school ? safeStringIds(school.inspectedHotspotIds).filter((id) => ACT2_SCHOOL_HOTSPOT_IDS.includes(id as (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number])) : [],
      selectedEvidenceIds: school ? safeStringIds(school.selectedEvidenceIds).filter((id): id is 'teacher-account' | 'rank-record' | 'qiming-thankyou' => ['teacher-account', 'rank-record', 'qiming-thankyou'].includes(id)) : [],
      selectedInferenceId: school && ['bounded-timeline', 'qiming-caused-change'].includes(String(school.selectedInferenceId)) ? school.selectedInferenceId as 'bounded-timeline' | 'qiming-caused-change' : null,
      symbolMatchConfirmed: school?.symbolMatchConfirmed === true,
    legacyCompletionMigrated: school?.legacyCompletionMigrated === true,
    },
    t06: {
      reviewedCases,
      nicknameAssessment: t06?.nicknameAssessment === 'possible-unverified' || t06?.nicknameAssessment === 'not-enough-evidence' ? t06.nicknameAssessment : null,
      legacyCompletionMigrated: t06?.legacyCompletionMigrated === true,
    },
    t07: {
      viewedMaterialIds: t07 ? safeStringIds(t07.viewedMaterialIds).filter((id) => ACT2_T07_MATERIAL_IDS.includes(id)) : [],
      playedSegmentIds: t07 ? safeStringIds(t07.playedSegmentIds).filter((id) => ACT2_T07_SEGMENT_IDS.includes(id)) : [],
      capturedFrameIds,
      capturedAtMsByFrameId,
      comparedFrameIds,
      comparisonFeatureIdByFrameId,
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

const act4Stages: Act4Stage[] = ['inactive', ...act4NarrativeStageSequence];
const act4PuzzleIds = Array.from({ length: 24 }, (_, index) => `A4_P${String(index + 1).padStart(2, '0')}`);
const safeAct4 = (candidate: unknown, flags: AppState['game']['flags'], sourceSchemaVersion = 11): Act4State => {
  const fallback = createDefaultAct4State();
  if (!isRecord(candidate) || flags.FLAG_A3_COMPLETE !== true || !act4Stages.includes(candidate.stage as Act4Stage)) return fallback;
  const readNotebookPages = Array.isArray(candidate.readNotebookPages) ? [...new Set(candidate.readNotebookPages.filter((page): page is number => Number.isInteger(page) && page >= 1 && page <= 9))] : [];
  const requestedStage = candidate.stage as Act4Stage;
  const requestedNumber = requestedStage === 'inactive' ? 0 : Number(requestedStage.slice(1));
  let stage = requestedStage;
  let number = requestedNumber;
  const puzzleStageNumber = (id: string) => { const n = Number(id.slice(-2)); return n <= 3 ? 1 : n <= 5 ? 2 : n <= 8 ? 3 : n <= 10 ? 4 : n <= 12 ? 5 : n <= 15 ? 6 : n <= 17 ? 7 : n <= 20 ? 8 : n <= 22 ? 9 : 10; };
  const storedPuzzleIds = safeStringIds(candidate.solvedPuzzleIds).filter((id) => act4PuzzleIds.includes(id) && puzzleStageNumber(id) <= requestedNumber);
  const unlockedAccountIds = safeStringIds(candidate.unlockedAccountIds).filter((id) => ['weibo', 'mail'].includes(id));
  const checkedMailRecipients = safeStringIds(candidate.checkedMailRecipients).filter((id) => ['protagonist', 'xiaoyue'].includes(id));
  const timelineReadDates = safeStringIds(candidate.timelineReadDates).filter((date) => timeline.some(([id]) => id === date));
  const broadcastPeriodsConfirmed = safeStringIds(candidate.broadcastPeriodsConfirmed).filter((id): id is 'morning' | 'night' => id === 'morning' || id === 'night');
  if (sourceSchemaVersion < 10 && storedPuzzleIds.includes('A4_P13')) broadcastPeriodsConfirmed.push(...(['morning', 'night'] as const).filter((period) => !broadcastPeriodsConfirmed.includes(period)));
  const birthdayNodeId = birthdayScenes.some((scene) => scene.id === candidate.birthdayNodeId) ? candidate.birthdayNodeId as string : 'study';
  const rawSeenLaterNodeIds = safeStringIds(candidate.seenLaterNodeIds).filter((id) => laterSceneById.has(id));
  const rawLaterNodeId = typeof candidate.laterNodeId === 'string' && laterSceneById.has(candidate.laterNodeId) ? candidate.laterNodeId : null;
  const rawPackageStep = Number.isInteger(candidate.packageStep) ? Math.max(0, Math.min(3, candidate.packageStep as number)) : 0;
  const rawBroadcastIndex = Number.isInteger(candidate.broadcastIndex) ? Math.max(0, Math.min(6, candidate.broadcastIndex as number)) : 0;
  const rawViewedWakeMail = candidate.viewedWakeMail === true;
  const rawFinalMailOpened = candidate.finalMailOpened === true;
  const sectionIds = act4Stages.filter((value): value is Exclude<Act4Stage, 'inactive'> => value !== 'inactive').map((value) => `A4_READ_${value}`);
  const storedSections = sourceSchemaVersion >= 11 ? safeStringIds(candidate.completedNarrativeSectionIds) : [];
  const validActions: Act4State['completedNarrativeActionIds'] = [
    'A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED', 'A4_T08_ARCHIVE_OPENED',
    'A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED', 'A4_T10_FINAL_MAIL_OPENED',
  ];
  const storedActions = sourceSchemaVersion >= 11 ? safeStringIds(candidate.completedNarrativeActionIds).filter((id): id is Act4State['completedNarrativeActionIds'][number] => validActions.includes(id as Act4State['completedNarrativeActionIds'][number])) : [];

  // Old saves represent progress through puzzle/material state and scene visits.
  // Validate those records before migrating flags into the new reading contract.
  const sceneIsReachable = (id: string): boolean => {
    const scene = laterSceneById.get(id);
    if (!scene) return false;
    if (scene.id === 'A4_T06_ROOMMATE' && !['morning', 'night'].every((period) => broadcastPeriodsConfirmed.includes(period as 'morning' | 'night'))) return false;
    if (scene.id === 'A4_T07_KITCHEN' && !storedPuzzleIds.includes('A4_P16')) return false;
    if (scene.id === 'A4_T08_MIRROR' && !storedPuzzleIds.includes('A4_P18')) return false;
    if (scene.id === 'A4_T09_EXIT' && rawPackageStep !== 3) return false;
    if (scene.id === 'A4_T09_BLACKOUT' && rawBroadcastIndex !== 6) return false;
    return true;
  };
  const seenLaterNodeIds: string[] = [];
  for (const narrativeStage of ['T06', 'T07', 'T08', 'T09', 'T10'] as const) {
    if (Number(narrativeStage.slice(1)) > requestedNumber) break;
    for (const scene of laterScenesByStage(narrativeStage)) {
      if (!rawSeenLaterNodeIds.includes(scene.id) || !sceneIsReachable(scene.id)) break;
      seenLaterNodeIds.push(scene.id);
    }
  }
  const requestedLaterNodeId = rawLaterNodeId && seenLaterNodeIds.includes(rawLaterNodeId) ? rawLaterNodeId : null;
  const legacyDoorExitValid = rawPackageStep === 3 && rawBroadcastIndex === 6
    && seenLaterNodeIds.includes('A4_T09_NOTE')
    && seenLaterNodeIds.includes('A4_T09_EXIT')
    && seenLaterNodeIds.includes('A4_T09_BLACKOUT');
  const legacyLoginValid = checkedMailRecipients.includes('protagonist') && checkedMailRecipients.includes('xiaoyue')
    && unlockedAccountIds.includes('weibo') && unlockedAccountIds.includes('mail');
  const legacyWakeMailOpened = rawViewedWakeMail && unlockedAccountIds.includes('mail');
  const legacyArchiveOpened = seenLaterNodeIds.includes('A4_T08_ARCHIVE');
  const legacyFinalMailValid = rawFinalMailOpened;
  const derivedLegacyActions: Act4State['completedNarrativeActionIds'] = [
    ...(legacyLoginValid ? ['A4_T02_LOGIN_SUCCEEDED' as const] : []),
    ...(legacyWakeMailOpened ? ['A4_T04_WAKE_MAIL_OPENED' as const] : []),
    ...(legacyArchiveOpened ? ['A4_T08_ARCHIVE_OPENED' as const] : []),
    ...(rawPackageStep === 3 && seenLaterNodeIds.includes('A4_T09_NOTE') ? ['A4_T09_NOTE_HIDDEN' as const] : []),
    ...(legacyDoorExitValid ? ['A4_T09_DOOR_EXITED' as const] : []),
    ...(legacyFinalMailValid ? ['A4_T10_FINAL_MAIL_OPENED' as const] : []),
  ];
  const validStoredActions = storedActions.filter((id) => {
    if (id === 'A4_T02_LOGIN_SUCCEEDED') return requestedNumber >= 2 && legacyLoginValid;
    if (id === 'A4_T04_WAKE_MAIL_OPENED') return requestedNumber >= 4 && rawViewedWakeMail && unlockedAccountIds.includes('mail');
    if (id === 'A4_T08_ARCHIVE_OPENED') return requestedNumber >= 8;
    if (id === 'A4_T09_NOTE_HIDDEN') return requestedNumber >= 9 && rawPackageStep === 3;
    if (id === 'A4_T09_DOOR_EXITED') return requestedNumber >= 9 && storedActions.includes('A4_T09_NOTE_HIDDEN') && rawBroadcastIndex === 6;
    return id === 'A4_T10_FINAL_MAIL_OPENED' && requestedNumber >= 10 && rawFinalMailOpened;
  });
  const sourceActions = sourceSchemaVersion >= 11 ? validStoredActions : derivedLegacyActions;
  const legacyCompletionEvidence = (index: number): boolean => {
    const puzzle = (id: string) => storedPuzzleIds.includes(id);
    switch (index) {
      case 1: return puzzle('A4_P01');
      case 2: return sourceActions.includes('A4_T02_LOGIN_SUCCEEDED');
      case 3: return puzzle('A4_P06') && timelineReadDates.includes('04-19');
      case 4: return sourceActions.includes('A4_T04_WAKE_MAIL_OPENED') && storedPuzzleIds.includes('A4_P09');
      case 5: return puzzle('A4_P11') && birthdayNodeId === 'taken';
      case 6: return puzzle('A4_P13') && ['morning', 'night'].every((period) => broadcastPeriodsConfirmed.includes(period as 'morning' | 'night')) && seenLaterNodeIds.includes('A4_T06_CONFINEMENT');
      case 7: return puzzle('A4_P16') && seenLaterNodeIds.includes('A4_T07_SCHOOL');
      case 8: return sourceActions.includes('A4_T08_ARCHIVE_OPENED') && storedPuzzleIds.includes('A4_P18') && seenLaterNodeIds.includes('A4_T08_KITCHEN');
      case 9: return sourceActions.includes('A4_T09_NOTE_HIDDEN') && sourceActions.includes('A4_T09_DOOR_EXITED') && legacyDoorExitValid;
      case 10: return sourceActions.includes('A4_T10_FINAL_MAIL_OPENED') && legacyFinalMailValid;
      default: return false;
    }
  };
  const completedNarrativeSectionIds: string[] = [];
  for (let index = 1; index <= requestedNumber; index += 1) {
    const sectionId = sectionIds[index - 1];
    const flagId = `FLAG_A4_T${String(index).padStart(2, '0')}_COMPLETE`;
    const markedComplete = sourceSchemaVersion >= 11
      ? storedSections.includes(sectionId) && flags[flagId] === true
      : flags[flagId] === true && legacyCompletionEvidence(index);
    const requiredActionsValid = act4NarrativeActionsSatisfied(act4NarrativeStageSequence[index - 1], sourceActions);
    const evidenceValid = sourceSchemaVersion >= 11 || legacyCompletionEvidence(index);
    if (!markedComplete || !requiredActionsValid || !evidenceValid) {
      stage = `T${String(index).padStart(2, '0')}` as Act4Stage;
      number = index;
      break;
    }
    completedNarrativeSectionIds.push(sectionId);
  }
  const hasValidCandidateStage = requestedStage !== 'inactive';
  if (hasValidCandidateStage && completedNarrativeSectionIds.length === requestedNumber) {
    stage = requestedStage;
    number = requestedNumber;
  }
  const sectionIdsForStage = completedNarrativeSectionIds.filter((id) => sectionIds.indexOf(id) < number);
  const validCompletedActions = sourceActions.filter((id) => {
    const actionStage: Record<Act4State['completedNarrativeActionIds'][number], number> = {
      A4_T02_LOGIN_SUCCEEDED: 2, A4_T04_WAKE_MAIL_OPENED: 4, A4_T08_ARCHIVE_OPENED: 8,
      A4_T09_NOTE_HIDDEN: 9, A4_T09_DOOR_EXITED: 9, A4_T10_FINAL_MAIL_OPENED: 10,
    };
    return actionStage[id] <= number;
  });
  const effectivePuzzleIds = storedPuzzleIds.filter((id) => puzzleStageNumber(id) <= number);
  const effectiveSeenLaterNodeIds = seenLaterNodeIds.filter((id) => Number(laterSceneById.get(id)!.stage.slice(1)) <= number);
  const effectiveUnlockedAccountIds = number >= 2 && legacyLoginValid ? unlockedAccountIds : [];
  const effectiveCheckedMailRecipients = number >= 2 ? checkedMailRecipients : [];
  const effectiveTimelineReadDates = number >= 3 ? timelineReadDates : [];
  const viewedWakeMail = number >= 4 && validCompletedActions.includes('A4_T04_WAKE_MAIL_OPENED');
  const effectiveBirthdayNodeId = number >= 5 ? birthdayNodeId : 'study';
  const noteHidden = validCompletedActions.includes('A4_T09_NOTE_HIDDEN');
  const doorExited = validCompletedActions.includes('A4_T09_DOOR_EXITED');
  const packageStep = number >= 9 && noteHidden ? rawPackageStep : 0;
  const broadcastIndex = number >= 9 && noteHidden ? Math.min(rawBroadcastIndex, doorExited ? 6 : 5) : 0;
  const finalMailOpened = number >= 10 && validCompletedActions.includes('A4_T10_FINAL_MAIL_OPENED');
  const effectiveLaterNodeId = requestedLaterNodeId && Number(laterSceneById.get(requestedLaterNodeId)!.stage.slice(1)) <= number
    ? requestedLaterNodeId : null;
  return {
    stage,
    completedNarrativeSectionIds: sectionIdsForStage,
    completedNarrativeActionIds: validCompletedActions,
    readNotebookPages: number > 0 ? readNotebookPages : [],
    solvedPuzzleIds: effectivePuzzleIds,
    unlockedAccountIds: effectiveUnlockedAccountIds,
    checkedMailRecipients: effectiveCheckedMailRecipients,
    timelineReadDates: effectiveTimelineReadDates,
    viewedWakeMail,
    wakePaperConfirmed: number >= 4 && candidate.wakePaperConfirmed === true,
    birthdayNodeId: effectiveBirthdayNodeId,
    laterNodeId: effectiveLaterNodeId,
    seenLaterNodeIds: effectiveSeenLaterNodeIds,
    packageStep,
    broadcastIndex,
    broadcastPeriodsConfirmed: number >= 6 ? [...new Set(broadcastPeriodsConfirmed)] : [],
    finalMailOpened,
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
  const candidateSchemaVersion = typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 13;
  const act2Research = safeAct2Research(modules.act2Research);
  let act3 = safeAct3(modules.act3);
  const rawFlags = isRecord(game.flags)
    ? Object.fromEntries(Object.entries(game.flags).filter(([, value]) => ['boolean', 'string', 'number'].includes(typeof value))) as AppState['game']['flags']
    : {};
  const t05FlagIds = ['FLAG_A2_SCHOOL_ENTERED', 'FLAG_A2_FIRE_HYDRANT_SEEN', 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'FLAG_A2_SCORE_CHANGE_KNOWN', 'FLAG_A2_QIMING_NAME_FOUND', 'FLAG_A2_SCHOOL_SS_FOUND', 'FLAG_A2_SS_MATCH_CONFIRMED'];
  const t06FlagIds = ['FLAG_A2_QIMING_OFFICIAL_FOUND', 'FLAG_A2_QIMING_TESTIMONIALS_READ', 'FLAG_A2_QIMING_FORUM_FOUND', 'FLAG_A2_HUANG_MATCH_INFERRED', 'FLAG_A2_ZHONG_MATCH_INFERRED', 'FLAG_A2_OTHER_CASES_ABNORMAL'];
  const t07FlagIds = ['FLAG_A2_PROMO_VIDEO_FOUND', 'FLAG_A2_PROMO_VIDEO_WATCHED', 'FLAG_A2_PROMO_PHOTO_SS_FOUND', 'FLAG_A2_TEMPLE_FRAME_FOUND', 'FLAG_A2_QIMING_LOCATION_INFERRED', 'FLAG_A2_SECOND_TRIP_PLANNED', 'FLAG_A2_COMPLETE'];
  for (const flagId of [...t05FlagIds, ...t06FlagIds, ...t07FlagIds]) if (rawFlags[flagId] !== true && rawFlags[flagId] !== false) delete rawFlags[flagId];
  const schoolPrerequisitesValid = rawFlags.FLAG_A2_SCHOOL_ENTERED === true && rawFlags.FLAG_A2_TRANSFER_RULE_INFERRED === true;
  // 审查 P1：schema 9 的学校完成事实在旧规则下已核实。迁移时把该事实持久化，
  // 否则首次载入虽然放行，保存后的第二次载入会按新门槛把它清掉。
  // 只在旧存档本就带该 Flag、且证据前提成立时记录，不补写任何新证据选择。
  const legacySchoolCompletion = candidateSchemaVersion < 10
    && rawFlags.FLAG_A2_SS_MATCH_CONFIRMED === true
    && rawFlags.FLAG_A1_SS_FOUND === true
    && act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE');
  if (legacySchoolCompletion) act2Research.school.legacyCompletionMigrated = true;
  const schoolCompletionFactsValid = act2Research.school.symbolMatchConfirmed
    && act2Research.school.selectedEvidenceIds.length >= 2
    && act2Research.school.selectedInferenceId === 'bounded-timeline';
  const schoolCompletionAccepted = schoolCompletionFactsValid || act2Research.school.legacyCompletionMigrated;
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
    ['FLAG_A2_SS_MATCH_CONFIRMED', inspectedHotspots.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE') && rawFlags.FLAG_A1_SS_FOUND === true && (candidateSchemaVersion < 10 || schoolCompletionAccepted)],
  ];
  for (const [flagId, evidencePresent] of t05EvidenceChecks) if (rawFlags[flagId] === true && !evidencePresent) delete rawFlags[flagId];
  // Evidence checks may remove a prerequisite after the first pass; close the
  // dependency chain again so no downstream T05 Flag survives without it.
  for (const [flagId, requiredFlag] of t05Dependencies) if (rawFlags[flagId] === true && rawFlags[requiredFlag] !== true) delete rawFlags[flagId];
  if (rawFlags.FLAG_A2_SS_MATCH_CONFIRMED === true && rawFlags.FLAG_A1_SS_FOUND !== true) delete rawFlags.FLAG_A2_SS_MATCH_CONFIRMED;
  if (rawFlags.FLAG_A2_SS_MATCH_CONFIRMED === true && candidateSchemaVersion >= 10 && !act2Research.school.legacyCompletionMigrated) {
    const schoolEvidenceFlags: Record<string, string> = { 'teacher-account': 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'rank-record': 'FLAG_A2_SCORE_CHANGE_KNOWN', 'qiming-thankyou': 'FLAG_A2_QIMING_NAME_FOUND' };
    const supportedSchoolSources = act2Research.school.selectedEvidenceIds.filter((id) => rawFlags[schoolEvidenceFlags[id]] === true);
    if (!act2Research.school.symbolMatchConfirmed || supportedSchoolSources.length < 2 || act2Research.school.selectedInferenceId !== 'bounded-timeline') delete rawFlags.FLAG_A2_SS_MATCH_CONFIRMED;
  }
  if (qimingStageValid && rawFlags.FLAG_A2_SS_MATCH_CONFIRMED !== true) {
    qimingStageValid = false;
    act2Research.stage = schoolPrerequisitesValid ? 'school' : 'tales';
    schoolStageValid = act2Research.stage === 'school' && schoolPrerequisitesValid;
  }
  if (!schoolStageValid && !qimingStageValid) act2Research.school = createDefaultAct2ResearchState().school;
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
  const validReviewedCases = candidateSchemaVersion >= 12
    ? act2Research.t06.reviewedCases.filter((review) => review.sourcePageIds.every((id) => setT06.has(id)))
    : [];
  act2Research.t06.reviewedCases = validReviewedCases;
  const bothNewCaseReviewsValid = ['huang', 'zhong'].every((caseId) => validReviewedCases.some((review) => review.caseId === caseId));
  const completeLegacyT06Pages = ['PAGE_A2_T06_004','PAGE_A2_T06_006','PAGE_A2_T06_007','PAGE_A2_T06_008','PAGE_A2_T06_009'].every((id) => setT06.has(id));
  const completeLegacyT06Flags = ['FLAG_A2_QIMING_OFFICIAL_FOUND','FLAG_A2_QIMING_TESTIMONIALS_READ','FLAG_A2_QIMING_FORUM_FOUND','FLAG_A2_HUANG_MATCH_INFERRED','FLAG_A2_ZHONG_MATCH_INFERRED','FLAG_A2_OTHER_CASES_ABNORMAL'].every((id) => rawFlags[id] === true);
  const legacyT06CompletionValid = completeLegacyT06Pages && completeLegacyT06Flags;
  const migratedLegacyT06Completion = candidateSchemaVersion < 12 && legacyT06CompletionValid;
  const retainedLegacyT06Completion = candidateSchemaVersion >= 12 && act2Research.t06.legacyCompletionMigrated && legacyT06CompletionValid;
  act2Research.t06.legacyCompletionMigrated = migratedLegacyT06Completion || retainedLegacyT06Completion;
  const t06CompletionValid = bothNewCaseReviewsValid || act2Research.t06.legacyCompletionMigrated;
  if (t06CompletionValid) rawFlags.FLAG_A2_OTHER_CASES_ABNORMAL = true;
  else delete rawFlags.FLAG_A2_OTHER_CASES_ABNORMAL;
  // T07：只有在 T06 收束后进入的阶段才保留 T07 语义进度与 Flag。
  let t07StageValid = act2Research.stage === 'finale' && rawFlags.FLAG_A2_OTHER_CASES_ABNORMAL === true;
  if (act2Research.stage === 'finale' && !t07StageValid) act2Research.stage = 'qiming';
  if (!t07StageValid) {
    act2Research.t07 = { viewedMaterialIds: [], playedSegmentIds: [], capturedFrameIds: [], capturedAtMsByFrameId: {}, comparedFrameIds: [], comparisonFeatureIdByFrameId: {} };
    for (const flagId of t07FlagIds) delete rawFlags[flagId];
  } else {
    const t07 = act2Research.t07;
    if (rawFlags.FLAG_A2_PROMO_VIDEO_FOUND === true && !t07.viewedMaterialIds.includes(act2T07.video.materialId)) delete rawFlags.FLAG_A2_PROMO_VIDEO_FOUND;
    if (rawFlags.FLAG_A2_PROMO_VIDEO_WATCHED === true && (rawFlags.FLAG_A2_PROMO_VIDEO_FOUND !== true || !act2T07.video.requiredSegmentIds.every((id) => t07.playedSegmentIds.includes(id)))) delete rawFlags.FLAG_A2_PROMO_VIDEO_WATCHED;
    if (rawFlags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true && !t07.viewedMaterialIds.includes(act2T07.photoMaterialId)) delete rawFlags.FLAG_A2_PROMO_PHOTO_SS_FOUND;
    if (candidateSchemaVersion <= 11) {
      const legacyExteriorFrameIds = t07.comparedFrameIds.filter((id) => act2T07.video.keyFrames.find((frame) => frame.id === id)?.supportsExteriorMatch === true);
      if (legacyExteriorFrameIds.length > 0) rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND = true;
    }
    // schema 12 already recorded a successful exterior comparison, but did not
    // persist the selected feature. Recover that one known legacy conclusion
    // only when the original comparison flag and captured-frame chain survive.
    if (candidateSchemaVersion <= 12 && rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND === true) {
      const legacyExteriorFrameIds = t07.comparedFrameIds.filter((id) => act2T07.video.keyFrames.find((frame) => frame.id === id)?.supportsExteriorMatch === true);
      act2Research.t07.comparisonFeatureIdByFrameId = {
        ...act2Research.t07.comparisonFeatureIdByFrameId,
        ...Object.fromEntries(legacyExteriorFrameIds.map((id) => [id, act2T07.comparison.matchFeatureId])),
      };
    }
    // Current saves must pair an exterior-capable captured frame with the
    // one supported shape. A contradictory or incomplete feature map cannot
    // unlock location inference or preserve a false success note.
    const validComparedFrameIds = t07.comparedFrameIds.filter((id) =>
      act2T07.video.keyFrames.find((frame) => frame.id === id)?.supportsExteriorMatch === true
        && act2Research.t07.comparisonFeatureIdByFrameId[id] === act2T07.comparison.matchFeatureId,
    );
    t07.comparedFrameIds = validComparedFrameIds;
    act2Research.t07.comparisonFeatureIdByFrameId = Object.fromEntries(validComparedFrameIds.map((id) => [id, act2T07.comparison.matchFeatureId]));
    if (validComparedFrameIds.length > 0) rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND = true;
    else delete rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND;
    if (rawFlags.FLAG_A2_QIMING_LOCATION_INFERRED === true && !(rawFlags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true && rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND === true)) delete rawFlags.FLAG_A2_QIMING_LOCATION_INFERRED;
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
  const validAct4Gate = act3.stage === 'T07' && rawFlags.FLAG_A3_KITCHEN_EXITED === true
    && rawFlags.FLAG_A3_NOTEBOOK_FOUND === true && rawFlags.FLAG_A3_SITE_EXITED === true
    && rawFlags.FLAG_A3_COMPLETE === true;
  if (!validAct4Gate && isRecord(modules.act4) && modules.act4.stage !== 'inactive') delete rawFlags.FLAG_A3_COMPLETE;
  let act4 = safeAct4(modules.act4, validAct4Gate ? rawFlags : {}, candidate.schemaVersion as number);
  if (act4.stage === 'inactive') {
    for (const key of Object.keys(rawFlags)) if (/^FLAG_A4_/.test(key)) delete rawFlags[key];
  } else {
    const stageNumber = Number(act4.stage.slice(1));
    for (let index = 1; index <= 10; index += 1) {
      const sectionId = `A4_READ_T${String(index).padStart(2, '0')}`;
      const flagId = `FLAG_A4_T${String(index).padStart(2, '0')}_COMPLETE`;
      if (index <= stageNumber && act4.completedNarrativeSectionIds.includes(sectionId)) rawFlags[flagId] = true;
      else delete rawFlags[flagId];
    }
    if (act4.stage === 'T10' && act4.finalMailOpened && act4.completedNarrativeSectionIds.includes('A4_READ_T10')) rawFlags.FLAG_A4_COMPLETE = true;
    else delete rawFlags.FLAG_A4_COMPLETE;
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
    if (id === 'NOTE_A2_T07_003') return rawFlags.FLAG_A2_QIMING_LOCATION_INFERRED === true && rawFlags.FLAG_A2_TEMPLE_FRAME_FOUND === true && rawFlags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true;
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
    schemaVersion: 13,
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

function decodeSaveText(raw: string): SaveReadResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { kind: 'corrupt', raw };
  }
  if (!isRecord(candidate) || typeof candidate.schemaVersion !== 'number') return { kind: 'corrupt', raw };
  if (!supportedSchemaVersions.includes(candidate.schemaVersion)) return { kind: 'unsupported-version', raw, version: candidate.schemaVersion };
  if (!isValidSaveImportEnvelope(candidate)) return { kind: 'corrupt', raw };
  const state = hydrateState(candidate);
  return state.schemaVersion === 13 ? { kind: 'loaded', state } : { kind: 'corrupt', raw };
}

export const readSave = (storage?: SaveStoragePort): SaveReadResult => {
  const target = resolveSaveStorage(storage);
  if (!target) return { kind: 'unavailable' };
  try {
    const raw = target.getItem(SAVE_KEY);
    return raw === null ? { kind: 'empty' } : decodeSaveText(raw);
  } catch {
    return { kind: 'unavailable' };
  }
};

/** Compatibility API: exceptional reads still return a usable in-memory default state. */
export const loadState = (storage?: SaveStoragePort): AppState => {
  const result = readSave(storage);
  return result.kind === 'loaded' ? result.state : createDefaultState();
};

function preserveOriginal(raw: string, target: SaveStoragePort, replaceProtectedOriginal: boolean): SaveWriteFailureReason | null {
  try {
    const existing = target.getItem(SAVE_RECOVERY_KEY);
    if (existing === raw) return null;
    if (existing !== null && !replaceProtectedOriginal) return 'recovery-slot-occupied';
    target.setItem(SAVE_RECOVERY_KEY, raw);
    return target.getItem(SAVE_RECOVERY_KEY) === raw ? null : 'recovery-protection-failed';
  } catch {
    return 'recovery-protection-failed';
  }
}

/** Writes the last valid primary save to a single bounded backup slot before replacing it. */
export const writeSaveState = (
  state: AppState,
  storage?: SaveStoragePort,
  options: SaveRecoveryWriteOptions & { allowInvalidOverwrite?: boolean } = {},
): SaveWriteResult => {
  const target = resolveSaveStorage(storage);
  if (!target) return { ok: false, reason: 'storage-unavailable' };
  try {
    if (options.preserveOriginalText !== undefined) {
      const protectionFailure = preserveOriginal(options.preserveOriginalText, target, options.replaceProtectedOriginal === true);
      if (protectionFailure) return { ok: false, reason: protectionFailure };
    }
    const currentRaw = target.getItem(SAVE_KEY);
    if (currentRaw !== null) {
      const current = decodeSaveText(currentRaw);
      if (current.kind === 'loaded') {
        try {
          target.setItem(SAVE_BACKUP_KEY, currentRaw);
        } catch {
          return { ok: false, reason: 'backup-unavailable' };
        }
      } else if (current.kind === 'corrupt' || current.kind === 'unsupported-version') {
        const protectionFailure = preserveOriginal(current.raw, target, options.replaceProtectedOriginal === true);
        if (protectionFailure) return { ok: false, reason: protectionFailure, recovery: current };
        if (!options.allowInvalidOverwrite) return { ok: false, reason: 'recovery-required', recovery: current };
      } else {
        return { ok: false, reason: 'storage-unavailable' };
      }
    }
    target.setItem(SAVE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
};

export const saveState = (state: AppState, storage?: SaveStoragePort): boolean => writeSaveState(state, storage).ok;

export const readRecentSaveBackup = (storage?: SaveStoragePort): SaveReadResult => {
  const target = resolveSaveStorage(storage);
  if (!target) return { kind: 'unavailable' };
  try {
    const raw = target.getItem(SAVE_BACKUP_KEY);
    return raw === null ? { kind: 'empty' } : decodeSaveText(raw);
  } catch {
    return { kind: 'unavailable' };
  }
};

export const readProtectedOriginalSave = (storage?: SaveStoragePort): string | null => {
  const target = resolveSaveStorage(storage);
  if (!target) return null;
  try {
    return target.getItem(SAVE_RECOVERY_KEY);
  } catch {
    return null;
  }
};

export type SaveBackupRestoreResult =
  | { ok: true; state: AppState }
  | { ok: false; reason: SaveWriteFailureReason | 'backup-not-found' };

export const restoreRecentSaveBackup = (storage?: SaveStoragePort, options: SaveRecoveryWriteOptions = {}): SaveBackupRestoreResult => {
  const backup = readRecentSaveBackup(storage);
  if (backup.kind !== 'loaded') return { ok: false, reason: backup.kind === 'unavailable' ? 'storage-unavailable' : 'backup-not-found' };
  const result = writeSaveState(backup.state, storage, { ...options, allowInvalidOverwrite: true });
  return result.ok ? { ok: true, state: backup.state } : { ok: false, reason: result.reason };
};

export type SaveImportResult =
  | { ok: true; state: AppState }
  | { ok: false; reason: 'invalid-file' | 'storage-unavailable' | 'backup-unavailable' | 'recovery-required' | 'recovery-protection-failed' | 'recovery-slot-occupied' | 'backup-not-found' };

function isArrayField(value: Record<string, unknown>, key: string): boolean {
  return Array.isArray(value[key]);
}

function isStringArrayField(value: Record<string, unknown>, key: string): boolean {
  return Array.isArray(value[key]) && value[key].every((item) => typeof item === 'string');
}

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoundsRecord(value: unknown): boolean {
  return isRecord(value) && ['x', 'y', 'width', 'height'].every((key) => isFiniteNumber(value[key]));
}

function isValidSaveImportEnvelope(candidate: unknown): candidate is Record<string, unknown> {
  if (!isRecord(candidate) || !supportedSchemaVersions.includes(candidate.schemaVersion as number)) return false;
  if (!isRecord(candidate.game)
    || !Number.isInteger(candidate.game.act) || Number(candidate.game.act) < 1 || Number(candidate.game.act) > 4
    || typeof candidate.game.phase !== 'string' || !validSavePhases.has(candidate.game.phase)
    || !isRecord(candidate.game.flags)
    || !Object.values(candidate.game.flags).every((value) => typeof value === 'boolean' || typeof value === 'string' || isFiniteNumber(value))) return false;
  const schemaVersion = candidate.schemaVersion as number;
  if (candidate.desktop !== undefined && (!isRecord(candidate.desktop) || (candidate.desktop.windows !== undefined && !isRecord(candidate.desktop.windows)))) return false;
  if (candidate.modules !== undefined && !isRecord(candidate.modules)) return false;
  const modules = isRecord(candidate.modules) ? candidate.modules : {};
  const act2 = isRecord(modules.act2Research) ? modules.act2Research : undefined;
  const act3 = isRecord(modules.act3) ? modules.act3 : undefined;
  const act4 = isRecord(modules.act4) ? modules.act4 : undefined;
  if (act2 && !validAct2Stages.includes(act2.stage as Act2Stage)) return false;
  if (act3 && !validAct3Stages.includes(act3.stage as Act3Stage)) return false;
  if (act4 && !act4Stages.includes(act4.stage as Act4Stage)) return false;
  if (schemaVersion < 13) return true;

  const game = candidate.game;
  const desktop = isRecord(candidate.desktop) ? candidate.desktop : undefined;
  const windows = desktop && isRecord(desktop.windows) ? desktop.windows : undefined;
  const settings = isRecord(candidate.settings) ? candidate.settings : undefined;
  const requiredModuleIds = ['mail', 'browser', 'notepad', 'scene', 'photos', 'act2Research', 'act3', 'act4', 'storyTransitions'] as const;
  if (!Number.isInteger(game.act) || !isStringArrayField(game, 'discoveredClueIds')
    || !settings || typeof settings.reducedMotion !== 'boolean'
    || !desktop || !windows || !APP_IDS.every((appId) => {
      const window = windows[appId];
      return isRecord(window) && validStatuses.includes(window.status as WindowStatus) && isBoundsRecord(window.bounds)
        && (window.restoreBounds === null || isBoundsRecord(window.restoreBounds))
        && isFiniteNumber(window.zIndex);
    }) || !isStringOrNull(desktop.activeAppId)
    || !isStringArrayField(desktop, 'openedOnceAppIds')
    || !requiredModuleIds.every((id) => isRecord(modules[id]))) return false;
  const mail = modules.mail as Record<string, unknown>;
  const browser = modules.browser as Record<string, unknown>;
  const notepad = modules.notepad as Record<string, unknown>;
  const scene = modules.scene as Record<string, unknown>;
  const photos = modules.photos as Record<string, unknown>;
  const storyTransitions = modules.storyTransitions as Record<string, unknown>;
  const act2State = modules.act2Research as Record<string, unknown>;
  const act3State = modules.act3 as Record<string, unknown>;
  const act4State = modules.act4 as Record<string, unknown>;
  const readNotebookPages = act4State.readNotebookPages;
  const bridge = act2State.bridge as Record<string, unknown>;
  const library = act2State.library as Record<string, unknown>;
  const tales = act2State.tales as Record<string, unknown>;
  const school = act2State.school as Record<string, unknown>;
  const t06 = act2State.t06 as Record<string, unknown>;
  const t07 = act2State.t07 as Record<string, unknown>;
  const nameChoices = isRecord(bridge.nameChoices) ? bridge.nameChoices : {};
  const photoAdjustments = isRecord(photos.adjustments) ? photos.adjustments : undefined;
  const photoZoom = isRecord(photos.zoomByPhotoId) ? photos.zoomByPhotoId : undefined;
  return isStringArrayField(mail, 'readIds') && isStringArrayField(mail, 'starredIds')
    && isStringArrayField(browser, 'queryHistory') && isStringArrayField(browser, 'visitedPageIds')
    && typeof notepad.userText === 'string' && isStringArrayField(notepad, 'autoEntryIds')
    && typeof scene.journeyStarted === 'boolean' && isStringOrNull(scene.currentSceneId)
    && isStringArrayField(scene, 'visitedSceneIds') && isStringArrayField(scene, 'inspectedHotspotIds') && isStringArrayField(scene, 'capturedPhotoIds')
    && isStringOrNull(photos.activePhotoId) && isStringArrayField(photos, 'openedPhotoIds') && isStringArrayField(photos, 'inspectedSymbolPhotoIds')
    && photoAdjustments !== undefined && Object.values(photoAdjustments).every((adjustment) => isRecord(adjustment)
      && ['exposure', 'shadows', 'contrast'].every((key) => isFiniteNumber(adjustment[key])))
    && photoZoom !== undefined && Object.values(photoZoom).every(isFiniteNumber)
    && validAct2Stages.includes(act2State.stage as Act2Stage)
    && isStringArrayField(bridge, 'talkedElderIds') && isStringArrayField(bridge, 'shownEvidenceAssetIds')
    && typeof bridge.heardPhrase === 'boolean' && ['first', 'middle', 'last'].every((key) => isStringOrNull(nameChoices[key]))
    && isStringArrayField(library, 'visitedSectionIds') && isStringArrayField(library, 'openedVolumeIds')
    && isStringOrNull(library.currentPageId) && ['bookmarkedPageIds', 'markedKeywordIds', 'excerptedEntryIds'].every((key) => isStringArrayField(library, key))
    && ['readTaleIds', 'collectedTaleIds', 'placedCardIds', 'supportingEvidenceIds'].every((key) => isStringArrayField(tales, key))
    && typeof tales.sorted === 'boolean' && typeof tales.inferenceAcknowledged === 'boolean' && isStringOrNull(tales.selectedInferenceId)
    && ['visitedAreaIds', 'inspectedHotspotIds', 'selectedEvidenceIds'].every((key) => isStringArrayField(school, key))
    && isStringOrNull(school.selectedInferenceId) && typeof school.symbolMatchConfirmed === 'boolean' && typeof school.legacyCompletionMigrated === 'boolean'
    && isArrayField(t06, 'reviewedCases') && isStringOrNull(t06.nicknameAssessment) && typeof t06.legacyCompletionMigrated === 'boolean'
    && ['viewedMaterialIds', 'playedSegmentIds', 'capturedFrameIds', 'comparedFrameIds'].every((key) => isStringArrayField(t07, key))
    && isRecord(t07.capturedAtMsByFrameId) && isRecord(t07.comparisonFeatureIdByFrameId)
    && validAct3Stages.includes(act3State.stage as Act3Stage)
    && isStringOrNull(act3State.currentLensId) && ['visitedLensIds', 'inspectedClueIds', 'confirmedFlagIds'].every((key) => isStringArrayField(act3State, key))
    && act4Stages.includes(act4State.stage as Act4Stage)
    && ['completedNarrativeSectionIds', 'completedNarrativeActionIds', 'solvedPuzzleIds', 'unlockedAccountIds', 'checkedMailRecipients', 'timelineReadDates', 'seenLaterNodeIds', 'broadcastPeriodsConfirmed'].every((key) => isStringArrayField(act4State, key))
    && Array.isArray(readNotebookPages) && readNotebookPages.every((page: unknown) => typeof page === 'number' && Number.isInteger(page) && page >= 1 && page <= 9)
    && typeof act4State.viewedWakeMail === 'boolean' && typeof act4State.wakePaperConfirmed === 'boolean'
    && typeof act4State.birthdayNodeId === 'string' && isStringOrNull(act4State.laterNodeId)
    && Number.isInteger(act4State.packageStep) && Number(act4State.packageStep) >= 0 && Number(act4State.packageStep) <= 3
    && Number.isInteger(act4State.broadcastIndex) && Number(act4State.broadcastIndex) >= 0 && Number(act4State.broadcastIndex) <= 6
    && typeof act4State.finalMailOpened === 'boolean'
    && isStringArrayField(storyTransitions, 'seenIds');
}

/** Validate the save envelope before hydration, then write only the normalized, schema-13 state. */
export const importSaveText = (serialized: string, storage?: SaveStoragePort, options: SaveRecoveryWriteOptions = {}): SaveImportResult => {
  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!isValidSaveImportEnvelope(candidate)) return { ok: false, reason: 'invalid-file' };
    const state = hydrateState(candidate);
    if (state.schemaVersion !== 13) return { ok: false, reason: 'invalid-file' };
    const result = writeSaveState(state, storage, { ...options, allowInvalidOverwrite: true });
    if (!result.ok) return { ok: false, reason: result.reason };
    return { ok: true, state };
  } catch {
    return { ok: false, reason: 'invalid-file' };
  }
};

/** Clear reading-only progress when the story save is reset; keep the reader size preference. */
export const clearReadingUiState = (): boolean => clearAct4ReadingPositions();
