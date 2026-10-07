import { APP_IDS, type Act2Stage, type Act3Stage, type Act4Stage, type WindowStatus } from '../types';
import { act4Stages, isSupportedSaveSchemaVersion, validAct2Stages, validAct3Stages, validSavePhases, validStatuses } from './saveSchema';

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
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

export function isValidSaveImportEnvelope(candidate: unknown): candidate is Record<string, unknown> {
  if (!isRecord(candidate) || !isSupportedSaveSchemaVersion(candidate.schemaVersion)) return false;
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
