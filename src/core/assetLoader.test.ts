import { describe, expect, it } from 'vitest';
import { assetLoader } from './assetLoader';

describe('second act art registration', () => {
  it('resolves every supplied or generated second-act image locally', () => {
    for (const id of ['IMG_A2_T02_001', 'IMG_A2_T03_001', ...Array.from({ length: 11 }, (_, index) => `IMG_A2_T05_${String(index + 1).padStart(3, '0')}`)]) {
      expect(assetLoader.get(id)?.src, id).toMatch(/IMG_A2_|data:image\/jpeg/);
      expect(assetLoader.isAvailable(id), id).toBe(true);
    }
  });
});

describe('third act art registration', () => {
  it('resolves every third-act image locally', () => {
    for (const [scene, count] of [[0, 12], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 8], [7, 8]]) {
      for (let image = 1; image <= count; image += 1) {
        const id = `IMG_A3_T${String(scene).padStart(2, '0')}_${String(image).padStart(3, '0')}`;
        expect(assetLoader.get(id)?.src, id).toMatch(/IMG_A3_T/);
        expect(assetLoader.isAvailable(id), id).toBe(true);
      }
    }
  });
});
