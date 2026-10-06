import { ACT2_SCHOOL_AREA_IDS, ACT2_SCHOOL_HOTSPOT_IDS, isAct2EvidenceAssetId, type Act2QimingCaseId, type Act2QimingConclusionId, type Act2QimingNicknameAssessment, type Act2SchoolEvidenceId, type Act2SchoolInferenceId } from '../types';
import { taleById, taleCardById, taleCards, taleEvidenceById, taleNoteIdById } from '../../data/act2TalesData';
import { libraryEntryId, libraryNoteId, libraryTargetPageId, libraryFlagIds } from '../../data/act2LibraryData';
import { act2T07, isAct2T07MaterialId, isAct2T07SegmentId, keyFrameById } from '../../data/act2T07Data';
import type { Act2ActiveStage, Act2ResearchState, Act2Stage, AppState, GamePhase, HeibumuNamePart } from '../types';
import { addNotepadAutoEntry, setFlag } from './applications';
import { domainChange, noDomainChange, type DomainTransition } from './transitions';
import { domainPlan, type DomainPlan, type DomainStep } from './plans';

export type Act2QimingCaseReviewResult = 'recorded' | 'already-recorded' | 'wrong-stage' | 'missing-source' | 'invalid-source' | 'unsupported-conclusion';

type Act2ResearchPatch = {
  stage?: Act2Stage;
  bridge?: Partial<Act2ResearchState['bridge']>;
  library?: Partial<Act2ResearchState['library']>;
  tales?: Partial<Act2ResearchState['tales']>;
  school?: Partial<Act2ResearchState['school']>;
  t06?: Partial<Act2ResearchState['t06']>;
  t07?: Partial<Act2ResearchState['t07']>;
};

const activeStages: Act2ActiveStage[] = ['search', 'bridge', 'library', 'tales'];
const stageOrder: Act2Stage[] = ['inactive', 'search', 'bridge', 'library', 'tales', 'school', 'qiming', 'finale'];
const stagePhases: Record<Act2ActiveStage, GamePhase> = { search: 'A2_T01', bridge: 'A2_T02', library: 'A2_T03', tales: 'A2_T04' };
const nameParts: HeibumuNamePart[] = ['first', 'middle', 'last'];
const heibumuName = { first: '黑', middle: '补', last: '母' } as const;
const heibumuNameText = '黑补母';
const heibumuNameSolvedFlag = 'FLAG_A2_HEIBUMU_NAME_SOLVED';

function patchResearch(state: AppState, patch: Act2ResearchPatch): DomainTransition {
  const current = state.modules.act2Research;
  const next: Act2ResearchState = {
    stage: patch.stage ?? current.stage,
    bridge: patch.bridge ? { ...current.bridge, ...patch.bridge } : current.bridge,
    library: patch.library ? { ...current.library, ...patch.library } : current.library,
    tales: patch.tales ? { ...current.tales, ...patch.tales } : current.tales,
    school: patch.school ? { ...current.school, ...patch.school } : current.school,
    t06: patch.t06 ? { ...current.t06, ...patch.t06 } : current.t06,
    t07: patch.t07 ? { ...current.t07, ...patch.t07 } : current.t07,
  };
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: next } });
}

const ensureFlag = (flagId: string): DomainStep => (state) => state.game.flags[flagId] === true ? noDomainChange(state) : setFlag(state, flagId, true);
const ensureNote = (entryId: string): DomainStep => (state) => state.modules.notepad.autoEntryIds.includes(entryId) ? noDomainChange(state) : addNotepadAutoEntry(state, entryId);
const emit = (type: 'act2:transfer-inferred' | 'act2:tales-sorted' | 'act2:school-symbol-matched' | 'act2:t07-temple-confirmed' | 'act2:t07-location-inferred' | 'act2:t07-trip-planned' | 'act2:t07-complete') : DomainStep => (state) => noDomainChange(state, undefined, [{ type, payload: {} }]);

export function startSecondAct(state: AppState): DomainTransition {
  if (state.game.flags.FLAG_A1_COMPLETE !== true || state.modules.act2Research.stage !== 'inactive') return noDomainChange(state);
  return domainChange(state, {
    ...state,
    game: { ...state.game, act: 2, phase: 'A2_T01' },
    modules: { ...state.modules, act2Research: { ...state.modules.act2Research, stage: 'search' } },
  }, [{ type: 'act2:started', payload: { act: 2 } }, { type: 'phase:changed', payload: { phase: 'A2_T01' } }]);
}

