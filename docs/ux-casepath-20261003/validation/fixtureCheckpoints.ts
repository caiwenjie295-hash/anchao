import { createDefaultState } from '../../../src/core/defaultState';
import { hydrateState } from '../../../src/core/saveManager';
import type { Act2QimingCaseId, AppState } from '../../../src/core/types';
import { ACT2_EVIDENCE_ASSET_IDS } from '../../../src/core/types';
import { bridgeElders, bridgeFlagIds, bridgeNoteIds, bridgeResolution } from '../../../src/data/act2BridgeData';
import { libraryCorrectSectionId, libraryFlagIds, libraryNoteId, libraryTargetPageId, libraryTargetVolumeId } from '../../../src/data/act2LibraryData';
import { tales } from '../../../src/data/act2TalesData';
import { isStoryTransitionReached, storyTransitions } from '../../../src/data/storyTransitionData';

export const FIXTURE_MODES = [
  'a1-start', 'a1-f', 'a1-ending', 'bridge', 'library', 'tales', 'school',
  'qiming', 'qiming-zhong', 'qiming-both', 'qiming-legacy', 'finale', 'a3-t04', 'a4-t05',
] as const;

export type FixtureMode = (typeof FIXTURE_MODES)[number];
export type FixtureViewport = 'default' | 'maximized' | 'mobile';

const ACT3_COMPLETION_FLAGS = [
  'FLAG_A3_OLD_ROAD_FOUND', 'FLAG_A3_QIMING_SITE_CONFIRMED',
  'FLAG_A3_CLASSROOM_CONTRADICTION_NOTED', 'FLAG_A3_CONFINEMENT_SITE_CONFIRMED',
  'FLAG_A3_VVAKE_PAPER_FOUND', 'FLAG_A3_13ACK_PAPER_FOUND',
  'FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED', 'FLAG_A3_COMPLETE',
] as const;

const ACT3_GATE_FLAGS = [
  'FLAG_A3_GATE_REACHED', 'FLAG_A3_INNER_FENCE_PASSED', 'FLAG_A3_CLASSROOM_TURNED',
  'FLAG_A3_STAIRS_DESCENDED', 'FLAG_A3_BROADCAST_DOOR_REACHED',
  'FLAG_A3_KITCHEN_DOOR_REACHED', 'FLAG_A3_KITCHEN_EXITED', 'FLAG_A3_SITE_EXITED',
] as const;

const ACT3_REQUIRED_CLUES = [
  'CLUE_A3_T00_CABLE_BREAK', 'CLUE_A3_T00_DRAIN_DISCOVERED',
  'CLUE_A3_T01_GATE_VIEW', 'CLUE_A3_T01_SIGN_REVEALED', 'CLUE_A3_T01_MAIN_BUILDING',
  'CLUE_A3_T02_BLACKBOARD', 'CLUE_A3_T02_SLOGAN_SPEAKER',
  'CLUE_A3_T03_24H', 'CLUE_A3_T03_PEEPHOLES', 'CLUE_A3_T03_48_72H',
  'CLUE_A3_T04_VVAKE_PAPER', 'CLUE_A3_T05_13ACK_PAPER',
  'CLUE_A3_T06_SHRINE', 'CLUE_A3_T06_EMPTY_BASE', 'CLUE_A3_T06_TEMPLE_COMPARE',
  'CLUE_A3_T07_XIAOYUE_MEMORY', 'CLUE_A3_T07_BACK_GAP',
  'CLUE_A3_T07_NOTEBOOK_PICKUP', 'CLUE_A3_T07_FIRST_PAGE',
] as const;

const setFlags = (state: AppState, flags: readonly string[]) => {
  for (const id of flags) state.game.flags[id] = true;
};

function seedCompletedSchool(state: AppState): void {
  setFlags(state, [
    'FLAG_A1_COMPLETE', 'FLAG_A1_SS_FOUND', 'FLAG_A2_TRANSFER_RULE_INFERRED',
    'FLAG_A2_SCHOOL_ENTERED', 'FLAG_A2_FIRE_HYDRANT_SEEN',
    'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'FLAG_A2_SCORE_CHANGE_KNOWN',
    'FLAG_A2_QIMING_NAME_FOUND', 'FLAG_A2_SCHOOL_SS_FOUND', 'FLAG_A2_SS_MATCH_CONFIRMED',
  ]);
  const school = state.modules.act2Research.school;
  school.visitedAreaIds = ['AREA_A2_T05_CORRIDOR', 'AREA_A2_T05_TEACHER_OFFICE'];
  school.inspectedHotspotIds = ['HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_QIMING_TEXT', 'HOTSPOT_A2_T05_SCHOLAR_NOTE'];
  school.selectedEvidenceIds = ['teacher-account', 'rank-record'];
  school.selectedInferenceId = 'bounded-timeline';
  school.symbolMatchConfirmed = true;
}

