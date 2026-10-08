import type { AppState } from '../types';
import { resolveBrowserStorage, type BrowserStoragePort } from './browserStorage';

export const CHAPTER_HISTORY_KEY = 'anchao.chapter-history.v1';
export const CHAPTER_HISTORY_VERSION = 1;
export type ChapterId = 1 | 2 | 3 | 4;

export interface ChapterHistory {
  version: typeof CHAPTER_HISTORY_VERSION;
  unlockedThrough: ChapterId;
  /** JSON snapshots are kept as opaque text here and validated before use. */
  snapshots: Partial<Record<ChapterId, string>>;
}

export type ChapterHistoryReadResult =
  | { kind: 'loaded'; history: ChapterHistory }
  | { kind: 'empty'; history: ChapterHistory }
  | { kind: 'corrupt'; history: ChapterHistory }
  | { kind: 'unavailable'; history: ChapterHistory };

export const emptyChapterHistory = (): ChapterHistory => ({ version: CHAPTER_HISTORY_VERSION, unlockedThrough: 1, snapshots: {} });

const isChapterId = (value: unknown): value is ChapterId => value === 1 || value === 2 || value === 3 || value === 4;

function parseChapterHistory(raw: string): ChapterHistory | null {
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== 'object') return null;
    const record = candidate as Record<string, unknown>;
    if (record.version !== CHAPTER_HISTORY_VERSION || !isChapterId(record.unlockedThrough) || !record.snapshots || typeof record.snapshots !== 'object') return null;
    const source = record.snapshots as Record<string, unknown>;
    const snapshots: Partial<Record<ChapterId, string>> = {};
    for (const id of [1, 2, 3, 4] as const) {
      const value = source[id] ?? source[String(id)];
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.length > 2_000_000) return null;
      snapshots[id] = value;
    }
    return { version: CHAPTER_HISTORY_VERSION, unlockedThrough: record.unlockedThrough, snapshots };
  } catch {
    return null;
  }
}

export function readChapterHistory(storage?: BrowserStoragePort): ChapterHistoryReadResult {
  const target = resolveBrowserStorage(storage);
  if (!target) return { kind: 'unavailable', history: emptyChapterHistory() };
  try {
    const raw = target.getItem(CHAPTER_HISTORY_KEY);
    if (raw === null) return { kind: 'empty', history: emptyChapterHistory() };
    const history = parseChapterHistory(raw);
    return history ? { kind: 'loaded', history } : { kind: 'corrupt', history: emptyChapterHistory() };
  } catch {
    return { kind: 'unavailable', history: emptyChapterHistory() };
  }
}

export function writeChapterHistory(history: ChapterHistory, storage?: BrowserStoragePort): boolean {
  const target = resolveBrowserStorage(storage);
  if (!target) return false;
  try {
    target.setItem(CHAPTER_HISTORY_KEY, JSON.stringify(history));
    const verify = parseChapterHistory(target.getItem(CHAPTER_HISTORY_KEY) ?? '');
    return verify !== null && JSON.stringify(verify) === JSON.stringify(history);
  } catch {
    return false;
  }
}

export function clearChapterHistory(storage?: BrowserStoragePort): boolean {
  return writeChapterHistory(emptyChapterHistory(), storage);
}

/** State progress wins over the sidecar record, while the sidecar keeps later chapters unlocked during replay. */
export function deriveReachedChapter(state: AppState): ChapterId {
  if (state.game.act >= 4 || state.modules.act4.stage !== 'inactive') return 4;
  if (state.game.act >= 3 || state.modules.act3.stage !== 'inactive') return 3;
  if (state.game.act >= 2 || state.modules.act2Research.stage !== 'inactive') return 2;
  return 1;
}

export function chapterHistoryWithProgress(history: ChapterHistory, reached: ChapterId): ChapterHistory {
  return history.unlockedThrough >= reached ? history : { ...history, unlockedThrough: reached };
}

export function recordChapterEntry(history: ChapterHistory, chapter: ChapterId, state: AppState): ChapterHistory {
  const snapshots = history.snapshots[chapter] === undefined
    ? { ...history.snapshots, [chapter]: JSON.stringify(state) }
    : history.snapshots;
  return { version: CHAPTER_HISTORY_VERSION, unlockedThrough: Math.max(history.unlockedThrough, chapter) as ChapterId, snapshots };
}