export function setStage(state: AppState, stage: Act2ActiveStage): DomainTransition {
  const current = state.modules.act2Research.stage;
  if (!activeStages.includes(stage) || current === 'inactive' || current === stage) return noDomainChange(state);
  if (stageOrder.indexOf(stage) !== stageOrder.indexOf(current) + 1) return noDomainChange(state);
  if (current === 'search' && stage === 'bridge' && state.game.flags.FLAG_A2_OFFLINE_RESEARCH_NEEDED !== true) return noDomainChange(state);
  if (stage === 'tales' && state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN !== true) return noDomainChange(state);
  const phase = stagePhases[stage];
  return domainChange(state, {
    ...state,
    game: { ...state.game, phase },
    modules: { ...state.modules, act2Research: { ...state.modules.act2Research, stage } },
  }, [{ type: 'act2:stage-changed', payload: { stage } }, { type: 'phase:changed', payload: { phase } }]);
}

export function talkToElder(state: AppState, elderId: string): DomainTransition {
  const bridge = state.modules.act2Research.bridge;
  const id = elderId.trim();
  if (state.modules.act2Research.stage !== 'bridge' || !id || bridge.talkedElderIds.includes(id)) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, act2Research: { ...state.modules.act2Research, bridge: { ...bridge, talkedElderIds: [...bridge.talkedElderIds, id] } } },
  }, [{ type: 'act2:elder-talked', payload: { elderId: id } }]);
}

export function showEvidence(state: AppState, assetId: string): DomainTransition {
  const bridge = state.modules.act2Research.bridge;
  const asset = assetId.trim();
  if (state.modules.act2Research.stage !== 'bridge' || !isAct2EvidenceAssetId(asset) || bridge.shownEvidenceAssetIds.includes(asset)) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, act2Research: { ...state.modules.act2Research, bridge: { ...bridge, shownEvidenceAssetIds: [...bridge.shownEvidenceAssetIds, asset], heardPhrase: true } } },
  }, [{ type: 'act2:evidence-shown', payload: { assetId: asset } }]);
}

export function setNameChoice(state: AppState, part: HeibumuNamePart, value: string): DomainTransition {
  const bridge = state.modules.act2Research.bridge;
  const choice = value.trim();
  if (state.modules.act2Research.stage !== 'bridge' || !bridge.heardPhrase || !choice || !nameParts.includes(part) || bridge.nameChoices[part] === choice) return noDomainChange(state);
  return patchResearch(state, { bridge: { nameChoices: { ...bridge.nameChoices, [part]: choice } } });
}

export function confirmName(state: AppState): DomainPlan {
  const bridge = state.modules.act2Research.bridge;
  const { first, middle, last } = bridge.nameChoices;
  if (state.modules.act2Research.stage !== 'bridge' || !bridge.heardPhrase || first !== heibumuName.first || middle !== heibumuName.middle || last !== heibumuName.last || state.game.flags[heibumuNameSolvedFlag] === true) return domainPlan();
  return domainPlan([
    ensureFlag(heibumuNameSolvedFlag),
    (current) => noDomainChange(current, undefined, [{ type: 'act2:name-solved', payload: { name: heibumuNameText } }]),
  ]);
}

export function visitGazetteSection(state: AppState, sectionId: string): DomainTransition {
  const library = state.modules.act2Research.library;
  const id = sectionId.trim();
  if (state.modules.act2Research.stage !== 'library' || !id || library.visitedSectionIds.includes(id)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, library: { ...library, visitedSectionIds: [...library.visitedSectionIds, id] } } } }, [{ type: 'act2:gazette-section-visited', payload: { sectionId: id } }]);
}

export function openGazetteVolume(state: AppState, volumeId: string): DomainTransition {
  const library = state.modules.act2Research.library;
  const id = volumeId.trim();
  if (state.modules.act2Research.stage !== 'library' || !id || library.visitedSectionIds.length === 0 || library.openedVolumeIds.includes(id)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, library: { ...library, openedVolumeIds: [...library.openedVolumeIds, id] } } } }, [{ type: 'act2:gazette-volume-opened', payload: { volumeId: id } }]);
}

export function openGazettePage(state: AppState, pageId: string): DomainTransition {
  const library = state.modules.act2Research.library;
  const id = pageId.trim();
  if (state.modules.act2Research.stage !== 'library' || !id || library.openedVolumeIds.length === 0 || library.currentPageId === id) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, library: { ...library, currentPageId: id } } } }, [{ type: 'act2:gazette-page-opened', payload: { pageId: id } }]);
}

export function readGazetteTargetPage(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'library' || state.modules.act2Research.library.currentPageId !== libraryTargetPageId) return domainPlan();
  return domainPlan([ensureFlag(libraryFlagIds.bumuzhiFound), ensureFlag(libraryFlagIds.ruleKnown), ensureNote(libraryNoteId),
    (current) => noDomainChange(current, undefined, [{ type: 'act2:gazette-entry-read', payload: { entryId: libraryEntryId } }])]);
}

export function toggleGazetteBookmark(state: AppState, pageId: string): DomainTransition {
  const library = state.modules.act2Research.library;
  const id = pageId.trim();
  if (state.modules.act2Research.stage !== 'library' || !id || library.currentPageId !== id) return noDomainChange(state);
  const bookmarkedPageIds = library.bookmarkedPageIds.includes(id) ? library.bookmarkedPageIds.filter((page) => page !== id) : [...library.bookmarkedPageIds, id];
  return patchResearch(state, { library: { bookmarkedPageIds } });
}