function seedCompletedBridge(state: AppState): void {
  const clueElder = bridgeElders.find((elder) => elder.isClueElder);
  if (!clueElder) throw new Error('桥头正式数据缺少线索老人。');
  state.modules.act2Research.bridge = {
    talkedElderIds: [clueElder.id],
    shownEvidenceAssetIds: [ACT2_EVIDENCE_ASSET_IDS[0]],
    heardPhrase: true,
    nameChoices: { first: '黑', middle: '补', last: '母' },
  };
  setFlags(state, [bridgeFlagIds.evidenceShown, bridgeFlagIds.audioHeard, bridgeResolution.flagId, 'FLAG_A2_HEIBUMU_NAME_SOLVED']);
  state.modules.notepad.autoEntryIds.push(bridgeNoteIds.phraseHeard, bridgeResolution.noteId);
}

function seedCompletedLibrary(state: AppState): void {
  seedCompletedBridge(state);
  const library = state.modules.act2Research.library;
  library.visitedSectionIds = [libraryCorrectSectionId];
  library.openedVolumeIds = [libraryTargetVolumeId];
  library.currentPageId = libraryTargetPageId;
  setFlags(state, [libraryFlagIds.entered, libraryFlagIds.gazetteFound, libraryFlagIds.bumuzhiFound, libraryFlagIds.ruleKnown]);
  state.modules.notepad.autoEntryIds.push(libraryNoteId);
}

function seedCompletedTales(state: AppState): void {
  seedCompletedLibrary(state);
  const sourceIds = tales.slice(0, 2).map((tale) => tale.evidence?.[0]?.id).filter((id): id is string => Boolean(id));
  state.modules.act2Research.tales.readTaleIds = tales.map((tale) => tale.id);
  state.modules.act2Research.tales.collectedTaleIds = tales.slice(0, 2).map((tale) => tale.id);
  state.modules.act2Research.tales.supportingEvidenceIds = sourceIds;
  state.modules.act2Research.tales.selectedInferenceId = 'accompanied-change';
  state.modules.act2Research.tales.inferenceAcknowledged = true;
  setFlags(state, [
    ...tales.map((tale) => tale.readFlagId).filter((id): id is string => Boolean(id)),
    'FLAG_A2_TRANSFER_RULE_INFERRED',
  ]);
  state.modules.notepad.autoEntryIds.push(...tales.slice(0, 2).map((tale) => tale.noteId).filter((id): id is string => Boolean(id)), 'NOTE_A2_T04_004');
}

function recordQimingReviews(state: AppState, caseIds: readonly Act2QimingCaseId[]): void {
  const pageIds = new Set(state.modules.browser.visitedPageIds);
  pageIds.add('PAGE_A2_T06_004');
  for (const caseId of caseIds) pageIds.add(caseId === 'huang' ? 'PAGE_A2_T06_008' : 'PAGE_A2_T06_009');
  state.modules.browser.visitedPageIds = [...pageIds];
  state.modules.act2Research.t06.reviewedCases = caseIds.map((caseId) => ({
    caseId,
    sourcePageIds: ['PAGE_A2_T06_004', caseId === 'huang' ? 'PAGE_A2_T06_008' : 'PAGE_A2_T06_009'],
    conclusionId: 'public-claims-and-followup-differ',
  }));
}

