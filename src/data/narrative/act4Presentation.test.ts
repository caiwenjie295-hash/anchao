import { describe, expect, it } from 'vitest';
import { act4NarrativeSections } from './act4Narrative';
import { act4PagePresentation, act4TextSegments } from './act4Presentation';

describe('Act4 reading presentation', () => {
  it('partitions every source block contiguously and reconstructs the exact original paragraphs', () => {
    for (const section of act4NarrativeSections) {
      for (const block of section.blocks) {
        const segments = act4TextSegments(section.stage, block.id, block.paragraphs.length);
        let cursor = 0;
        const reconstructed: string[] = [];
        for (const segment of segments) {
          expect(segment.from).toBe(cursor);
          expect(segment.to).toBeGreaterThan(segment.from);
          expect(segment.to).toBeLessThanOrEqual(block.paragraphs.length);
          reconstructed.push(...block.paragraphs.slice(segment.from, segment.to));
          cursor = segment.to;
        }
        expect(cursor).toBe(block.paragraphs.length);
        expect(reconstructed).toEqual(block.paragraphs);
      }
    }
  });

  it('gives the hotel notebook nine pages and the microblog one date per page', () => {
    const notebook = act4NarrativeSections.find((section) => section.stage === 'T01')!.blocks[0];
    const notebookPages = act4TextSegments('T01', notebook.id, notebook.paragraphs.length).filter((segment) => segment.role === 'page');
    expect(notebookPages).toHaveLength(9);
    expect(notebookPages.map(({ label }) => label)).toEqual(Array.from({ length: 9 }, (_, index) => `笔记第 ${index + 1} 页`));

    const microblog = act4NarrativeSections.find((section) => section.stage === 'T03')!.blocks[0];
    const dates = act4TextSegments('T03', microblog.id, microblog.paragraphs.length).filter((segment) => segment.role === 'page');
    expect(dates).toHaveLength(14);
    expect(dates.every(({ from, to }) => /^2020 年 4 月 \d+ 日$/.test(microblog.paragraphs[from]) && to === from + 2)).toBe(true);
  });

  it('keeps the T09 broadcast as one continuous block with the final recovery line', () => {
    const broadcast = act4NarrativeSections.find((section) => section.stage === 'T09')!.blocks.find((block) => block.id === 'T09_BROADCAST')!;
    const segments = act4TextSegments('T09', broadcast.id, broadcast.paragraphs.length);
    expect(segments).toHaveLength(1);
    expect(broadcast.paragraphs.slice(segments[0].from, segments[0].to).at(-1)).toBe('“回收完成。”');
  });

  it('changes the T05 title, date, and scene image only with the selected semantic page', () => {
    expect(act4PagePresentation('T05', 0)).toEqual({
      title: '晚自习', periodLabel: '2014 年 12 月 28 日',
      illustrationAssetId: 'IMG_A4_T05_001', illustrationAlt: '王澳在晚自习时把日记藏在练习册下',
    });
    expect(act4PagePresentation('T05', 1)?.title).toBe('李老师的办公室');
    expect(act4PagePresentation('T05', 1)?.periodLabel).toBe('2014 年 12 月 28 日');
    expect(act4PagePresentation('T05', 2)?.title).toBe('生日白天');
    expect(act4PagePresentation('T05', 2)?.periodLabel).toBe('2014 年 12 月 29 日');
    expect(act4PagePresentation('T05', 4)?.illustrationAssetId).toBe('IMG_A4_T05_006');
    expect(act4PagePresentation('T06', 3)?.illustrationAssetId).toBe('IMG_A4_T06_006');
    expect(act4PagePresentation('T07', 2)?.illustrationAssetId).toBe('IMG_A4_T07_005');
  });
});