export function markGazetteKeyword(state: AppState, keywordId: string): DomainTransition {
  const library = state.modules.act2Research.library;
  const id = keywordId.trim();
  if (state.modules.act2Research.stage !== 'library' || !id || library.currentPageId === null || library.markedKeywordIds.includes(id)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, library: { ...library, markedKeywordIds: [...library.markedKeywordIds, id] } } } }, [{ type: 'act2:gazette-keyword-marked', payload: { keywordId: id } }]);
}

export function excerptGazetteEntry(state: AppState, entryId: string): DomainTransition {
  const library = state.modules.act2Research.library;
  const id = entryId.trim();
  if (state.modules.act2Research.stage !== 'library' || !id || library.currentPageId === null || library.excerptedEntryIds.includes(id)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, library: { ...library, excerptedEntryIds: [...library.excerptedEntryIds, id] } } } }, [{ type: 'act2:gazette-entry-excerpted', payload: { entryId: id } }]);
}

export function readTale(state: AppState, taleId: string): DomainPlan {
  const tales = state.modules.act2Research.tales;
  const id = taleId.trim();
  const tale = taleById.get(id);
  if (state.modules.act2Research.stage !== 'tales' || !id || !tale || tales.readTaleIds.includes(id)) return domainPlan();
  return domainPlan([
    (current) => patchResearch(current, { tales: { readTaleIds: [...current.modules.act2Research.tales.readTaleIds, id] } }),
    (current) => setFlag(current, tale.readFlagId ?? '', true),
    (current) => noDomainChange(current, undefined, [{ type: 'act2:tale-read', payload: { taleId: id } }]),
  ]);
}

export function collectTale(state: AppState, taleId: string): DomainPlan {
  const tales = state.modules.act2Research.tales;
  const id = taleId.trim();
  if (state.modules.act2Research.stage !== 'tales' || !id || !taleById.has(id) || !tales.readTaleIds.includes(id) || tales.collectedTaleIds.includes(id)) return domainPlan();
  return domainPlan([
    (current) => patchResearch(current, { tales: { collectedTaleIds: [...current.modules.act2Research.tales.collectedTaleIds, id] } }),
    ensureNote(taleNoteIdById.get(id) ?? ''),
    (current) => noDomainChange(current, undefined, [{ type: 'act2:tale-collected', payload: { taleId: id } }]),
  ]);
}

export function toggleTaleEvidence(state: AppState, evidenceId: string): DomainPlan {
  const id = evidenceId.trim();
  const evidence = taleEvidenceById.get(id);
  const tales = state.modules.act2Research.tales;
  if (state.modules.act2Research.stage !== 'tales' || !evidence || !tales.readTaleIds.includes(evidence.taleId)) return domainPlan();
  const supportingEvidenceIds = tales.supportingEvidenceIds.includes(id) ? tales.supportingEvidenceIds.filter((savedId) => savedId !== id) : [...tales.supportingEvidenceIds, id];
  const collectedTaleIds = tales.collectedTaleIds.includes(evidence.taleId) ? tales.collectedTaleIds : [...tales.collectedTaleIds, evidence.taleId];
  const steps: DomainStep[] = [(current) => patchResearch(current, { tales: { supportingEvidenceIds, collectedTaleIds } })];
  if (!tales.collectedTaleIds.includes(evidence.taleId)) steps.push(ensureNote(taleNoteIdById.get(evidence.taleId) ?? ''), (current) => noDomainChange(current, undefined, [{ type: 'act2:tale-collected', payload: { taleId: evidence.taleId } }]));
  return domainPlan(steps);
}

export function selectTaleInference(state: AppState, inferenceId: 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer'): DomainTransition {
  if (state.modules.act2Research.stage !== 'tales' || !['accompanied-change', 'recovery-or-imitation', 'complete-transfer'].includes(inferenceId) || state.modules.act2Research.tales.inferenceAcknowledged) return noDomainChange(state);
  return patchResearch(state, { tales: { selectedInferenceId: inferenceId } });
}

