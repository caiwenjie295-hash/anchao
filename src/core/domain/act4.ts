import { birthdayScenes, timeline } from '../../data/act4/content';
import { laterScenesByStage, type LaterStage } from '../../data/act4/laterContent';
import { answerAct4Puzzle } from '../../story/act4/actions';
import { act4NarrativeActionsSatisfied, act4NarrativeSectionId, act4NarrativeStageSequence } from '../../story/act4/narrativePolicy';
import type { Act4NarrativeActionId, Act4Stage, AppState, GamePhase } from '../types';
import { domainChange, noDomainChange, type DomainTransition } from './transitions';

const stageByPuzzle: Record<string, Act4Stage> = {
  A4_P01: 'T01', A4_P02: 'T01', A4_P03: 'T01', A4_P04: 'T02', A4_P05: 'T02', A4_P06: 'T03', A4_P07: 'T03', A4_P08: 'T03',
  A4_P09: 'T04', A4_P10: 'T04', A4_P11: 'T05', A4_P12: 'T05', A4_P13: 'T06', A4_P14: 'T06', A4_P15: 'T06', A4_P16: 'T07',
  A4_P17: 'T07', A4_P18: 'T08', A4_P19: 'T08', A4_P20: 'T08', A4_P21: 'T09', A4_P22: 'T09', A4_P23: 'T10', A4_P24: 'T10',
};

export function readNotebookPage(state: AppState, page: number): DomainTransition {
  const act4 = state.modules.act4;
  if (act4.stage === 'inactive' || !Number.isInteger(page) || page < 1 || page > 9 || act4.readNotebookPages.includes(page)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, readNotebookPages: [...act4.readNotebookPages, page] } } });
}

export function checkOldMail(state: AppState, recipient: 'protagonist' | 'xiaoyue'): DomainTransition {
  const act4 = state.modules.act4;
  if (act4.stage !== 'T02' || act4.checkedMailRecipients.includes(recipient)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, checkedMailRecipients: [...act4.checkedMailRecipients, recipient] } } });
}

export function solvePuzzle(state: AppState, puzzleId: string, selections: string[]): DomainTransition<boolean> {
  const act4 = state.modules.act4;
  if (stageByPuzzle[puzzleId] !== act4.stage) return noDomainChange(state, false);
  if (act4.solvedPuzzleIds.includes(puzzleId)) return noDomainChange(state, true);
  if (!answerAct4Puzzle(puzzleId, selections)) return noDomainChange(state, false);
  if (puzzleId === 'A4_P04' || puzzleId === 'A4_P13') return noDomainChange(state, false);
  if (puzzleId === 'A4_P05' && !act4.solvedPuzzleIds.includes('A4_P04')) return noDomainChange(state, false);
  if (puzzleId === 'A4_P06' && !act4.unlockedAccountIds.includes('weibo')) return noDomainChange(state, false);
  if (puzzleId === 'A4_P09' && (!act4.unlockedAccountIds.includes('mail') || !act4.viewedWakeMail)) return noDomainChange(state, false);
  if (puzzleId === 'A4_P11' && act4.birthdayNodeId !== 'door') return noDomainChange(state, false);
  if (puzzleId === 'A4_P12' && birthdayScenes.findIndex((scene) => scene.id === act4.birthdayNodeId) < 3) return noDomainChange(state, false);
  const node = act4.laterNodeId;
  const seen = act4.seenLaterNodeIds;
  if (puzzleId === 'A4_P14' && !seen.includes('A4_T06_BROADCAST')) return noDomainChange(state, false);
  if (puzzleId === 'A4_P15' && node !== 'A4_T06_CONFINEMENT') return noDomainChange(state, false);
  if (puzzleId === 'A4_P16' && node !== 'A4_T07_MIRROR') return noDomainChange(state, false);
  if (puzzleId === 'A4_P17' && !seen.includes('A4_T07_MATH')) return noDomainChange(state, false);
  if (puzzleId === 'A4_P18' && node !== 'A4_T08_ARCHIVE') return noDomainChange(state, false);
  if (puzzleId === 'A4_P19' && !seen.includes('A4_T08_ROUTE')) return noDomainChange(state, false);
  if (puzzleId === 'A4_P20' && node !== 'A4_T08_KITCHEN') return noDomainChange(state, false);
  if (puzzleId === 'A4_P21' && (node !== 'A4_T09_NOTE' || act4.packageStep !== 3)) return noDomainChange(state, false);
  if (puzzleId === 'A4_P22' && !seen.includes('A4_T09_REPLY')) return noDomainChange(state, false);
  if (puzzleId === 'A4_P23' && node !== 'A4_T10_WORDS') return noDomainChange(state, false);
  if (puzzleId === 'A4_P24' && node !== 'A4_T10_CAFE') return noDomainChange(state, false);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: {
    ...act4, solvedPuzzleIds: [...act4.solvedPuzzleIds, puzzleId], wakePaperConfirmed: act4.wakePaperConfirmed || puzzleId === 'A4_P09',
  } } }, [], true);
}

