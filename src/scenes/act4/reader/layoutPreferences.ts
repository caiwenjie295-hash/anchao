import {
  act4Existing560ReaderTextPages,
  act4LegacyReaderTextPages,
} from '../../../data/narrative/act4Presentation';
import type { Act4NarrativeBlock } from '../../../data/narrative/act4Narrative';
import type { BrowserStoragePort } from '../../../core/persistence/browserStorage';
import { getUiPreferences } from '../../../core/uiPreferences';
import { resolveBrowserStorage } from '../../../core/persistence/browserStorage';
import { readerPagesForBlock } from './readerModel';

const READER_LAYOUT_VERSION_KEY = 'anchao.a4-reader-layout';
const PRESERVED_BLOCK_LAYOUTS_KEY = 'anchao.a4-reader-layout-positions';
const READER_LAYOUT_VERSION = '3';
type PreservedLayoutVersion = '1' | '2';
type PreservedLayouts = Record<string, Record<string, PreservedLayoutVersion>>;
let readerLayoutVersionInMemory: string | null = null;
let readerLayoutVersionStorageIdentity: BrowserStoragePort | null | undefined;
let preservedLayoutsInMemory: PreservedLayouts = {};
let fallbackStorageIdentity: BrowserStoragePort | null | undefined;

function storedLayoutVersion(): string | null {
  const storage = resolveBrowserStorage();
  if (readerLayoutVersionStorageIdentity !== undefined && readerLayoutVersionStorageIdentity !== storage) {
    readerLayoutVersionInMemory = null;
  }
  readerLayoutVersionStorageIdentity = storage ?? null;
  try {
    const stored = storage?.getItem(READER_LAYOUT_VERSION_KEY) ?? null;
    return stored ?? readerLayoutVersionInMemory;
  } catch {
    return readerLayoutVersionInMemory;
  }
}