export function inferTransferPattern(state: AppState, inferenceId: 'accompanied-change' | 'recovery-or-imitation' | 'complete-transfer'): DomainPlan<'blocked' | 'insufficient' | 'overclaim' | 'accepted'> {
  const tales = state.modules.act2Research.tales;
  if (state.modules.act2Research.stage !== 'tales' || !['accompanied-change', 'recovery-or-imitation', 'complete-transfer'].includes(inferenceId)) return domainPlan([], 'blocked');
  const supportingSources = new Set(tales.supportingEvidenceIds.map((id) => taleEvidenceById.get(id)?.taleId).filter((id): id is string => Boolean(id)));
  const steps: DomainStep[] = [(current) => patchResearch(current, { tales: { selectedInferenceId: inferenceId } })];
  if (supportingSources.size < 2) return domainPlan(steps, 'blocked');
  if (inferenceId === 'recovery-or-imitation') return domainPlan(steps, 'insufficient');
  if (inferenceId === 'complete-transfer') return domainPlan(steps, 'overclaim');
  if (tales.inferenceAcknowledged) return domainPlan(steps, 'accepted');
  steps.push((current) => patchResearch(current, { tales: { inferenceAcknowledged: true } }), ensureNote('NOTE_A2_T04_004'), ensureFlag('FLAG_A2_TRANSFER_RULE_INFERRED'), emit('act2:transfer-inferred'));
  return domainPlan(steps, 'accepted');
}

export function placeTaleCard(state: AppState, cardId: string): DomainTransition {
  const tales = state.modules.act2Research.tales;
  const id = cardId.trim();
  if (state.modules.act2Research.stage !== 'tales' || !id || !taleCardById.has(id) || tales.collectedTaleIds.length !== taleById.size || tales.placedCardIds.includes(id)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, tales: { ...tales, placedCardIds: [...tales.placedCardIds, id] } } } }, [{ type: 'act2:tale-card-placed', payload: { cardId: id } }]);
}

export function finishTaleSorting(state: AppState): DomainPlan {
  const tales = state.modules.act2Research.tales;
  if (state.modules.act2Research.stage !== 'tales' || tales.sorted || tales.placedCardIds.length !== taleCards.length) return domainPlan();
  return domainPlan([
    (current) => patchResearch(current, { tales: { sorted: true } }),
    ensureFlag('FLAG_A2_TALES_SORTED'),
    emit('act2:tales-sorted'),
  ]);
}

export function acknowledgeTransferInference(state: AppState): DomainPlan {
  const tales = state.modules.act2Research.tales;
  if (state.modules.act2Research.stage !== 'tales' || !tales.sorted || tales.inferenceAcknowledged) return domainPlan();
  return domainPlan([
    (current) => patchResearch(current, { tales: { inferenceAcknowledged: true } }),
    ensureNote('NOTE_A2_T04_004'),
    ensureFlag('FLAG_A2_TRANSFER_RULE_INFERRED'),
    emit('act2:transfer-inferred'),
  ]);
}

export function enterSchool(state: AppState): DomainTransition {
  const { game, modules } = state;
  if (modules.act2Research.stage !== 'tales' || game.flags.FLAG_A2_TRANSFER_RULE_INFERRED !== true || game.flags.FLAG_A2_SCHOOL_ENTERED === true) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    game: { ...game, phase: 'A2_T05', flags: { ...game.flags, FLAG_A2_SCHOOL_ENTERED: true } },
    modules: { ...modules, act2Research: { ...modules.act2Research, stage: 'school' } },
  }, [
    { type: 'phase:changed', payload: { phase: 'A2_T05' } },
    { type: 'flag:changed', payload: { flagId: 'FLAG_A2_SCHOOL_ENTERED', value: true } },
    { type: 'act2:school-entered', payload: {} },
  ]);
}

export function enterQimingResearch(state: AppState): DomainTransition {
  if (state.modules.act2Research.stage !== 'school' || state.game.flags.FLAG_A2_SS_MATCH_CONFIRMED !== true) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    game: { ...state.game, phase: 'A2_T06' },
    modules: { ...state.modules, act2Research: { ...state.modules.act2Research, stage: 'qiming' } },
  }, [{ type: 'act2:qiming-entered', payload: {} }, { type: 'phase:changed', payload: { phase: 'A2_T06' } }]);
}

const maybeQimingMatchNote: DomainStep = (state) => state.game.flags.FLAG_A2_HUANG_MATCH_INFERRED === true
  && state.game.flags.FLAG_A2_ZHONG_MATCH_INFERRED === true
  ? ensureNote('NOTE_A2_T06_003')(state)
  : noDomainChange(state);

export function inferQimingNameMatch(state: AppState, person: 'huang' | 'zhong'): DomainPlan {
  const { game, modules } = state;
  const pages = modules.browser.visitedPageIds;
  if ((person !== 'huang' && person !== 'zhong') || modules.act2Research.stage !== 'qiming'
    || game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ !== true || game.flags.FLAG_A2_QIMING_FORUM_FOUND !== true
    || !pages.includes('PAGE_A2_T06_004') || !pages.includes('PAGE_A2_T06_006')
    || (person === 'zhong' && !pages.includes('PAGE_A2_T06_007'))) return domainPlan();
  const flagId = person === 'huang' ? 'FLAG_A2_HUANG_MATCH_INFERRED' : 'FLAG_A2_ZHONG_MATCH_INFERRED';
  if (game.flags[flagId] === true) return domainPlan();
  return domainPlan([
    ensureFlag(flagId),
    (current) => noDomainChange(current, undefined, [{ type: 'act2:qiming-name-matched', payload: { person } }]),
    maybeQimingMatchNote,
  ]);
}

