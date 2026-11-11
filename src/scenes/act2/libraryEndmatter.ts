import { act2Tales, taleById, tales, type TaleRecord } from '../../data/act2TalesData';

/** 风土志 volume that visually hosts the 卷末 spreads. Data pages themselves are unchanged. */
export const FENGTUZHI_VOLUME_ID = 'VOLUME_A2_T03_002';
export const ENDMATTER_DIVIDER_TITLE = '卷末 · 乡录残页';

export type EndmatterKind = 'divider' | 'record' | 'tale' | 'empty';
export type EndmatterLeaf = { kind: EndmatterKind; record?: TaleRecord };
export type EndmatterSpread = { left: EndmatterLeaf; right: EndmatterLeaf };

const records = act2Tales.records;

/** Presentation-only cursor over act2_tales.json, in the agreed original order. */
export const ENDMATTER_SPREADS: EndmatterSpread[] = [
  { left: { kind: 'divider' }, right: { kind: 'empty' } },
  { left: { kind: 'record', record: records[0] }, right: { kind: 'tale', record: records[1] } },
  { left: { kind: 'record', record: records[2] }, right: { kind: 'tale', record: records[3] } },
  { left: { kind: 'record', record: records[4] }, right: { kind: 'tale', record: records[5] } },
  { left: { kind: 'record', record: records[6] }, right: { kind: 'record', record: records[7] } },
];

export const FENGTUZHI_TOC_PAGE_ID = 'PAGE_A2_T03_004';

export function taleIdsOnSpread(spread: EndmatterSpread | undefined): string[] {
  if (!spread) return [];
  return [spread.left, spread.right]
    .filter((leaf): leaf is EndmatterLeaf & { record: TaleRecord } => leaf.kind === 'tale' && Boolean(leaf.record) && taleById.has(leaf.record!.id))
    .map((leaf) => leaf.record.id);
}

export function endmatterIndexForTale(taleId: string): number {
  return ENDMATTER_SPREADS.findIndex((spread) => spread.left.record?.id === taleId || spread.right.record?.id === taleId);
}

export function endmatterIndexForRecord(recordId: string): number {
  return ENDMATTER_SPREADS.findIndex((spread) => spread.left.record?.id === recordId || spread.right.record?.id === recordId);
}

export function initialEndmatterIndex(readTaleIds: readonly string[]): number {
  if (readTaleIds.length === 0) return 0;
  const unread = tales.find((tale) => !readTaleIds.includes(tale.id));
  if (!unread) return 0;
  const index = endmatterIndexForTale(unread.id);
  return index >= 0 ? index : 0;
}

export function countDistinctTaleSources(evidenceIds: readonly string[], evidenceById: ReadonlyMap<string, { taleId: string }>): number {
  return new Set(evidenceIds.map((id) => evidenceById.get(id)?.taleId).filter((id): id is string => Boolean(id))).size;
}

export const fengtuzhiTales = tales;

/** Switchable presentation pages for 岁时 / 庙会 / 野祠. Data JSON is unchanged. */
export const SHOW_FENGTUZHI_MISSING_PAGES = true;

export const FENGTUZHI_MISSING_CHAPTERS = [
  { id: 'suishi', title: '岁时' },
  { id: 'miaohui', title: '庙会' },
  { id: 'yeci', title: '野祠' },
] as const;

export const FENGTUZHI_GAZETTE_PAGE_IDS = ['PAGE_A2_T03_003', 'PAGE_A2_T03_004', 'PAGE_A2_T03_005'] as const;
export const FENGTUZHI_TARGET_PAGE_ID = 'PAGE_A2_T03_005';

/**
 * Presentation-only leaf numbers. Printed 「卷末第N页」 stays authoritative (6–13).
 * 卷首 and 目次 are unnumbered front matter, like real prelims.
 * Arabic numbering then runs: 阙 第 1–2 页, 补母志 第 3–4 页,
 * the 卷末 half-title 第 5 页 (blank verso unnumbered; flags still only write on a tale leaf),
 * then the eight 卷末 leaves 6–13.
 * Every numbered spread uses left N and right N+1 in the bottom bar only.
 */