export function loginAccounts(state: AppState, password: string): DomainTransition<boolean> {
  const act4 = state.modules.act4;
  if (act4.stage !== 'T02' || !['protagonist', 'xiaoyue'].every((id) => act4.checkedMailRecipients.includes(id)) || password !== '20200419') return noDomainChange(state, false);
  const completedNarrativeActionIds = act4.completedNarrativeActionIds.includes('A4_T02_LOGIN_SUCCEEDED')
    ? act4.completedNarrativeActionIds : [...act4.completedNarrativeActionIds, 'A4_T02_LOGIN_SUCCEEDED' as const];
  const changed = !act4.unlockedAccountIds.includes('weibo') || !act4.unlockedAccountIds.includes('mail') || completedNarrativeActionIds !== act4.completedNarrativeActionIds;
  return changed ? domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, unlockedAccountIds: ['weibo', 'mail'], completedNarrativeActionIds } } }, [], true) : noDomainChange(state, true);
}

export function readTimeline(state: AppState, date: string): DomainTransition {
  const act4 = state.modules.act4;
  if (act4.stage !== 'T03' || !timeline.some(([id]) => id === date) || act4.timelineReadDates.includes(date)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, timelineReadDates: [...act4.timelineReadDates, date] } } });
}

export function confirmBroadcastPeriod(state: AppState, period: 'morning' | 'night', groupId: string): DomainTransition<boolean> {
  const act4 = state.modules.act4;
  const expected = period === 'morning' ? '13aCK' : 'VVaKe';
  if (act4.stage !== 'T06' || act4.laterNodeId !== 'A4_T06_BROADCAST' || groupId !== expected) return noDomainChange(state, false);
  if (act4.broadcastPeriodsConfirmed.includes(period)) return noDomainChange(state, true);
  const broadcastPeriodsConfirmed = [...act4.broadcastPeriodsConfirmed, period];
  const solvedPuzzleIds = broadcastPeriodsConfirmed.length === 2 && !act4.solvedPuzzleIds.includes('A4_P13') ? [...act4.solvedPuzzleIds, 'A4_P13'] : act4.solvedPuzzleIds;
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, broadcastPeriodsConfirmed, solvedPuzzleIds } } }, [], true);
}

export function visitBirthdayNode(state: AppState, nodeId: string): DomainTransition {
  const act4 = state.modules.act4;
  if (act4.stage !== 'T05') return noDomainChange(state);
  const currentIndex = birthdayScenes.findIndex((scene) => scene.id === act4.birthdayNodeId);
  const nextIndex = birthdayScenes.findIndex((scene) => scene.id === nodeId);
  if (nextIndex !== currentIndex + 1 || (nodeId === 'taken' && !act4.solvedPuzzleIds.includes('A4_P11'))) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, birthdayNodeId: nodeId } } });
}

export function visitLaterNode(state: AppState, id: string): DomainTransition {
  const act4 = state.modules.act4;
  if (!['T06', 'T07', 'T08', 'T09', 'T10'].includes(act4.stage)) return noDomainChange(state);
  const stage = act4.stage as LaterStage;
  const scenes = laterScenesByStage(stage);
  const currentIndex = scenes.findIndex((scene) => scene.id === act4.laterNodeId);
  if (currentIndex < 0 || scenes[currentIndex + 1]?.id !== id) return noDomainChange(state);
  if (stage === 'T06' && id === 'A4_T06_ROOMMATE' && !['morning', 'night'].every((period) => act4.broadcastPeriodsConfirmed.includes(period as 'morning' | 'night'))) return noDomainChange(state);
  if (stage === 'T07' && id === 'A4_T07_KITCHEN' && !act4.solvedPuzzleIds.includes('A4_P16')) return noDomainChange(state);
  if (stage === 'T08' && id === 'A4_T08_MIRROR' && !act4.solvedPuzzleIds.includes('A4_P18')) return noDomainChange(state);
  if (stage === 'T09' && id === 'A4_T09_EXIT' && act4.packageStep !== 3) return noDomainChange(state);
  if (stage === 'T09' && id === 'A4_T09_BLACKOUT' && act4.broadcastIndex !== 6) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, laterNodeId: id, seenLaterNodeIds: act4.seenLaterNodeIds.includes(id) ? act4.seenLaterNodeIds : [...act4.seenLaterNodeIds, id] } } });
}

