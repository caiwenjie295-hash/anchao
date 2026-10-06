import { describe, expect, it } from 'vitest';
import type { Act4TextSegment } from '../../../data/narrative/act4Presentation';
import { deriveReaderVisibility, type ReaderVisibilityBlock } from './readerVisibility';

const page = (from: number, to: number): Act4TextSegment => ({
  id: `page-${from}`,
  role: 'page',
  from,
  to,
  label: `page-${from}`,
});

describe('Act4 reader visibility', () => {
  it('keeps a covered page hidden from progress and only reveals its recap after the final text page', () => {
    const block = { id: 'T01_ORIGINAL', kind: 'novel-excerpt', paragraphs: ['one', 'two', 'three'], explanationId: 'A4_EXPLAIN_T01' };
    const pages = [page(0, 2), page(2, 3)];
    const covered = deriveReaderVisibility({
      visibleBlocks: [block],
      pageTargets: [{ blockId: block.id, pageIndex: 1, pages, page: pages[1], coverRequired: true, coverOpen: false }],
      sectionExplanationId: block.explanationId,
      partialRecapAvailable: false,
      explanationRevealAllowed: true,
    });
    expect(covered.displayedEnds.get(block.id)).toBe(0);
    expect(covered.visibleExplanationIds.has(block.explanationId)).toBe(false);

    const openFinalPage = deriveReaderVisibility({
      visibleBlocks: [block],
      pageTargets: [{ blockId: block.id, pageIndex: 1, pages, page: pages[1], coverRequired: true, coverOpen: true }],
      sectionExplanationId: block.explanationId,
      partialRecapAvailable: false,
      explanationRevealAllowed: true,
    });
    expect(openFinalPage.displayedEnds.get(block.id)).toBe(3);
    expect(openFinalPage.allVisibleTextDisplayed).toBe(true);
    expect(openFinalPage.visibleExplanationIds.has(block.explanationId)).toBe(true);
  });

  it('does not expose the section recap before its authored action is satisfied', () => {
    const block: ReaderVisibilityBlock = { id: 'T09_REPLY', kind: 'novel-excerpt', paragraphs: ['ending'] };
    const onlyPage = [page(0, 1)];
    const hidden = deriveReaderVisibility({
      visibleBlocks: [block],
      pageTargets: [{ blockId: block.id, pageIndex: 0, pages: onlyPage, page: onlyPage[0], coverRequired: false, coverOpen: false }],
      sectionExplanationId: 'A4_EXPLAIN_T09',
      partialRecapAvailable: false,
      explanationRevealAllowed: false,
    });
    expect(hidden.allVisibleTextDisplayed).toBe(true);
    expect(hidden.visibleExplanationIds.has('A4_EXPLAIN_T09')).toBe(false);
  });
});
