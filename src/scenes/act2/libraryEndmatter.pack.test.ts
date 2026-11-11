import { describe, expect, it } from 'vitest';
import {
  estimateParagraphSliceHeight,
  findSpreadIndexForParagraph,
  layoutTaleSpreads,
  packParagraphsToHeight,
  packParagraphsUntil,
} from './libraryEndmatter';
import { tales } from '../../data/act2TalesData';

describe('packParagraphsToHeight', () => {
  it('fills a face with as many whole paragraphs as the measured budget allows', () => {
    const heights: Record<string, number> = { a: 40, b: 40, c: 40, d: 40 };
    const measure = (slice: readonly string[]) => slice.reduce((sum, item) => sum + heights[item], 0);
    expect(packParagraphsToHeight(['a', 'b', 'c', 'd'], measure, 100)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps a single overflowing paragraph on its own face rather than dropping it', () => {
    const measure = (slice: readonly string[]) => slice.reduce((sum, item) => sum + item.length * 20, 0);
    expect(packParagraphsToHeight(['abcdefghij'], measure, 50)).toEqual([['abcdefghij']]);
  });

  it('packs 石工补指 into more than four lines of content on the first face when the budget is generous', () => {
    const mason = tales.find((tale) => tale.title === '石工补指') ?? tales[0];
    const chunks = packParagraphsToHeight(
      mason.paragraphs ?? [],
      (slice) => estimateParagraphSliceHeight(slice, 16),
      360,
    );
    const first = chunks[0] ?? [];
    const firstChars = first.join('').length;
    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(firstChars).toBeGreaterThan(80);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat().join('\u0000')).toBe((mason.paragraphs ?? []).join('\u0000'));
  });
});

describe('layoutTaleSpreads', () => {
  it('keeps the paired record on the left when three or fewer faces are needed', () => {
    const spreads = layoutTaleSpreads([['a'], ['b'], ['c']]);
    expect(spreads).toHaveLength(3);
    expect(spreads.every((spread) => spread.mode === 'paired' && spread.left === null)).toBe(true);
    expect(spreads.map((spread) => spread.right)).toEqual([['a'], ['b'], ['c']]);
  });

  it('uses both faces on continuation spreads when more than three faces are needed', () => {
    const spreads = layoutTaleSpreads([['a'], ['b'], ['c'], ['d'], ['e']]);
    expect(spreads).toHaveLength(3);
    expect(spreads[0]).toMatchObject({ mode: 'paired', right: ['a'], left: null });
    expect(spreads[1]).toMatchObject({ mode: 'dual', left: ['b'], right: ['c'] });
    expect(spreads[2]).toMatchObject({ mode: 'dual', left: ['d'], right: ['e'] });
  });

  it('keeps dual continuations even when re-packing the leftover fits in three faces', () => {
    const spreads = layoutTaleSpreads([['a'], ['b'], ['c']], true);
    expect(spreads).toHaveLength(2);
    expect(spreads[0]).toMatchObject({ mode: 'paired', right: ['a'], left: null });
    expect(spreads[1]).toMatchObject({ mode: 'dual', left: ['b'], right: ['c'] });
  });
});

describe('packParagraphsUntil', () => {
  it('fills a face with every paragraph that still fits', () => {
    const fits = (slice: readonly string[]) => slice.join('').length <= 4;
    expect(packParagraphsUntil(['aa', 'bb', 'cc', 'dd'], (slice) => fits(slice), ['first-right', 'first-right'])).toEqual([
      ['aa', 'bb'],
      ['cc', 'dd'],
    ]);
  });
});

describe('findSpreadIndexForParagraph', () => {
  it('finds the spread that contains a previously visible first paragraph after a re-pack', () => {
    const before = layoutTaleSpreads([['a'], ['b'], ['c'], ['d']], true);
    expect(before[2]?.left?.[0]).toBe('d');
    const after = layoutTaleSpreads([['a'], ['b', 'c', 'd']], true);
    expect(findSpreadIndexForParagraph(after, 'd')).toBe(1);
    expect(findSpreadIndexForParagraph(after, 'a')).toBe(0);
    expect(findSpreadIndexForParagraph(after, 'missing')).toBe(-1);
  });
});