export function recordQimingNicknameAssessment(state: AppState, assessment: Act2QimingNicknameAssessment): DomainPlan<boolean> {
  const pages = state.modules.browser.visitedPageIds;
  if (state.modules.act2Research.stage !== 'qiming' || (!pages.includes('PAGE_A2_T06_006') && !pages.includes('PAGE_A2_T06_007'))
    || (assessment !== 'possible-unverified' && assessment !== 'not-enough-evidence')) return domainPlan([], false);
  if (state.modules.act2Research.t06.nicknameAssessment === assessment) return domainPlan([], true);
  return domainPlan([(current) => patchResearch(current, { t06: { nicknameAssessment: assessment } })], true);
}

export function reviewQimingCase(state: AppState, caseId: Act2QimingCaseId, sourcePageIds: string[], conclusionId: Act2QimingConclusionId): DomainPlan<Act2QimingCaseReviewResult> {
  const result = (value: Act2QimingCaseReviewResult) => domainPlan<Act2QimingCaseReviewResult>([], value);
  if (state.modules.act2Research.stage !== 'qiming') return result('wrong-stage');
  if (caseId !== 'huang' && caseId !== 'zhong') return result('invalid-source');
  const requiredPages = caseId === 'huang' ? ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'] : ['PAGE_A2_T06_004', 'PAGE_A2_T06_009'];
  const supplied = [...new Set(sourcePageIds)];
  if (supplied.length !== requiredPages.length || supplied.some((id) => !requiredPages.includes(id))) return result('invalid-source');
  if (!requiredPages.every((id) => state.modules.browser.visitedPageIds.includes(id))) return result('missing-source');
  if (conclusionId !== 'public-claims-and-followup-differ') return result('unsupported-conclusion');
  if (state.modules.act2Research.t06.reviewedCases.some((review) => review.caseId === caseId)) return result('already-recorded');
  const reviewedCases = [...state.modules.act2Research.t06.reviewedCases, { caseId, sourcePageIds: requiredPages, conclusionId }];
  const allCasesReviewed = ['huang', 'zhong'].every((id) => reviewedCases.some((review) => review.caseId === id));
  const wasComplete = state.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL === true;
  const addedCompletionNote = allCasesReviewed && !state.modules.notepad.autoEntryIds.includes('NOTE_A2_T06_004');
  const noteIds = addedCompletionNote ? [...state.modules.notepad.autoEntryIds, 'NOTE_A2_T06_004'] : state.modules.notepad.autoEntryIds;
  const next: AppState = {
    ...state,
    game: { ...state.game, flags: allCasesReviewed ? { ...state.game.flags, FLAG_A2_OTHER_CASES_ABNORMAL: true } : state.game.flags },
    modules: {
      ...state.modules,
      act2Research: { ...state.modules.act2Research, t06: { ...state.modules.act2Research.t06, reviewedCases } },
      notepad: { ...state.modules.notepad, autoEntryIds: noteIds },
    },
  };
  const events: DomainTransition['events'][number][] = [{ type: 'act2:qiming-case-reviewed', payload: { caseId } }];
  if (allCasesReviewed && !wasComplete) {
    events.push({ type: 'act2:qiming-cases-confirmed', payload: {} }, { type: 'flag:changed', payload: { flagId: 'FLAG_A2_OTHER_CASES_ABNORMAL', value: true } });
    if (addedCompletionNote) events.push({ type: 'notepad:auto-entry-added', payload: { entryId: 'NOTE_A2_T06_004' } });
  }
  return domainPlan([(current) => domainChange(current, current === state ? next : {
    ...current,
    game: { ...current.game, flags: allCasesReviewed ? { ...current.game.flags, FLAG_A2_OTHER_CASES_ABNORMAL: true } : current.game.flags },
    modules: {
      ...current.modules,
      act2Research: { ...current.modules.act2Research, t06: { ...current.modules.act2Research.t06, reviewedCases: [...current.modules.act2Research.t06.reviewedCases, { caseId, sourcePageIds: requiredPages, conclusionId }] } },
      notepad: { ...current.modules.notepad, autoEntryIds: addedCompletionNote && !current.modules.notepad.autoEntryIds.includes('NOTE_A2_T06_004') ? [...current.modules.notepad.autoEntryIds, 'NOTE_A2_T06_004'] : current.modules.notepad.autoEntryIds },
    },
  }, events)], 'recorded');
}

