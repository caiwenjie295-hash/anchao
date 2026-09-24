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
