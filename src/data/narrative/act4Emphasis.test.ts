import { describe, expect, it } from 'vitest';
import { act4EmphasisRuns } from './act4Emphasis';
import { act4NarrativeSections } from './act4Narrative';

describe('A4 text emphasis', () => {
  it('preserves every original paragraph character and emphasizes only source substrings', () => {
    for (const section of act4NarrativeSections) {
      for (const block of section.blocks) {
        for (const paragraph of block.paragraphs) {
          const runs = act4EmphasisRuns(section.stage, block.id, paragraph);
          expect(runs.map((run) => run.text).join('')).toBe(paragraph);
          for (const run of runs) expect(paragraph.includes(run.text) || run.text === '').toBe(true);
        }
      }
    }
  });

  it('finds at least one authored phrase in each stage T01 through T10', () => {
    for (const section of act4NarrativeSections) {
      const emphasizedCount = section.blocks.flatMap((block) => block.paragraphs)
        .reduce((count, paragraph) => count + act4EmphasisRuns(section.stage, '', paragraph).filter((run) => run.emphasized).length, 0);
      expect(emphasizedCount, section.stage).toBeGreaterThan(0);
    }
  });

  it('emphasizes visible details across the long T04 and T06–T09 readings', () => {
    const expectedPhrases = {
      T04: ['发件人：启明'],
      T06: ['固定的一块肉', '《二十四孝图》', '机械地重复', '睡前广播', '头脑混沌', '禁闭室'],
      T07: ['双 S 标志', '陌生', '地下室的厨房', '感谢您的恩赐'],
      T08: ['主题：VVaKe', '20200419', '透明胶', '我是黄子山', '广播室'],
      T09: ['笔记塞进塑料袋', '往门外走', '广播传来声音', '“回收完成。”'],
    } as const;

    for (const [stage, phrases] of Object.entries(expectedPhrases)) {
      const section = act4NarrativeSections.find((item) => item.stage === stage);
      expect(section, stage).toBeDefined();
      const paragraphs = section!.blocks.flatMap((block) => block.paragraphs);
      for (const phrase of phrases) {
        const isEmphasized = paragraphs.some((paragraph) =>
          act4EmphasisRuns(stage as keyof typeof expectedPhrases, '', paragraph)
            .some((run) => run.emphasized && run.text === phrase),
        );
        expect(isEmphasized, `${stage}: ${phrase}`).toBe(true);
      }
    }
  });

  it('emphasizes at most one phrase per paragraph', () => {
    for (const section of act4NarrativeSections) {
      for (const block of section.blocks) {
        for (const paragraph of block.paragraphs) {
          const emphasizedCount = act4EmphasisRuns(section.stage, block.id, paragraph).filter((run) => run.emphasized).length;
          expect(emphasizedCount).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