export function advancePackage(state: AppState, action: 'bag' | 'tape' | 'hide'): DomainTransition {
  const act4 = state.modules.act4;
  if (act4.stage !== 'T09' || act4.laterNodeId !== 'A4_T09_NOTE' || ['bag', 'tape', 'hide'][act4.packageStep] !== action) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, packageStep: act4.packageStep + 1 } } });
}

export function advanceBroadcast(state: AppState): DomainTransition {
  const act4 = state.modules.act4;
  if (act4.stage !== 'T09' || act4.laterNodeId !== 'A4_T09_EXIT' || act4.broadcastIndex >= 6) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: { ...act4, broadcastIndex: act4.broadcastIndex + 1 } } });
}

export function completeNarrativeAction(state: AppState, actionId: Act4NarrativeActionId): DomainTransition<boolean> {
  const act4 = state.modules.act4;
  const eligible = actionId === 'A4_T04_WAKE_MAIL_OPENED' ? act4.stage === 'T04' && act4.unlockedAccountIds.includes('mail')
    : actionId === 'A4_T08_ARCHIVE_OPENED' ? act4.stage === 'T08'
      : actionId === 'A4_T09_NOTE_HIDDEN' ? act4.stage === 'T09'
        : actionId === 'A4_T09_DOOR_EXITED' ? act4.stage === 'T09' && act4.completedNarrativeActionIds.includes('A4_T09_NOTE_HIDDEN')
          : actionId === 'A4_T10_FINAL_MAIL_OPENED' && act4.stage === 'T10';
  if (!eligible) return noDomainChange(state, false);
  if (act4.completedNarrativeActionIds.includes(actionId)) return noDomainChange(state, true);
  return domainChange(state, { ...state, modules: { ...state.modules, act4: {
    ...act4,
    completedNarrativeActionIds: [...act4.completedNarrativeActionIds, actionId],
    viewedWakeMail: act4.viewedWakeMail || actionId === 'A4_T04_WAKE_MAIL_OPENED',
    packageStep: actionId === 'A4_T09_NOTE_HIDDEN' ? 3 : act4.packageStep,
    broadcastIndex: actionId === 'A4_T09_DOOR_EXITED' ? 6 : act4.broadcastIndex,
    finalMailOpened: act4.finalMailOpened || actionId === 'A4_T10_FINAL_MAIL_OPENED',
  } } }, [], true);
}

export function advanceNarrativeSection(state: AppState, expectedStage: Exclude<Act4Stage, 'inactive'>): DomainTransition {
  const act4 = state.modules.act4;
  const sequence = act4NarrativeStageSequence;
  if (act4.stage !== expectedStage) return noDomainChange(state);
  const index = sequence.indexOf(act4.stage as (typeof sequence)[number]);
  if (index < 0) return noDomainChange(state);
  const sectionId = act4NarrativeSectionId(act4.stage as (typeof sequence)[number]);
  if (index === sequence.length - 1 && act4.completedNarrativeSectionIds.includes(sectionId)) return noDomainChange(state);
  if (!act4NarrativeActionsSatisfied(act4.stage as (typeof sequence)[number], act4.completedNarrativeActionIds)) return noDomainChange(state);
  const completedNarrativeSectionIds = act4.completedNarrativeSectionIds.includes(sectionId) ? act4.completedNarrativeSectionIds : [...act4.completedNarrativeSectionIds, sectionId];
  if (index === sequence.length - 1 && act4.finalMailOpened !== true) return noDomainChange(state);
  const nextStage = sequence[index + 1] ?? act4.stage;
  const phase = `A4_${nextStage}` as GamePhase;
  const flags = { ...state.game.flags, [`FLAG_A4_${act4.stage}_COMPLETE`]: true };
  if (index === sequence.length - 1) flags.FLAG_A4_COMPLETE = true;
  return domainChange(state, { ...state, game: { ...state.game, flags, phase }, modules: { ...state.modules, act4: { ...act4, stage: nextStage, completedNarrativeSectionIds } } });
}