export function visitSchoolArea(state: AppState, areaId: string): DomainPlan {
  const id = areaId.trim();
  const school = state.modules.act2Research.school;
  if (state.modules.act2Research.stage !== 'school' || !ACT2_SCHOOL_AREA_IDS.includes(id as (typeof ACT2_SCHOOL_AREA_IDS)[number]) || school.visitedAreaIds.includes(id)) return domainPlan();
  return domainPlan([
    (current) => domainChange(current, { ...current, modules: { ...current.modules, act2Research: { ...current.modules.act2Research, school: { ...current.modules.act2Research.school, visitedAreaIds: [...current.modules.act2Research.school.visitedAreaIds, id] } } } }, [{ type: 'act2:school-area-visited', payload: { areaId: id } }]),
    (current) => current.game.flags.FLAG_A2_FIRE_HYDRANT_SEEN !== true && id === 'AREA_A2_T05_CORRIDOR' ? setFlag(current, 'FLAG_A2_FIRE_HYDRANT_SEEN', true) : noDomainChange(current),
  ]);
}

export function inspectSchoolHotspot(state: AppState, hotspotId: string): DomainTransition {
  const id = hotspotId.trim();
  const areaByHotspot: Record<(typeof ACT2_SCHOOL_HOTSPOT_IDS)[number], string> = {
    HOTSPOT_A2_T05_TEACHER: 'AREA_A2_T05_TEACHER_OFFICE', HOTSPOT_A2_T05_RANKS: 'AREA_A2_T05_HONOR_ROLL',
    HOTSPOT_A2_T05_QIMING_TEXT: 'AREA_A2_T05_HONOR_ROLL', HOTSPOT_A2_T05_SCHOLAR_NOTE: 'AREA_A2_T05_XIAOA_CLASSROOM',
  };
  if (state.modules.act2Research.stage !== 'school' || !ACT2_SCHOOL_HOTSPOT_IDS.includes(id as (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number])
    || state.modules.act2Research.school.inspectedHotspotIds.includes(id)
    || !state.modules.act2Research.school.visitedAreaIds.includes(areaByHotspot[id as (typeof ACT2_SCHOOL_HOTSPOT_IDS)[number]])) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, school: { ...state.modules.act2Research.school, inspectedHotspotIds: [...state.modules.act2Research.school.inspectedHotspotIds, id] } } } }, [{ type: 'act2:school-hotspot-inspected', payload: { hotspotId: id } }]);
}

export function acknowledgeTeacherAccount(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'school' || !state.modules.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_TEACHER') || state.game.flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_LEAVE_OF_ABSENCE_KNOWN'), ensureNote('NOTE_A2_T05_001')]);
}

export function readSchoolRanks(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'school' || !state.modules.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_RANKS') || state.game.flags.FLAG_A2_SCORE_CHANGE_KNOWN === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_SCORE_CHANGE_KNOWN'), ensureNote('NOTE_A2_T05_002')]);
}

export function readQimingTestimonial(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'school' || state.game.flags.FLAG_A2_SCORE_CHANGE_KNOWN !== true
    || !state.modules.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_QIMING_TEXT') || state.game.flags.FLAG_A2_QIMING_NAME_FOUND === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_QIMING_NAME_FOUND'), ensureNote('NOTE_A2_T05_003')]);
}

export function inspectSchoolNotebook(state: AppState): DomainTransition {
  if (state.modules.act2Research.stage !== 'school' || !state.modules.act2Research.school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE') || state.game.flags.FLAG_A2_SCHOOL_SS_FOUND === true) return noDomainChange(state);
  return setFlag(state, 'FLAG_A2_SCHOOL_SS_FOUND', true);
}

export function confirmSchoolSymbolMatch(state: AppState): DomainTransition {
  const school = state.modules.act2Research.school;
  if (state.modules.act2Research.stage !== 'school' || state.game.flags.FLAG_A1_SS_FOUND !== true || state.game.flags.FLAG_A2_SCHOOL_SS_FOUND !== true
    || !school.inspectedHotspotIds.includes('HOTSPOT_A2_T05_SCHOLAR_NOTE') || school.symbolMatchConfirmed) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, school: { ...school, symbolMatchConfirmed: true } } } });
}

export function toggleSchoolEvidence(state: AppState, evidenceId: Act2SchoolEvidenceId): DomainTransition {
  if (state.modules.act2Research.stage !== 'school') return noDomainChange(state);
  const sourceFlags: Record<Act2SchoolEvidenceId, string> = { 'teacher-account': 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'rank-record': 'FLAG_A2_SCORE_CHANGE_KNOWN', 'qiming-thankyou': 'FLAG_A2_QIMING_NAME_FOUND' };
  if (state.game.flags[sourceFlags[evidenceId]] !== true) return noDomainChange(state);
  const selected = state.modules.act2Research.school.selectedEvidenceIds;
  const selectedEvidenceIds = selected.includes(evidenceId) ? selected.filter((id) => id !== evidenceId) : [...selected, evidenceId];
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, school: { ...state.modules.act2Research.school, selectedEvidenceIds } } } });
}

export function selectSchoolInference(state: AppState, inferenceId: Act2SchoolInferenceId): DomainTransition {
  if (state.modules.act2Research.stage !== 'school' || !['bounded-timeline', 'qiming-caused-change'].includes(inferenceId)) return noDomainChange(state);
  return patchResearch(state, { school: { selectedInferenceId: inferenceId } });
}

