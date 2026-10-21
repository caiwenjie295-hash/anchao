import type { Act4TextSegment } from '../../../data/narrative/act4Presentation';

export interface ReaderVisibilityBlock {
  id: string;
  kind: string;
  paragraphs: readonly string[];
  explanationId?: string;
}

export interface ReaderVisibilityPageTarget {
  blockId: string;
  pageIndex: number;
  pages: readonly Act4TextSegment[];
  page: Act4TextSegment;
  coverRequired: boolean;
  coverOpen: boolean;
  displayedParagraphEnd?: number;
}

export function deriveReaderVisibility({
  visibleBlocks,
  pageTargets,
  sectionExplanationId,
  partialRecapAvailable,
  explanationRevealAllowed,
}: {
  visibleBlocks: readonly ReaderVisibilityBlock[];
  pageTargets: readonly ReaderVisibilityPageTarget[];
  sectionExplanationId?: string;
  partialRecapAvailable: boolean;
  explanationRevealAllowed: boolean;
}): {
  displayedEnds: ReadonlyMap<string, number>;
  allVisibleTextDisplayed: boolean;
  visibleExplanationIds: ReadonlySet<string>;
} {
  const displayedEnds = new Map(pageTargets.map((target) => {
    const coverAllowsText = !target.coverRequired || target.coverOpen;
    const atEnd = target.pageIndex === target.pages.length - 1;
    return [target.blockId, !coverAllowsText ? 0 : target.displayedParagraphEnd ?? (atEnd ? visibleBlocks.find((block) => block.id === target.blockId)?.paragraphs.length ?? 0 : target.page.to)] as const;
  }));
  const hasDisplayedBlock = (block: ReaderVisibilityBlock) => (displayedEnds.get(block.id) ?? 0) >= block.paragraphs.length;
  const allVisibleTextDisplayed = visibleBlocks.filter((block) => block.kind !== 'adaptation-bridge').every(hasDisplayedBlock);
  const visibleExplanationIds = new Set<string>();
  for (const block of visibleBlocks) {
    if (!block.explanationId) continue;
    if (block.explanationId === sectionExplanationId && !allVisibleTextDisplayed && !partialRecapAvailable) continue;
    if (block.explanationId !== sectionExplanationId && !hasDisplayedBlock(block)) continue;
    visibleExplanationIds.add(block.explanationId);
  }
  if ((allVisibleTextDisplayed || partialRecapAvailable) && explanationRevealAllowed && sectionExplanationId) {
    visibleExplanationIds.add(sectionExplanationId);
  }
  return { displayedEnds, allVisibleTextDisplayed, visibleExplanationIds };
}