function seedAct2Complete(state: AppState): void {
  seedCompletedTales(state);
  seedCompletedSchool(state);
  state.game.act = 2;
  state.modules.act2Research.stage = 'finale';
  recordQimingReviews(state, ['huang', 'zhong']);
  state.modules.act2Research.t07 = {
    viewedMaterialIds: ['MATERIAL_A2_T07_PHOTO'],
    playedSegmentIds: [],
    capturedFrameIds: ['FRAME_A2_T07_001'],
    capturedAtMsByFrameId: { FRAME_A2_T07_001: 7200 },
    comparedFrameIds: ['FRAME_A2_T07_001'],
    comparisonFeatureIdByFrameId: { FRAME_A2_T07_001: 'square-opening' },
  };
  setFlags(state, [
    'FLAG_A2_QIMING_OFFICIAL_FOUND', 'FLAG_A2_QIMING_TESTIMONIALS_READ',
    'FLAG_A2_OTHER_CASES_ABNORMAL', 'FLAG_A2_PROMO_PHOTO_SS_FOUND',
    'FLAG_A2_TEMPLE_FRAME_FOUND', 'FLAG_A2_QIMING_LOCATION_INFERRED',
    'FLAG_A2_SECOND_TRIP_PLANNED', 'FLAG_A2_COMPLETE',
  ]);
  state.modules.notepad.autoEntryIds.push('NOTE_A2_T06_004', 'NOTE_A2_T07_001', 'NOTE_A2_T07_002', 'NOTE_A2_T07_003', 'NOTE_A2_T07_004');
}

function seedAct3History(state: AppState, currentStage: 'T04' | 'T07'): void {
  seedAct2Complete(state);
  state.game.act = 3;
  state.modules.act3.stage = currentStage;
  state.modules.act3.currentLensId = `LENS_A3_${currentStage}_001`;
  const visitedStages = currentStage === 'T04' ? ['T00', 'T01', 'T02', 'T03', 'T04'] : ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'];
  state.modules.act3.visitedLensIds = visitedStages.map((stage) => `LENS_A3_${stage}_001`);
  state.modules.act3.inspectedClueIds = currentStage === 'T04'
    ? [...ACT3_REQUIRED_CLUES.slice(0, 10)]
    : [...ACT3_REQUIRED_CLUES];
  state.modules.act3.confirmedFlagIds = currentStage === 'T04'
    ? [...ACT3_COMPLETION_FLAGS.slice(0, 4)]
    : [...ACT3_COMPLETION_FLAGS];
  setFlags(state, [
    ...ACT3_COMPLETION_FLAGS.slice(0, currentStage === 'T04' ? 4 : ACT3_COMPLETION_FLAGS.length),
    ...ACT3_GATE_FLAGS.slice(0, currentStage === 'T04' ? 4 : ACT3_GATE_FLAGS.length),
    ...(currentStage === 'T07' ? ['FLAG_A3_NOTEBOOK_FOUND'] : []),
  ]);
  state.modules.notepad.autoEntryIds.push('NOTE_A3_T03_001');
  if (currentStage === 'T07') state.modules.notepad.autoEntryIds.push('NOTE_A3_T04_001', 'NOTE_A3_T05_001', 'NOTE_A3_T06_001', 'NOTE_A3_T07_001');
}

function seedAct4T05(state: AppState): void {
  seedAct3History(state, 'T07');
  state.game.act = 4;
  state.modules.act4.stage = 'T05';
  state.modules.act4.completedNarrativeSectionIds = ['T01', 'T02', 'T03', 'T04'].map((stage) => `A4_READ_${stage}`);
  state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];
  state.modules.act4.unlockedAccountIds = ['weibo', 'mail'];
  state.modules.act4.checkedMailRecipients = ['protagonist', 'xiaoyue'];
  state.modules.act4.viewedWakeMail = true;
  state.modules.act4.readNotebookPages = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  setFlags(state, ['FLAG_A4_T01_COMPLETE', 'FLAG_A4_T02_COMPLETE', 'FLAG_A4_T03_COMPLETE', 'FLAG_A4_T04_COMPLETE']);
}

function setDesktopWindow(state: AppState, viewport: FixtureViewport): void {
  const browser = state.desktop.windows.browser;
  browser.status = 'normal';
  if (viewport === 'maximized') {
    browser.status = 'maximized';
    browser.bounds = { x: 0, y: 0, width: window.innerWidth, height: Math.max(240, window.innerHeight - 52) };
  }
  state.desktop.activeAppId = 'browser';
  if (!state.desktop.openedOnceAppIds.includes('browser')) state.desktop.openedOnceAppIds.push('browser');
}

function setStoryTransitionsSeen(state: AppState): void {
  state.modules.storyTransitions.seenIds = storyTransitions
    .filter((transition) => isStoryTransitionReached(state, transition))
    .map((transition) => transition.id);
}

