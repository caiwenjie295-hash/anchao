import { resolveBrowserStorage, type BrowserStoragePort } from './persistence/browserStorage';

export const UI_PREFERENCES_KEY = 'anchao.ui.v1';

export type ReaderFontSize = 18 | 20 | 22;
export type Act4ReadingSpaceMode = 'current' | 'review';

export interface Act4ReadingPosition {
  activeBlockId: string | null;
  pageIndexByBlock: Record<string, number>;
  openedCoverKeys: string[];
}

export interface UiPreferences {
  readerFontSize: ReaderFontSize;
  act4Reading: Record<string, Act4ReadingPosition>;
}

const DEFAULT_PREFERENCES: UiPreferences = { readerFontSize: 18, act4Reading: {} };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const validFontSizes: ReaderFontSize[] = [18, 20, 22];
const validAct4SpaceKey = /^T(?:0[1-9]|10):(current|review)$/;

export function sanitizeUiPreferences(candidate: unknown): UiPreferences {
  if (!isRecord(candidate)) return { ...DEFAULT_PREFERENCES, act4Reading: {} };
  const rawReading = isRecord(candidate.act4Reading) ? candidate.act4Reading : {};
  const act4Reading = Object.fromEntries(Object.entries(rawReading).flatMap(([key, rawPosition]) => {
    if (!validAct4SpaceKey.test(key) || !isRecord(rawPosition)) return [];
    const pageIndexByBlock = isRecord(rawPosition.pageIndexByBlock)
      ? Object.fromEntries(Object.entries(rawPosition.pageIndexByBlock).flatMap(([blockId, pageIndex]) =>
        typeof blockId === 'string' && blockId.length > 0 && blockId.length <= 100
          && typeof pageIndex === 'number' && Number.isInteger(pageIndex) && pageIndex >= 0
          ? [[blockId, pageIndex]] : [],
      ))
      : {};
    return [[key, {
      activeBlockId: typeof rawPosition.activeBlockId === 'string' && rawPosition.activeBlockId.length <= 100 ? rawPosition.activeBlockId : null,
      pageIndexByBlock,
      openedCoverKeys: Array.isArray(rawPosition.openedCoverKeys)
        ? [...new Set(rawPosition.openedCoverKeys.filter((value): value is string => typeof value === 'string' && value.length > 0 && value.length <= 220))]
        : [],
    } satisfies Act4ReadingPosition]];
  }));
  return {
    readerFontSize: validFontSizes.includes(candidate.readerFontSize as ReaderFontSize) ? candidate.readerFontSize as ReaderFontSize : DEFAULT_PREFERENCES.readerFontSize,
    act4Reading,
  };
}

export function readUiPreferences(storage?: BrowserStoragePort): UiPreferences {
  try {
    const target = resolveBrowserStorage(storage);
    const saved = target?.getItem(UI_PREFERENCES_KEY);
    return saved ? sanitizeUiPreferences(JSON.parse(saved)) : { ...DEFAULT_PREFERENCES, act4Reading: {} };
  } catch {
    return { ...DEFAULT_PREFERENCES, act4Reading: {} };
  }
}

export function writeUiPreferences(preferences: unknown, storage?: BrowserStoragePort): boolean {
  try {
    const target = resolveBrowserStorage(storage);
    if (!target) return false;
    target.setItem(UI_PREFERENCES_KEY, JSON.stringify(sanitizeUiPreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}

let cachedPreferences: UiPreferences | null = null;
const subscribers = new Set<() => void>();

export const getUiPreferences = (): UiPreferences => cachedPreferences ?? (cachedPreferences = readUiPreferences());
export const subscribeUiPreferences = (listener: () => void): (() => void) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

function updateUiPreferences(update: (current: UiPreferences) => UiPreferences): boolean {
  const next = sanitizeUiPreferences(update(getUiPreferences()));
  const saved = writeUiPreferences(next);
  cachedPreferences = next;
  subscribers.forEach((listener) => listener());
  return saved;
}

export const setReaderFontSize = (readerFontSize: ReaderFontSize): boolean => updateUiPreferences((current) => ({ ...current, readerFontSize }));

export const setAct4ReadingPosition = (spaceKey: string, position: Act4ReadingPosition): boolean => {
  if (!validAct4SpaceKey.test(spaceKey)) return false;
  return updateUiPreferences((current) => ({ ...current, act4Reading: { ...current.act4Reading, [spaceKey]: position } }));
};

/** Reset the independent reading UI state while leaving the reader's display preference intact. */
export const clearAct4ReadingPositions = (): boolean => updateUiPreferences((current) => ({ ...current, act4Reading: {} }));