function sanitizePreservedLayouts(candidate: unknown): PreservedLayouts {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return {};
  const reading = getUiPreferences().act4Reading;
  const result: PreservedLayouts = {};
  for (const [spaceKey, value] of Object.entries(candidate)) {
    if (!/^T(?:0[1-9]|10):(current|review)$/.test(spaceKey) || typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const position = reading[spaceKey];
    if (!position) continue;
    const blocks: Record<string, PreservedLayoutVersion> = {};
    for (const [blockId, version] of Object.entries(value)) {
      if (blockId.length <= 100 && position.pageIndexByBlock[blockId] !== undefined && (version === '1' || version === '2')) {
        blocks[blockId] = version;
      }
    }
    if (Object.keys(blocks).length) result[spaceKey] = blocks;
  }
  return result;
}

function readPreservedLayouts(): PreservedLayouts {
  const storage = resolveBrowserStorage();
  if (!storage) {
    if (fallbackStorageIdentity !== undefined && fallbackStorageIdentity !== null) preservedLayoutsInMemory = {};
    fallbackStorageIdentity = null;
    preservedLayoutsInMemory = sanitizePreservedLayouts(preservedLayoutsInMemory);
    return preservedLayoutsInMemory;
  }
  if (fallbackStorageIdentity !== undefined && fallbackStorageIdentity !== storage) preservedLayoutsInMemory = {};
  fallbackStorageIdentity = storage;
  let parsed: unknown;
  try {
    const raw = storage.getItem(PRESERVED_BLOCK_LAYOUTS_KEY);
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    preservedLayoutsInMemory = sanitizePreservedLayouts(preservedLayoutsInMemory);
    return preservedLayoutsInMemory;
  }
  // A readable but empty key may follow a failed write. Retain only this Storage's
  // same-session fallback, and prune it against the current UI positions first.
  const result = sanitizePreservedLayouts(parsed ?? preservedLayoutsInMemory);
  if (parsed && JSON.stringify(result) !== JSON.stringify(parsed)) {
    try {
      if (Object.keys(result).length) storage.setItem(PRESERVED_BLOCK_LAYOUTS_KEY, JSON.stringify(result));
      else storage.removeItem(PRESERVED_BLOCK_LAYOUTS_KEY);
    } catch {
      preservedLayoutsInMemory = result;
    }
  } else if (!parsed && Object.keys(result).length) {
    try {
      storage.setItem(PRESERVED_BLOCK_LAYOUTS_KEY, JSON.stringify(result));
    } catch {
      // Keep the same-Storage fallback when the map cannot be written back.
    }
  }
  preservedLayoutsInMemory = result;
  return result;
}

function writePreservedLayouts(layouts: PreservedLayouts): boolean {
  const sanitized = sanitizePreservedLayouts(layouts);
  try {
    const storage = resolveBrowserStorage();
    if (!storage) {
      fallbackStorageIdentity = null;
      preservedLayoutsInMemory = sanitized;
      return true;
    }
    fallbackStorageIdentity = storage;
    storage.setItem(PRESERVED_BLOCK_LAYOUTS_KEY, JSON.stringify(sanitized));
    preservedLayoutsInMemory = sanitized;
    return true;
  } catch {
    // The in-memory copy still protects positions during this reader session.
    fallbackStorageIdentity = resolveBrowserStorage() ?? null;
    preservedLayoutsInMemory = sanitized;
    return false;
  }
}

function inferredPreservedLayout(spaceKey: string, blockId: string): PreservedLayoutVersion | undefined {
  const stored = readPreservedLayouts()[spaceKey]?.[blockId];
  if (stored) return stored;
  const version = storedLayoutVersion();
  const position = getUiPreferences().act4Reading[spaceKey];
  if (position?.pageIndexByBlock[blockId] === undefined) return undefined;
  return version === '2' ? '2' : version === '3' ? undefined : '1';
}

export function isLegacyReaderLayout(): boolean {
  return storedLayoutVersion() !== READER_LAYOUT_VERSION;
}

/** Records each saved block's existing page budget without changing schema-13 or UI page indexes. */
export function migrateReaderLayoutPreferences(): void {
  if (!isLegacyReaderLayout()) return;
  const version = storedLayoutVersion();
  const sourceVersion: PreservedLayoutVersion = version === '2' ? '2' : '1';
  const preferences = getUiPreferences();
  const layouts = readPreservedLayouts();
  let changed = false;

  for (const [spaceKey, position] of Object.entries(preferences.act4Reading)) {
    const blockLayouts = { ...layouts[spaceKey] };
    for (const blockId of Object.keys(position.pageIndexByBlock)) {
      if (blockLayouts[blockId]) continue;
      blockLayouts[blockId] = sourceVersion;
      changed = true;
    }
    if (Object.keys(blockLayouts).length) layouts[spaceKey] = blockLayouts;
  }

  if (changed && !writePreservedLayouts(layouts)) {
    // Keep the old global version: without its durable per-block map, it remains the source of truth.
    return;
  }
  const storage = resolveBrowserStorage();
  try {
    if (storage) {
      storage.setItem(READER_LAYOUT_VERSION_KEY, READER_LAYOUT_VERSION);
      readerLayoutVersionInMemory = null;
      readerLayoutVersionStorageIdentity = storage;
    } else {
      readerLayoutVersionStorageIdentity = null;
      readerLayoutVersionInMemory = READER_LAYOUT_VERSION;
    }
  } catch {
    // Keep a version fallback scoped to this Storage instance for the active reader session.
    readerLayoutVersionStorageIdentity = storage ?? null;
    readerLayoutVersionInMemory = READER_LAYOUT_VERSION;
  }
}

export function readerPagesForStoredPosition(
  spaceKey: string,
  stage: Parameters<typeof readerPagesForBlock>[0],
  block: Act4NarrativeBlock,
): readonly ReturnType<typeof readerPagesForBlock>[number][] {
  const layoutVersion = inferredPreservedLayout(spaceKey, block.id);
  if (layoutVersion === '2') {
    return act4Existing560ReaderTextPages(stage, block.id, block.paragraphs, block.kind === 'novel-excerpt');
  }
  if (layoutVersion === '1') {
    return act4LegacyReaderTextPages(stage, block.id, block.paragraphs, block.kind === 'novel-excerpt');
  }
  return readerPagesForBlock(stage, block);
}

export function storedReaderPageIndex(
  _stage: Parameters<typeof readerPagesForBlock>[0],
  _block: Act4NarrativeBlock,
  pages: readonly ReturnType<typeof readerPagesForBlock>[number][],
  requested: number,
): number {
  return Math.max(0, Math.min(Math.max(0, pages.length - 1), Number.isInteger(requested) ? requested : 0));
}
