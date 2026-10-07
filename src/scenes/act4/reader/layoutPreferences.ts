import { act4CompatibleReaderPageIndex } from '../../../data/narrative/act4Presentation';
import { act4NarrativeSections, type Act4NarrativeBlock } from '../../../data/narrative/act4Narrative';
import { act4ReadingSpaceKey } from '../../../core/readingPosition';
import { getUiPreferences, setAct4ReadingPosition } from '../../../core/uiPreferences';
import { resolveBrowserStorage } from '../../../core/persistence/browserStorage';
import { readerPagesForBlock } from './readerModel';

const READER_LAYOUT_VERSION_KEY = 'anchao.a4-reader-layout';
const READER_LAYOUT_VERSION = '2';
let readerLayoutMigratedInMemory = false;

export function isLegacyReaderLayout(): boolean {
  if (readerLayoutMigratedInMemory) return false;
  try {
    return resolveBrowserStorage()?.getItem(READER_LAYOUT_VERSION_KEY) !== READER_LAYOUT_VERSION;
  } catch {
    return true;
  }
}

export function migrateReaderLayoutPreferences(): void {
  if (!isLegacyReaderLayout()) return;
  const preferences = getUiPreferences();
  for (const narrativeSection of act4NarrativeSections) {
    for (const mode of ['current', 'review'] as const) {
      const spaceKey = act4ReadingSpaceKey(narrativeSection.stage, mode)!;
      const position = preferences.act4Reading[spaceKey];
      if (!position) continue;
      const nextPageIndexByBlock = { ...position.pageIndexByBlock };
      for (const block of narrativeSection.blocks) {
        const requested = position.pageIndexByBlock[block.id];
        if (requested === undefined) continue;
        const pages = readerPagesForBlock(narrativeSection.stage, block)
          .filter((page) => page.role === 'page' || page.role === 'whole');
        nextPageIndexByBlock[block.id] = act4CompatibleReaderPageIndex(
          narrativeSection.stage,
          block.id,
          block.paragraphs,
          pages,
          requested,
          block.kind === 'novel-excerpt',
        );
      }
      setAct4ReadingPosition(spaceKey, { ...position, pageIndexByBlock: nextPageIndexByBlock });
    }
  }
  try {
    resolveBrowserStorage()?.setItem(READER_LAYOUT_VERSION_KEY, READER_LAYOUT_VERSION);
  } catch {
    // The in-memory migration still keeps this reader session on the safe paragraph boundary.
  }
  readerLayoutMigratedInMemory = true;
}

export function storedReaderPageIndex(
  stage: Parameters<typeof readerPagesForBlock>[0],
  block: Act4NarrativeBlock,
  pages: readonly ReturnType<typeof readerPagesForBlock>[number][],
  requested: number,
): number {
  if (isLegacyReaderLayout()) {
    return act4CompatibleReaderPageIndex(stage, block.id, block.paragraphs, pages, requested, block.kind === 'novel-excerpt');
  }
  return Math.max(0, Math.min(Math.max(0, pages.length - 1), Number.isInteger(requested) ? requested : 0));
}
