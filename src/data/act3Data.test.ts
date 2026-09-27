import { describe, expect, it } from 'vitest';
import imageDocument from '../../data/images.json';
import { act3FirstLensId, act3StageClueIds, act3StageDoc, type AuthoredAct3Stage } from './act3Data';

describe('third-act authored lens graph', () => {
  it('keeps each stage navigable with registered resource IDs and unique clues', () => {
    const imageIds = new Set(imageDocument.items.map((image) => image.id));
    for (const stage of ['T00', 'T01', 'T02', 'T03', 'T04'] as AuthoredAct3Stage[]) {
      const doc = act3StageDoc(stage);
      const lensIds = new Set(doc.lenses.map((lens) => lens.id));
      expect(doc.stage).toBe(stage);
      expect(lensIds.size).toBe(doc.lenses.length);
      expect(lensIds.has(act3FirstLensId(stage))).toBe(true);
      expect(act3StageClueIds(stage).length).toBeGreaterThan(0);
      for (const lens of doc.lenses) {
        expect(imageIds.has(lens.assetId), lens.id).toBe(true);
        for (const linkId of lens.links) expect(lensIds.has(linkId), `${lens.id} → ${linkId}`).toBe(true);
        for (const clueId of lens.requiresClueIds ?? []) expect(act3StageClueIds(stage)).toContain(clueId);
      }
    }
  });

  it('keeps the archive paper words exact and locked behind the crouched view', () => {
    const doc = act3StageDoc('T04');
    const paper = doc.lenses.find((lens) => lens.id === 'LENS_A3_T04_005')!;
    expect(paper.requiresClueIds).toEqual(['CLUE_A3_T04_PAPER_EDGE']);
    expect(paper.description).toContain('VVaKe');
    for (const word of ['蜘蛛', '雨伞', '白走廊', '台灯', '风车', '曼陀罗']) expect(paper.description).toContain(word);
    expect(doc.lenses.slice(0, 4).some((lens) => lens.description.includes('VVaKe'))).toBe(false);
  });
});