export const BOOK_LEAF_TOTAL = 13;
export const DIVIDER_LEAF = 5;

const CN_LEAF: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  十: 10, 十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15,
};

export function parseJuanmoLeaf(page: string | undefined): number | null {
  if (!page) return null;
  const match = page.match(/第([一二三四五六七八九十]+)页/);
  if (!match) return null;
  return CN_LEAF[match[1]] ?? null;
}

export function leafNumberForRecord(record: TaleRecord | undefined): number | null {
  return record ? parseJuanmoLeaf(record.page) : null;
}

export function frontLeaves(kind: 'juanshou' | 'toc' | 'missing' | 'bumuzhi'): number[] {
  switch (kind) {
    case 'juanshou': return [];
    case 'toc': return [];
    case 'missing': return [1, 2];
    case 'bumuzhi': return [3, 4];
  }
}

export function leavesForEndmatterSpread(spread: EndmatterSpread | undefined): number[] {
  if (!spread) return [];
  if (spread.left.kind === 'divider') return [DIVIDER_LEAF];
  return [spread.left, spread.right]
    .map((leaf) => leafNumberForRecord(leaf.record))
    .filter((value): value is number => value != null);
}

export function formatLeafFooter(leaves: readonly number[], total = BOOK_LEAF_TOTAL): string {
  if (leaves.length === 0) return '';
  if (leaves.length >= 2 && leaves[0] !== leaves[leaves.length - 1]) {
    return `第 ${leaves[0]}–${leaves[leaves.length - 1]} 页 / 共 ${total} 页`;
  }
  return `第 ${leaves[0]} 页 / 共 ${total} 页`;
}

export function formatOneLeaf(leaf: number, total = BOOK_LEAF_TOTAL): string {
  return `第 ${leaf} 页 / 共 ${total} 页`;
}

export function formatTocLeafLabel(leaves: readonly number[]): string {
  if (leaves.length === 0) return '';
  if (leaves.length >= 2 && leaves[0] !== leaves[leaves.length - 1]) {
    return `第 ${leaves[0]}–${leaves[leaves.length - 1]} 页`;
  }
  return `第 ${leaves[0]} 页`;
}

export type MeasureParagraphSlice = (paragraphs: readonly string[]) => number;


export type TaleFaceKind = 'first-right' | 'cont-left' | 'cont-right';

/** Pack whole paragraphs onto faces, using a real-layout `fits` check per face kind. */
export function packParagraphsUntil(
  paragraphs: readonly string[],
  fits: (slice: readonly string[], kind: TaleFaceKind) => boolean,
  kinds: readonly TaleFaceKind[],
): string[][] {
  if (paragraphs.length === 0) return [[]];
  const chunks: string[][] = [];
  let index = 0;
  let kindIndex = 0;
  while (index < paragraphs.length) {
    const kind = kinds[Math.min(kindIndex, kinds.length - 1)] ?? 'first-right';
    let take = 1;
    while (index + take < paragraphs.length && fits(paragraphs.slice(index, index + take + 1), kind)) {
      take += 1;
    }
    chunks.push([...paragraphs.slice(index, index + take)]);
    index += take;
    kindIndex += 1;
  }
  return chunks;
}

export const PAIRED_SPREAD_LIMIT = 3;

export type TaleSpreadPlan = {
  mode: 'paired' | 'dual';
  left: string[] | null;
  right: string[];
  leftFaceIndex: number | null;
  rightFaceIndex: number | null;
  faceCount: number;
};