function buildMode(mode: FixtureMode, viewport: FixtureViewport): AppState {
  const state = createDefaultState();
  if (mode === 'a1-start') {
    // Keep the actual new-save state, including its normal opening transition.
  } else if (mode === 'a1-f') {
    state.game.phase = 'F';
    setFlags(state, ['FLAG_A1_XIAOA_MISSING_KNOWN', 'FLAG_A1_MAIL_XIAOA_OPENED', 'FLAG_A1_NEWS_FOUND', 'FLAG_A1_ROUTE_INFO_FOUND']);
  } else if (mode === 'a1-ending') {
    state.game.phase = 'K';
    setFlags(state, ['FLAG_A1_COMPLETE', 'FLAG_A1_SS_FOUND', 'FLAG_A1_SS_CLUE_RECORDED']);
    state.modules.scene.capturedPhotoIds = ['IMG_A1_H_003'];
  } else if (mode === 'bridge' || mode === 'library' || mode === 'tales' || mode === 'school') {
    state.game.act = 2;
    state.game.phase = ({ bridge: 'A2_T02', library: 'A2_T03', tales: 'A2_T04', school: 'A2_T05' } as const)[mode];
    state.modules.act2Research.stage = mode;
    setFlags(state, ['FLAG_A1_COMPLETE']);
    if (mode === 'bridge') {
      state.game.flags.FLAG_A2_SEARCH_SS_ATTEMPTED = true;
      state.game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED = true;
      state.modules.notepad.autoEntryIds.push('NOTE_A2_T01_001');
      state.modules.photos.openedPhotoIds = [...ACT2_EVIDENCE_ASSET_IDS];
    }
    if (mode === 'library') {
      setFlags(state, ['FLAG_A2_OFFLINE_RESEARCH_NEEDED']);
      seedCompletedBridge(state);
    }
    if (mode === 'tales') seedCompletedLibrary(state);
    if (mode === 'school') {
      seedCompletedTales(state);
      setFlags(state, ['FLAG_A1_SS_FOUND', 'FLAG_A2_SCHOOL_ENTERED']);
    }
  } else if (mode.startsWith('qiming')) {
    seedCompletedTales(state);
    seedCompletedSchool(state);
    state.game.act = 2;
    state.game.phase = 'A2_T06';
    state.modules.act2Research.stage = 'qiming';
    if (mode === 'qiming-zhong') recordQimingReviews(state, ['zhong']);
    if (mode === 'qiming-both') recordQimingReviews(state, ['huang', 'zhong']);
    if (mode === 'qiming-legacy') {
      state.modules.browser.visitedPageIds = [
        'PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009',
      ];
      state.modules.act2Research.t06.reviewedCases = [];
      state.modules.act2Research.t06.legacyCompletionMigrated = true;
      setFlags(state, [
        'FLAG_A2_QIMING_OFFICIAL_FOUND', 'FLAG_A2_QIMING_TESTIMONIALS_READ',
        'FLAG_A2_QIMING_FORUM_FOUND', 'FLAG_A2_HUANG_MATCH_INFERRED',
        'FLAG_A2_ZHONG_MATCH_INFERRED', 'FLAG_A2_OTHER_CASES_ABNORMAL',
      ]);
    }
  } else if (mode === 'finale') {
    seedAct2Complete(state);
  } else if (mode === 'a3-t04') {
    seedAct3History(state, 'T04');
  } else if (mode === 'a4-t05') {
    seedAct4T05(state);
  }

  if (mode === 'a1-ending') {
    state.modules.photos.openedPhotoIds = ['IMG_A1_H_003'];
    state.modules.photos.activePhotoId = 'IMG_A1_H_003';
  }
  if (mode.startsWith('qiming') || mode === 'finale') setDesktopWindow(state, viewport);
  const normalized = hydrateState(state);
  if (mode.startsWith('qiming') || mode === 'finale') setDesktopWindow(normalized, viewport);
  setStoryTransitionsSeen(normalized);
  return normalized;
}

export function buildCheckpoint(mode: string, viewport: string = 'default'): AppState {
  if (!FIXTURE_MODES.includes(mode as FixtureMode)) throw new Error(`未知 fixture checkpoint：${mode}`);
  if (!(['default', 'maximized', 'mobile'] as const).includes(viewport as FixtureViewport)) throw new Error(`未知 fixture viewport：${viewport}`);
  return buildMode(mode as FixtureMode, viewport as FixtureViewport);
}
