import { describe, expect, it } from 'vitest';
import images from '../../data/images.json';
import { birthdayImageSlots } from '../data/act4/assets';
import { laterScenes } from '../data/act4/laterContent';
import { act4AssetPath, assetLoader } from './assetLoader';

describe('fourth act art registration', () => {
  it('maps all 40 distinct IDs to their stage PNGs and discovers delivered files', () => {
    const deliveredFiles = import.meta.glob('../第四幕/T*/*.png');
    const records = images.items.filter((item) => item.id.startsWith('IMG_A4_'));
    const expected = [
      'IMG_A4_T01_001',
      ...birthdayImageSlots.map((slot) => slot.assetId),
      ...laterScenes.map((scene) => scene.assetId),
    ];
    expect(records).toHaveLength(40);
    expect(new Set(expected).size).toBe(40);
    expect(records.map((record) => record.id).sort()).toEqual(expected.sort());
    for (const record of records) {
      const path = act4AssetPath(record.id, record.file);
      expect(path, record.id).toBe(`../第四幕/${record.id.slice(7, 10)}/${record.id}.png`);
      expect(assetLoader.get(record.id)?.id).toBe(record.id);
      if (path! in deliveredFiles) {
        expect(assetLoader.isAvailable(record.id), record.id).toBe(true);
      }
    }
    for (const scene of [...birthdayImageSlots, ...laterScenes]) {
      expect(scene.path).toBe(`src/第四幕/${scene.assetId.slice(7, 10)}/${scene.assetId}.png`);
    }
    expect(act4AssetPath('IMG_A4_T05_001', 'other.png')).toBeNull();
  });
});

describe('first act art registration', () => {
  it('keeps existing first-act images available', () => {
    for (const id of ['IMG_A1_D_001', 'IMG_A1_G_001', 'IMG_A1_I_001']) {
      expect(assetLoader.isAvailable(id), id).toBe(true);
    }
  });
});

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