/** First spread keeps the paired record. Further spreads use both faces when right-only packing would need more than three. */
export function layoutTaleSpreads(chunks: string[][], dualContinuations = false): TaleSpreadPlan[] {
  const faces = chunks.length === 0 ? [[]] : chunks;
  const faceCount = faces.length;
  const useDual = dualContinuations || faceCount > PAIRED_SPREAD_LIMIT;
  if (!useDual || faceCount <= 1) {
    return faces.map((right, index) => ({
      mode: 'paired' as const,
      left: null,
      right,
      leftFaceIndex: null,
      rightFaceIndex: index,
      faceCount,
    }));
  }
  const spreads: TaleSpreadPlan[] = [{
    mode: 'paired',
    left: null,
    right: faces[0] ?? [],
    leftFaceIndex: null,
    rightFaceIndex: 0,
    faceCount,
  }];
  for (let index = 1; index < faces.length; index += 2) {
    const left = faces[index];
    const right = faces[index + 1];
    spreads.push({
      mode: 'dual',
      left,
      right: right ?? [],
      leftFaceIndex: index,
      rightFaceIndex: right ? index + 1 : null,
      faceCount,
    });
  }
  return spreads;
}

/** After a re-pack, stay on the spread that still contains this paragraph. */
export function findSpreadIndexForParagraph(spreads: readonly TaleSpreadPlan[], paragraph: string | null | undefined): number {
  if (!paragraph) return -1;
  return spreads.findIndex((spread) => (spread.left ?? []).includes(paragraph) || spread.right.includes(paragraph));
}

/** Pack as many whole paragraphs as will fit in `budgetPx` before starting a new face. */
export function packParagraphsToHeight(
  paragraphs: readonly string[],
  measure: MeasureParagraphSlice,
  budgetPx: number,
): string[][] {
  if (paragraphs.length === 0) return [[]];
  const budget = Math.max(1, budgetPx);
  const chunks: string[][] = [];
  let index = 0;
  while (index < paragraphs.length) {
    let take = 1;
    while (index + take < paragraphs.length && measure(paragraphs.slice(index, index + take + 1)) <= budget) {
      take += 1;
    }
    chunks.push([...paragraphs.slice(index, index + take)]);
    index += take;
  }
  return chunks;
}

/** Typographic fallback used when the book has no measurable layout (jsdom). */
export const ESTIMATE_TALE_FACE = {
  widthPx: 300,
  lineHeight: 1.85,
  paragraphGapEm: 0.8,
  budgetPx: 360,
} as const;

export function estimateParagraphSliceHeight(
  paragraphs: readonly string[],
  fontSizePx = 16,
  widthPx = ESTIMATE_TALE_FACE.widthPx,
): number {
  const lineHeightPx = fontSizePx * ESTIMATE_TALE_FACE.lineHeight;
  const gapPx = fontSizePx * ESTIMATE_TALE_FACE.paragraphGapEm;
  const charsPerLine = Math.max(6, Math.floor((widthPx - fontSizePx * 2) / fontSizePx));
  let height = 0;
  paragraphs.forEach((paragraph, index) => {
    const lines = Math.max(1, Math.ceil(paragraph.length / charsPerLine));
    height += lines * lineHeightPx + (index < paragraphs.length - 1 ? gapPx : 0);
  });
  return height;
}

export function estimateTaleChunks(paragraphs: readonly string[], fontSizePx = 16): string[][] {
  return packParagraphsToHeight(
    paragraphs,
    (slice) => estimateParagraphSliceHeight(slice, fontSizePx),
    ESTIMATE_TALE_FACE.budgetPx,
  );
}

/** @deprecated Prefer packParagraphsToHeight / estimateTaleChunks. Character budgets are ignored. */
export function chunkParagraphs(paragraphs: readonly string[], _firstBudget = 140, _laterBudget = 190): string[][] {
  return estimateTaleChunks(paragraphs);
}

/** @deprecated kept as a name some tests may import; prefer BOOK_LEAF_TOTAL. */
export const MISSING_PAGE_COUNT = SHOW_FENGTUZHI_MISSING_PAGES ? 1 : 0;

export function fengtuzhiTotalSpreads(): number {
  return BOOK_LEAF_TOTAL;
}

export function pageNumberForGazetteIndex(pageIndex0: number): number {
  if (pageIndex0 <= 1) return 0;
  return 3;
}

export function pageNumberForMissingIndex(_missingIndex0: number): number {
  return 1;
}

export function pageNumberForEndmatterIndex(endmatterIndex: number): number {
  const spread = ENDMATTER_SPREADS[endmatterIndex];
  return leavesForEndmatterSpread(spread)[0] ?? 0;
}
