import { getPendingStoryTransition } from '../../data/storyTransitionData';
import { isAct2T06PageId } from '../../data/browserData';
import type { AppState, GamePhase } from '../types';
import { createDefaultState } from '../defaultState';
import { domainChange, noDomainChange, type DomainTransition } from './transitions';

export function setFlag(state: AppState, flagId: string, value: boolean | string | number): DomainTransition {
  return domainChange(state, { ...state, game: { ...state.game, flags: { ...state.game.flags, [flagId]: value } } }, [
    { type: 'flag:changed', payload: { flagId, value } },
  ]);
}

export function setPhase(state: AppState, phase: GamePhase): DomainTransition {
  if (state.game.phase === phase) return noDomainChange(state);
  return domainChange(state, { ...state, game: { ...state.game, phase } }, [
    { type: 'phase:changed', payload: { phase } },
  ]);
}

export function acknowledgeStoryTransition(state: AppState, id: string): DomainTransition {
  if (getPendingStoryTransition(state)?.id !== id) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, storyTransitions: { seenIds: [...state.modules.storyTransitions.seenIds, id] } },
  });
}

export function markMailRead(state: AppState, mailId: string): DomainTransition {
  const readIds = state.modules.mail.readIds;
  const nextState = readIds.includes(mailId) ? state : {
    ...state,
    modules: { ...state.modules, mail: { ...state.modules.mail, readIds: [...readIds, mailId] } },
  };
  return {
    state: nextState,
    commit: nextState !== state,
    events: [{ type: 'mail:opened', payload: { mailId } }],
    result: undefined,
  };
}

export function toggleMailStarred(state: AppState, mailId: string): DomainTransition {
  const starredIds = state.modules.mail.starredIds;
  const nextStarredIds = starredIds.includes(mailId) ? starredIds.filter((id) => id !== mailId) : [...starredIds, mailId];
  return domainChange(state, { ...state, modules: { ...state.modules, mail: { ...state.modules.mail, starredIds: nextStarredIds } } });
}

export function recordBrowserSearch(state: AppState, query: string): DomainTransition {
  const normalized = query.trim();
  if (!normalized) return noDomainChange(state);
  const queryHistory = [normalized, ...state.modules.browser.queryHistory.filter((item) => item !== normalized)].slice(0, 20);
  return domainChange(state, { ...state, modules: { ...state.modules, browser: { ...state.modules.browser, queryHistory } } }, [
    { type: 'browser:searched', payload: { query: normalized } },
  ]);
}

export function recordBrowserPageVisit(state: AppState, pageId: string): DomainTransition {
  if (pageId.startsWith('PAGE_A2_T06_') && (!isAct2T06PageId(pageId) || state.modules.act2Research.stage !== 'qiming')) return noDomainChange(state);
  const visitedPageIds = state.modules.browser.visitedPageIds;
  const nextState = visitedPageIds.includes(pageId) ? state : {
    ...state,
    modules: { ...state.modules, browser: { ...state.modules.browser, visitedPageIds: [...visitedPageIds, pageId] } },
  };
  return {
    state: nextState,
    commit: nextState !== state,
    events: [{ type: 'browser:page-opened', payload: { pageId } }],
    result: undefined,
  };
}

export function setNotepadUserText(state: AppState, userText: string): DomainTransition {
  if (state.modules.notepad.userText === userText) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, notepad: { ...state.modules.notepad, userText } } }, [], undefined, 'deferred');
}

export function addNotepadAutoEntry(state: AppState, entryId: string): DomainTransition {
  const autoEntryIds = state.modules.notepad.autoEntryIds;
  if (autoEntryIds.includes(entryId)) return noDomainChange(state);
  return domainChange(state, { ...state, modules: { ...state.modules, notepad: { ...state.modules.notepad, autoEntryIds: [...autoEntryIds, entryId] } } }, [
    { type: 'notepad:auto-entry-added', payload: { entryId } },
  ]);
}

export function resetProgress(state: AppState): DomainTransition {
  return domainChange(state, createDefaultState());
}
