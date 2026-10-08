import type { AppState } from './types';
import { createDefaultState } from './defaultState';
import { hydrateState } from './compatibility/saveMigration';
import { isValidSaveImportEnvelope } from './compatibility/saveValidation';
import { startSecondAct } from './domain/act2';
import { startAct3, startAct4 } from './domain/act3';
import { deriveReachedChapter, type ChapterId, type ChapterHistory } from './persistence/chapterHistory';

export { deriveReachedChapter } from './persistence/chapterHistory';
export type { ChapterId } from './persistence/chapterHistory';

export interface ChapterChoice {
  id: ChapterId;
  title: string;
  unlocked: boolean;
}

const chapterTitles: Record<ChapterId, string> = {
  1: '第一幕 · 失踪前言',
  2: '第二幕 · 山路调查',
  3: '第三幕 · 旧址调查',
  4: '第四幕 · 记忆回溯',
};

export function getChapterChoices(state: AppState, history: ChapterHistory): ChapterChoice[] {
  const unlockedThrough = Math.max(deriveReachedChapter(state), history.unlockedThrough) as ChapterId;
  return ([1, 2, 3, 4] as const).map((id) => ({ id, title: chapterTitles[id], unlocked: id <= unlockedThrough }));
}

function snapshotIsEntry(state: AppState, chapter: ChapterId): boolean {
  if (chapter === 1) return state.game.act === 1 && state.game.phase === 'A';
  if (chapter === 2) return state.game.act === 2 && state.modules.act2Research.stage === 'search';
  if (chapter === 3) return state.game.act === 3 && state.modules.act3.stage === 'T00';
  return state.game.act === 4 && state.modules.act4.stage === 'T01';
}

export function readChapterEntrySnapshot(serialized: string | undefined, chapter: ChapterId): AppState | null {
  if (!serialized) return null;
  try {
    const candidate: unknown = JSON.parse(serialized);
    if (!isValidSaveImportEnvelope(candidate)) return null;
    const state = hydrateState(candidate);
    return snapshotIsEntry(state, chapter) ? state : null;
  } catch {
    return null;
  }
}

function chapterPrefixAllowed(value: string, lastPriorChapter: number): boolean {
  const match = value.match(/^(?:FLAG|NOTE|MAIL|PAGE|CLUE)_A([1-4])_/);
  return match ? Number(match[1]) <= lastPriorChapter : false;
}

function legacyEntryBase(current: AppState, chapter: ChapterId): AppState {
  const base = createDefaultState();
  const lastPriorChapter = chapter - 1;
  const flags = Object.fromEntries(Object.entries(current.game.flags).filter(([id]) => {
    const match = id.match(/^FLAG_A([1-4])_/);
    return match !== null && Number(match[1]) <= lastPriorChapter;
  }));
  const discoveredClueIds = current.game.discoveredClueIds.filter((id) => chapterPrefixAllowed(id, lastPriorChapter));
  const mailReadIds = current.modules.mail.readIds.filter((id) => chapterPrefixAllowed(id, lastPriorChapter));
  const pageIds = current.modules.browser.visitedPageIds.filter((id) => chapterPrefixAllowed(id, lastPriorChapter));
  const autoEntryIds = current.modules.notepad.autoEntryIds.filter((id) => chapterPrefixAllowed(id, lastPriorChapter));
  const seenTransitions = current.modules.storyTransitions.seenIds.filter((id) => {
    const match = id.match(/^TRANSITION_A([1-4])_/);
    return match !== null && Number(match[1]) <= lastPriorChapter;
  });
  const modules: AppState['modules'] = {
    ...base.modules,
    mail: { ...base.modules.mail, readIds: mailReadIds },
    browser: { ...base.modules.browser, visitedPageIds: pageIds },
    notepad: { userText: '', autoEntryIds },
    scene: current.modules.scene,
    photos: current.modules.photos,
    storyTransitions: { seenIds: seenTransitions },
  };
  if (chapter >= 3) modules.act2Research = current.modules.act2Research;
  if (chapter >= 4) modules.act3 = current.modules.act3;
  return {
    ...base,
    settings: current.settings,
    game: { ...base.game, flags, discoveredClueIds },
    modules,
  };
}

/** Rebuilds an entry from actual earlier-act material when a legacy save has no sidecar snapshot. */
export function buildLegacyChapterEntry(current: AppState, chapter: ChapterId): AppState | null {
  if (deriveReachedChapter(current) < chapter) return null;
  if (chapter === 1) return createDefaultState();
  const base = legacyEntryBase(current, chapter);
  if (chapter === 2) {
    const next = startSecondAct(base).state;
    return snapshotIsEntry(next, chapter) ? next : null;
  }
  if (chapter === 3) {
    const next = startAct3(base).state;
    return snapshotIsEntry(next, chapter) ? next : null;
  }
  const next = startAct4(base).state;
  return snapshotIsEntry(next, chapter) ? next : null;
}

export function resolveChapterEntry(state: AppState, history: ChapterHistory, chapter: ChapterId): AppState | null {
  const choices = getChapterChoices(state, history);
  if (!choices.some((choice) => choice.id === chapter && choice.unlocked)) return null;
  return readChapterEntrySnapshot(history.snapshots[chapter], chapter) ?? buildLegacyChapterEntry(state, chapter);
}
