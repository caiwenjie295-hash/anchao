import { describe, expect, it } from 'vitest';
import { act4NarrativeSections } from './act4Narrative';
import {
  act4CompatibleReaderPageIndex,
  act4LegacyReaderTextPages,
  act4PagePresentation,
  act4PrivateBlogPosts,
  act4ReaderTextPages,
  act4TextSegments,
} from './act4Presentation';

type Stage = Parameters<typeof act4TextSegments>[0];
const section = (stage: Stage) => act4NarrativeSections.find((item) => item.stage === stage)!;
const block = (stage: Stage, id: string) => section(stage).blocks.find((item) => item.id === id)!;
const readablePages = (pages: ReturnType<typeof act4ReaderTextPages>) => pages.filter((page) => page.role === 'page' || page.role === 'whole');

describe('Act 4 presentation boundaries', () => {
  it('keeps the fourteen original T03 date and post pairs separate from its introduction and closing reaction', () => {
    const source = block('T03', 'T03_ORIGINAL').paragraphs;
    const posts = act4PrivateBlogPosts(source);

    expect(source[0]).toBe('微博：');
    expect(posts).toHaveLength(14);
    expect(posts.flatMap((post) => [post.dateText, post.text])).toEqual(source.slice(1, 29));
    expect(posts[0].dateText).toBe('2020 年 4 月 3 日');
    expect(posts.at(-1)?.dateText).toBe('2020 年 4 月 19 日');
    expect(source.at(-1)).toContain('我们看完了小 A 的微博');
    expect(posts.some((post) => post.text === source.at(-1))).toBe(false);
  });

  it('preserves the baseline T08 archive and kitchen scenes while remapping every real legacy page start safely', () => {
    const scenarios = [
      { blockId: 'T08_ARCHIVE', expectedScenes: ['T08_ARCHIVE_SHELVES', 'T08_ARCHIVE_DOSSIER', 'T08_ARCHIVE_MIRROR', 'T08_ARCHIVE_STEPS'] },
      { blockId: 'T08_KITCHEN_ESCAPE', expectedScenes: ['T08_KITCHEN_VIEW', 'T08_KITCHEN_REACTION', 'T08_KITCHEN_RETREAT', 'T08_FIRE_BOX'] },
    ];

    for (const scenario of scenarios) {
      const source = block('T08', scenario.blockId).paragraphs;
      const baselineScenes = act4TextSegments('T08', scenario.blockId, source.length);
      expect(baselineScenes.map((scene) => scene.id)).toEqual(scenario.expectedScenes);

      const legacyPages = readablePages(act4LegacyReaderTextPages('T08', scenario.blockId, source, true));
      const currentPages = readablePages(act4ReaderTextPages('T08', scenario.blockId, source, true));
      expect(legacyPages.length).toBeGreaterThan(4);
      expect(currentPages.length).toBeGreaterThan(0);
      expect(currentPages.map((page) => page.sceneId)).toEqual(expect.arrayContaining(scenario.expectedScenes));

      for (const [legacyIndex, legacyPage] of legacyPages.entries()) {
        const mappedIndex = act4CompatibleReaderPageIndex('T08', scenario.blockId, source, currentPages, legacyIndex, true);
        const mappedPage = currentPages[mappedIndex];
        expect(mappedPage, `${scenario.blockId} legacy page ${legacyIndex + 1}`).toBeDefined();
        expect(mappedPage.from).toBeLessThanOrEqual(legacyPage.from);
        expect(mappedPage.to).toBeGreaterThan(legacyPage.from);
        expect(source.slice(mappedPage.from, mappedPage.to)).toContain(source[legacyPage.from]);
      }

      const reconstructed = currentPages.flatMap((page) => source.slice(page.from, page.to));
      expect(reconstructed).toEqual(source);
    }
  });

  it('keeps the new mirror-scene illustration on its existing T08 scene boundary', () => {
    const source = block('T08', 'T08_ARCHIVE').paragraphs;
    const mirror = readablePages(act4ReaderTextPages('T08', 'T08_ARCHIVE', source, true))
      .find((page) => page.sceneId === 'T08_ARCHIVE_MIRROR')!;
    const sceneIndex = mirror.sceneIndex!;
    expect(sceneIndex).toBe(2);
    expect(act4PagePresentation('T08', 0, 'T08_ARCHIVE', mirror.sceneLabel, sceneIndex)?.illustrationAssetId)
      .toBe('IMG_A4_READING_DETAIL_001');
  });

  it('places the neutral final-reading illustration on the final-email cover', () => {
    expect(act4PagePresentation('T10', 0, 'T10_FINAL_MAIL')?.illustrationAssetId).toBe('IMG_A4_FINAL_READING_001');
  });
});