export function confirmSchoolTimeline(state: AppState): DomainPlan {
  const school = state.modules.act2Research.school;
  if (state.modules.act2Research.stage !== 'school' || state.game.flags.FLAG_A2_SS_MATCH_CONFIRMED === true) return domainPlan();
  const sourceFlags: Record<Act2SchoolEvidenceId, string> = { 'teacher-account': 'FLAG_A2_LEAVE_OF_ABSENCE_KNOWN', 'rank-record': 'FLAG_A2_SCORE_CHANGE_KNOWN', 'qiming-thankyou': 'FLAG_A2_QIMING_NAME_FOUND' };
  const supportedEvidence = school.selectedEvidenceIds.filter((id) => state.game.flags[sourceFlags[id]] === true);
  if (!school.symbolMatchConfirmed || supportedEvidence.length < 2 || school.selectedInferenceId !== 'bounded-timeline') return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_SS_MATCH_CONFIRMED'), ensureNote('NOTE_A2_T05_004'), (current) => noDomainChange(current, undefined, [{ type: 'act2:school-symbol-matched', payload: {} }])]);
}

export function enterFinaleInvestigation(state: AppState): DomainTransition {
  if (state.modules.act2Research.stage !== 'qiming' || state.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL !== true) return noDomainChange(state);
  return domainChange(state, { ...state, game: { ...state.game, phase: 'A2_T07' }, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, stage: 'finale' } } }, [
    { type: 'phase:changed', payload: { phase: 'A2_T07' } }, { type: 'act2:t07-entered', payload: {} },
  ]);
}

export function viewT07Material(state: AppState, materialId: string): DomainPlan {
  const id = materialId.trim();
  if (state.modules.act2Research.stage !== 'finale' || !isAct2T07MaterialId(id)) return domainPlan();
  return domainPlan([
    (current) => current.modules.act2Research.t07.viewedMaterialIds.includes(id) ? noDomainChange(current)
      : patchResearch(current, { t07: { viewedMaterialIds: [...current.modules.act2Research.t07.viewedMaterialIds, id] } }),
    (current) => id === act2T07.video.materialId && current.game.flags.FLAG_A2_PROMO_VIDEO_FOUND !== true ? setFlag(current, 'FLAG_A2_PROMO_VIDEO_FOUND', true) : noDomainChange(current),
    (current) => noDomainChange(current, undefined, [{ type: 'act2:t07-material-viewed', payload: { materialId: id } }]),
  ]);
}

export function markT07SegmentPlayed(state: AppState, segmentId: string): DomainPlan {
  const id = segmentId.trim();
  if (state.modules.act2Research.stage !== 'finale' || state.game.flags.FLAG_A2_PROMO_VIDEO_FOUND !== true || !isAct2T07SegmentId(id)) return domainPlan();
  return domainPlan([
    (current) => current.modules.act2Research.t07.playedSegmentIds.includes(id) ? noDomainChange(current)
      : patchResearch(current, { t07: { playedSegmentIds: [...current.modules.act2Research.t07.playedSegmentIds, id] } }),
    (current) => current.game.flags.FLAG_A2_PROMO_VIDEO_WATCHED === true || !act2T07.video.requiredSegmentIds.every((segmentId2) => current.modules.act2Research.t07.playedSegmentIds.includes(segmentId2))
      ? noDomainChange(current) : setFlag(current, 'FLAG_A2_PROMO_VIDEO_WATCHED', true),
  ]);
}

export function captureT07Frame(state: AppState, frameId: string, timeMs: number): DomainTransition {
  const id = frameId.trim();
  const frame = keyFrameById.get(id);
  if (state.modules.act2Research.stage !== 'finale' || !frame || state.game.flags.FLAG_A2_PROMO_VIDEO_FOUND !== true
    || !Number.isFinite(timeMs) || timeMs < frame.startMs || timeMs > frame.endMs || state.modules.act2Research.t07.capturedFrameIds.includes(id)) return noDomainChange(state);
  const t07 = state.modules.act2Research.t07;
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, t07: {
    ...t07, capturedFrameIds: [...t07.capturedFrameIds, id], capturedAtMsByFrameId: { ...t07.capturedAtMsByFrameId, [id]: Math.round(timeMs) },
  } } } }, [{ type: 'act2:t07-frame-captured', payload: { frameId: id } }]);
}

