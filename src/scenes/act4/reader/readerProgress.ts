import { resolveBrowserStorage, type BrowserStoragePort } from '../../../core/persistence/browserStorage';
import { getUiPreferences, subscribeUiPreferences } from '../../../core/uiPreferences';

export const ACT4_READER_PROGRESS_KEY = 'anchao.a4-reader-progress';

export interface Act4ReaderBlockProgress {
  displayedPageIndex: number;
  endingRevealed: boolean;
}

export interface Act4ReaderProgressSnapshot {
  spaces: Record<string, Record<string, Act4ReaderBlockProgress>>;
}

const EMPTY_PROGRESS: Act4ReaderProgressSnapshot = { spaces: {} };
const listeners = new Set<() => void>();
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const validSpaceKey = /^T(?:0[1-9]|10):(current|review)$/;

let activeStorage: BrowserStoragePort | null | undefined;
let activeSnapshot = EMPTY_PROGRESS;
let activeStorageLoaded = false;
let noStorageFallback = EMPTY_PROGRESS;
const failedStorageFallbacks = new WeakMap<BrowserStoragePort, Act4ReaderProgressSnapshot>();
let hadUiReadingPositions = Object.keys(getUiPreferences().act4Reading).length > 0;

function emptyProgress(): Act4ReaderProgressSnapshot {
  return { spaces: {} };
}

function sanitizeProgress(candidate: unknown): Act4ReaderProgressSnapshot {
  if (!isRecord(candidate) || !isRecord(candidate.spaces)) return emptyProgress();
  const spaces: Act4ReaderProgressSnapshot['spaces'] = {};
  for (const [spaceKey, rawBlocks] of Object.entries(candidate.spaces)) {
    if (!validSpaceKey.test(spaceKey) || !isRecord(rawBlocks)) continue;
    const blocks: Record<string, Act4ReaderBlockProgress> = {};
    for (const [blockId, rawProgress] of Object.entries(rawBlocks)) {
      if (!blockId || blockId.length > 100 || !isRecord(rawProgress)) continue;
      const displayedPageIndex = rawProgress.displayedPageIndex;
      if (typeof displayedPageIndex !== 'number' || !Number.isInteger(displayedPageIndex) || displayedPageIndex < 0) continue;
      blocks[blockId] = {
        displayedPageIndex,
        endingRevealed: rawProgress.endingRevealed === true,
      };
    }
    if (Object.keys(blocks).length) spaces[spaceKey] = blocks;
  }
  return { spaces };
}

function fallbackFor(storage: BrowserStoragePort | undefined): Act4ReaderProgressSnapshot {
  return storage ? failedStorageFallbacks.get(storage) ?? emptyProgress() : noStorageFallback;
}

function readProgress(storage: BrowserStoragePort | undefined): Act4ReaderProgressSnapshot {
  if (!storage) return fallbackFor(storage);
  try {
    const saved = storage.getItem(ACT4_READER_PROGRESS_KEY);
    if (!saved) return fallbackFor(storage);
    const parsed = sanitizeProgress(JSON.parse(saved));
    failedStorageFallbacks.set(storage, parsed);
    return parsed;
  } catch {
    return fallbackFor(storage);
  }
}

function prepare(storage?: BrowserStoragePort): BrowserStoragePort | undefined {
  const target = resolveBrowserStorage(storage);
  const identity = target ?? null;
  if (!activeStorageLoaded || activeStorage !== identity) {
    activeStorage = identity;
    activeStorageLoaded = true;
    activeSnapshot = readProgress(target);
    if (storage === undefined && Object.keys(getUiPreferences().act4Reading).length === 0) {
      activeSnapshot = emptyProgress();
      persist(activeSnapshot, target);
    }
  }
  return target;
}

function persist(progress: Act4ReaderProgressSnapshot, storage: BrowserStoragePort | undefined): boolean {
  if (!storage) {
    noStorageFallback = progress;
    return false;
  }
  failedStorageFallbacks.set(storage, progress);
  try {
    storage.setItem(ACT4_READER_PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

function publish(): void {
  listeners.forEach((listener) => listener());
}

export function getAct4ReaderProgressSnapshot(storage?: BrowserStoragePort): Act4ReaderProgressSnapshot {
  prepare(storage);
  return activeSnapshot;
}

export function subscribeAct4ReaderProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function act4ReaderBlockProgress(
  snapshot: Act4ReaderProgressSnapshot,
  spaceKey: string,
  blockId: string,
): Act4ReaderBlockProgress {
  return snapshot.spaces[spaceKey]?.[blockId] ?? { displayedPageIndex: -1, endingRevealed: false };
}

function updateBlockProgress(
  spaceKey: string,
  blockId: string,
  update: (current: Act4ReaderBlockProgress) => Act4ReaderBlockProgress,
  storage?: BrowserStoragePort,
): void {
  const target = prepare(storage);
  if (!validSpaceKey.test(spaceKey) || !blockId || blockId.length > 100) return;
  const current = act4ReaderBlockProgress(activeSnapshot, spaceKey, blockId);
  const nextBlock = update(current);
  if (nextBlock.displayedPageIndex === current.displayedPageIndex && nextBlock.endingRevealed === current.endingRevealed) return;
  activeSnapshot = {
    spaces: {
      ...activeSnapshot.spaces,
      [spaceKey]: {
        ...activeSnapshot.spaces[spaceKey],
        [blockId]: nextBlock,
      },
    },
  };
  persist(activeSnapshot, target);
  publish();
}

export function markAct4ReaderPageDisplayed(spaceKey: string, blockId: string, pageIndex: number, storage?: BrowserStoragePort): void {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) return;
  updateBlockProgress(spaceKey, blockId, (current) => ({
    ...current,
    displayedPageIndex: Math.max(current.displayedPageIndex, pageIndex),
  }), storage);
}

export function revealAct4ReaderEnding(spaceKey: string, blockId: string, storage?: BrowserStoragePort): void {
  updateBlockProgress(spaceKey, blockId, (current) => ({ ...current, endingRevealed: true }), storage);
}

export function clearAct4ReaderProgress(storage?: BrowserStoragePort): void {
  const target = resolveBrowserStorage(storage);
  activeStorage = target ?? null;
  activeStorageLoaded = true;
  activeSnapshot = emptyProgress();
  persist(activeSnapshot, target);
  try {
    target?.removeItem(ACT4_READER_PROGRESS_KEY);
  } catch {
    // The empty in-memory snapshot still protects this session after a failed reset write.
  }
  publish();
}

subscribeUiPreferences(() => {
  const hasPositions = Object.keys(getUiPreferences().act4Reading).length > 0;
  if (!hasPositions && hadUiReadingPositions) clearAct4ReaderProgress();
  hadUiReadingPositions = hasPositions;
});
