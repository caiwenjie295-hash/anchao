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
});
