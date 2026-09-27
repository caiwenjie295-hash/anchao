import { describe, expect, it } from 'vitest';
import imageDocument from '../../data/images.json';
import { act3FirstLensId, act3StageClueIds, act3StageDoc, type AuthoredAct3Stage } from './act3Data';

describe('third-act authored lens graph', () => {
  it('keeps each stage navigable with registered resource IDs and unique clues', () => {
    const imageIds = new Set(imageDocument.items.map((image) => image.id));
    for (const stage of ['T00', 'T01', 'T02', 'T03'] as AuthoredAct3Stage[]) {
      const doc = act3StageDoc(stage);
      const lensIds = new Set(doc.lenses.map((lens) => lens.id));
      expect(doc.stage).toBe(stage);
      expect(lensIds.size).toBe(doc.lenses.length);
      expect(lensIds.has(act3FirstLensId(stage))).toBe(true);
      expect(act3StageClueIds(stage).length).toBeGreaterThan(0);
      for (const lens of doc.lenses) {
        expect(imageIds.has(lens.assetId), lens.id).toBe(true);
        for (const linkId of lens.links) expect(lensIds.has(linkId), `${lens.id} → ${linkId}`).toBe(true);
      }
    }
  });
});