describe('Act4 reading presentation baseline checks', () => {
  it('partitions every source block contiguously and reconstructs the exact original paragraphs', () => {
    for (const narrativeSection of act4NarrativeSections) {
      for (const narrativeBlock of narrativeSection.blocks) {
        const segments = act4TextSegments(narrativeSection.stage, narrativeBlock.id, narrativeBlock.paragraphs.length);
        let cursor = 0;
        const reconstructed: string[] = [];
        for (const segment of segments) {
          expect(segment.from).toBe(cursor);
          expect(segment.to).toBeGreaterThan(segment.from);
          expect(segment.to).toBeLessThanOrEqual(narrativeBlock.paragraphs.length);
          reconstructed.push(...narrativeBlock.paragraphs.slice(segment.from, segment.to));
          cursor = segment.to;
        }
        expect(cursor).toBe(narrativeBlock.paragraphs.length);
        expect(reconstructed).toEqual(narrativeBlock.paragraphs);
      }
    }
  });

  it('gives the hotel notebook nine pages and the microblog one date per page', () => {
    const notebook = act4NarrativeSections.find((item) => item.stage === 'T01')!.blocks[0];
    const notebookPages = act4TextSegments('T01', notebook.id, notebook.paragraphs.length).filter((segment) => segment.role === 'page');
    expect(notebookPages).toHaveLength(9);
    expect(notebookPages.map(({ label }) => label)).toEqual(Array.from({ length: 9 }, (_, index) => `笔记第 ${index + 1} 页`));

    const microblog = act4NarrativeSections.find((item) => item.stage === 'T03')!.blocks[0];
    const dates = act4TextSegments('T03', microblog.id, microblog.paragraphs.length).filter((segment) => segment.role === 'page');
    expect(dates).toHaveLength(14);
    expect(dates.every(({ from, to }) => /^2020 年 4 月 \d+ 日$/.test(microblog.paragraphs[from]) && to === from + 2)).toBe(true);
  });

  it('keeps the T09 broadcast as one continuous block with the final recovery line', () => {
    const broadcast = act4NarrativeSections.find((item) => item.stage === 'T09')!.blocks.find((item) => item.id === 'T09_BROADCAST')!;
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
    expect(act4PagePresentation('T06', 3)?.illustrationAssetId).toBe('IMG_A4_T06_007');
    expect(act4PagePresentation('T07', 2)?.illustrationAssetId).toBe('IMG_A4_T07_005');
  });

  it('uses the corrected confinement, campus and post-kitchen images without repeating the kitchen scene', () => {
    expect(act4PagePresentation('T06', 3)?.illustrationAssetId).toBe('IMG_A4_T06_007');
    expect(act4PagePresentation('T08', 2, 'T08_RETURN')?.illustrationAssetId).toBe('IMG_A4_T08_011');
    expect(act4PagePresentation('T08', 0, 'T08_KITCHEN_ESCAPE')?.illustrationAssetId).toBe('IMG_A4_T08_010');
    expect(act4PagePresentation('T08', 1, 'T08_KITCHEN_ESCAPE')).toEqual({
      illustrationAssetId: 'IMG_A4_FINALE_FEAR_001',
      illustrationAlt: '王澳在地下厨房边惊惧地回望，视线开始模糊',
    });
    expect(act4PagePresentation('T08', 2, 'T08_KITCHEN_ESCAPE')?.illustrationAssetId).toBeUndefined();
    expect(act4PagePresentation('T08', 3, 'T08_KITCHEN_ESCAPE')?.illustrationAssetId).toBe('IMG_A4_T08_012');
  });
});