export function compareT07TempleFrame(state: AppState, frameId: string, featureId: string): DomainTransition<boolean> {
  const id = frameId.trim();
  const frame = keyFrameById.get(id);
  const t07 = state.modules.act2Research.t07;
  if (state.modules.act2Research.stage !== 'finale' || !frame || !t07.capturedFrameIds.includes(id) || t07.comparedFrameIds.includes(id)
    || !act2T07.comparison.featureOptions.some((option) => option.id === featureId) || !frame.supportsExteriorMatch || featureId !== act2T07.comparison.matchFeatureId) return noDomainChange(state, false);
  return domainChange(state, { ...state, modules: { ...state.modules, act2Research: { ...state.modules.act2Research, t07: {
    ...t07, comparedFrameIds: [...t07.comparedFrameIds, id], comparisonFeatureIdByFrameId: { ...t07.comparisonFeatureIdByFrameId, [id]: featureId },
  } } } }, [{ type: 'act2:t07-frame-compared', payload: { frameId: id } }], true);
}

export type T07ComparisonResult = 'recorded' | 'already-recorded' | 'invalid-frame' | 'invalid-feature' | 'insufficient-evidence' | 'wrong-stage';

export function submitT07Comparison(state: AppState, frameId: string, featureId: string): DomainTransition<T07ComparisonResult> {
  const id = frameId.trim();
  const frame = keyFrameById.get(id);
  const result = (value: T07ComparisonResult) => noDomainChange(state, value);
  if (state.modules.act2Research.stage !== 'finale') return result('wrong-stage');
  if (!frame || !state.modules.act2Research.t07.capturedFrameIds.includes(id)) return result('invalid-frame');
  if (!act2T07.comparison.featureOptions.some((option) => option.id === featureId)) return result('invalid-feature');
  if (!frame.supportsExteriorMatch || featureId !== act2T07.comparison.matchFeatureId) return result('insufficient-evidence');
  if (state.modules.act2Research.t07.comparedFrameIds.includes(id) || state.game.flags.FLAG_A2_TEMPLE_FRAME_FOUND === true) return result('already-recorded');
  const addedNote = !state.modules.notepad.autoEntryIds.includes('NOTE_A2_T07_002');
  const next: AppState = {
    ...state,
    game: { ...state.game, flags: { ...state.game.flags, FLAG_A2_TEMPLE_FRAME_FOUND: true } },
    modules: {
      ...state.modules,
      act2Research: { ...state.modules.act2Research, t07: { ...state.modules.act2Research.t07,
        comparedFrameIds: [...state.modules.act2Research.t07.comparedFrameIds, id],
        comparisonFeatureIdByFrameId: { ...state.modules.act2Research.t07.comparisonFeatureIdByFrameId, [id]: featureId },
      } },
      notepad: { ...state.modules.notepad, autoEntryIds: addedNote ? [...state.modules.notepad.autoEntryIds, 'NOTE_A2_T07_002'] : state.modules.notepad.autoEntryIds },
    },
  };
  const events: DomainTransition['events'][number][] = [
    { type: 'act2:t07-frame-compared', payload: { frameId: id } }, { type: 'act2:t07-temple-confirmed', payload: {} },
    { type: 'flag:changed', payload: { flagId: 'FLAG_A2_TEMPLE_FRAME_FOUND', value: true } },
  ];
  if (addedNote) events.push({ type: 'notepad:auto-entry-added', payload: { entryId: 'NOTE_A2_T07_002' } });
  return domainChange(state, next, events, 'recorded');
}

export function confirmT07TempleFrame(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'finale' || !state.modules.act2Research.t07.comparedFrameIds.some((id) => keyFrameById.get(id)?.supportsExteriorMatch === true)
    || state.game.flags.FLAG_A2_TEMPLE_FRAME_FOUND === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_TEMPLE_FRAME_FOUND'), ensureNote('NOTE_A2_T07_002'), emit('act2:t07-temple-confirmed')]);
}

export function confirmT07PhotoSymbol(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'finale' || !state.modules.act2Research.t07.viewedMaterialIds.includes(act2T07.photoMaterialId)
    || state.game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_PROMO_PHOTO_SS_FOUND'), ensureNote('NOTE_A2_T07_001')]);
}

export function inferT07Location(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'finale' || state.game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND !== true
    || state.game.flags.FLAG_A2_TEMPLE_FRAME_FOUND !== true || state.game.flags.FLAG_A2_QIMING_LOCATION_INFERRED === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_QIMING_LOCATION_INFERRED'), ensureNote('NOTE_A2_T07_003'), emit('act2:t07-location-inferred')]);
}

export function planT07SecondTrip(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'finale' || state.game.flags.FLAG_A2_QIMING_LOCATION_INFERRED !== true || state.game.flags.FLAG_A2_SECOND_TRIP_PLANNED === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_SECOND_TRIP_PLANNED'), ensureNote('NOTE_A2_T07_004'), emit('act2:t07-trip-planned')]);
}

export function completeT07Finale(state: AppState): DomainPlan {
  if (state.modules.act2Research.stage !== 'finale' || state.game.flags.FLAG_A2_SECOND_TRIP_PLANNED !== true || state.game.flags.FLAG_A2_COMPLETE === true) return domainPlan();
  return domainPlan([ensureFlag('FLAG_A2_COMPLETE'), emit('act2:t07-complete')]);
}
