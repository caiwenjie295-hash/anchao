import { describe, expect, it } from 'vitest';
import images from '../../data/images.json';
import { birthdayImageSlots } from '../data/act4/assets';
import { laterScenes } from '../data/act4/laterContent';
import { act4IllustrationZoomDetailAssetIds } from '../data/narrative/act4IllustrationDetails';
import { act4AssetPath, assetLoader, uxFinaleA4AssetPath, uxInvestigationAssetPath, uxRhythmA4AssetPath } from './assetLoader';
import { act3StageClueIds, type AuthoredAct3Stage } from '../data/act3Data';

describe('fourth act art registration', () => {
  it('preserves the existing A4 registrations and registers dedicated zoom details', () => {
    const deliveredFiles = import.meta.glob('../第四幕/T*/*.png');
    const records = images.items.filter((item) => item.id.startsWith('IMG_A4_'));
    const expected = [
      'IMG_A4_T01_001',
      ...birthdayImageSlots.map((slot) => slot.assetId),
      ...laterScenes.map((scene) => scene.assetId),
      'IMG_A4_T06_007', 'IMG_A4_T08_011', 'IMG_A4_T08_012',
      'IMG_A4_BLOG_WINDOW_001', 'IMG_A4_FINAL_READING_001', 'IMG_A4_READING_DETAIL_001',
    ];
    const existingRecords = records.filter((record) => expected.includes(record.id));
    expect(new Set(expected).size).toBe(expected.length);
    expect(existingRecords.map((record) => record.id).sort()).toEqual([...expected].sort());
    for (const record of existingRecords) {
      const path = act4AssetPath(record.id, record.file) ?? uxRhythmA4AssetPath(record.id, record.file);
      expect(path, record.id).not.toBeNull();
      expect(assetLoader.get(record.id)?.id).toBe(record.id);
      if (path! in deliveredFiles) {
        expect(assetLoader.isAvailable(record.id), record.id).toBe(true);
      }
    }
    for (const scene of [...birthdayImageSlots, ...laterScenes]) {
      expect(scene.path).toBe(`src/第四幕/${scene.assetId.slice(7, 10)}/${scene.assetId}.png`);
    }
    for (const id of ['IMG_A4_T06_007', 'IMG_A4_T08_011', 'IMG_A4_T08_012']) {
      expect(assetLoader.get(id)?.id, id).toBe(id);
      expect(assetLoader.isAvailable(id), id).toBe(true);
    }
    expect(act4AssetPath('IMG_A4_T05_001', 'other.png')).toBeNull();
    for (const id of ['IMG_A4_BLOG_WINDOW_001', 'IMG_A4_FINAL_READING_001', 'IMG_A4_READING_DETAIL_001']) {
      expect(uxRhythmA4AssetPath(id, `${id}.png`)).toBe(`../第四幕/UX-RHYTHM/${id}.png`);
      expect(assetLoader.isAvailable(id), id).toBe(true);
    }
    for (const id of act4IllustrationZoomDetailAssetIds) {
      const record = records.find((item) => item.id === id);
      expect(record, id).toBeDefined();
      expect(record?.file, id).toBe(`${id}.webp`);
      expect(uxInvestigationAssetPath(id, record?.file ?? ''), id)
        .toBe(`../assets/ux-investigation-20261014/${id}.webp`);
      expect(assetLoader.get(id)?.id, id).toBe(id);
    }
    expect(uxRhythmA4AssetPath('IMG_A4_UNREGISTERED_001', 'IMG_A4_UNREGISTERED_001.png')).toBeNull();
    expect(uxRhythmA4AssetPath('IMG_A4_BLOG_WINDOW_001', 'wrong.png')).toBeNull();
  });
});

describe('first act art registration', () => {
  it('keeps existing first-act images available', () => {
    for (const id of ['IMG_A1_D_001', 'IMG_A1_G_001', 'IMG_A1_I_001']) {
      expect(assetLoader.isAvailable(id), id).toBe(true);
    }
  });
});

describe('UX finale artwork registration', () => {
  it('serves the four approved finale WebP assets without adding them to the legacy image manifest', () => {
    const ids = [
      'IMG_A4_FINALE_FEAR_001',
      'IMG_A4_FINALE_DOOR_001',
      'IMG_A4_FINALE_DOOR_002',
      'IMG_A4_FINALE_SURROUND_001',
    ];
    const records = images.items.map((image) => image.id);
    for (const id of ids) {
      expect(records).not.toContain(id);
      expect(uxFinaleA4AssetPath(id, `${id}.webp`)).toBe(`../assets/ux-finale-20261008/${id}.webp`);
      expect(assetLoader.get(id)?.id).toBe(id);
      expect(assetLoader.get(id)?.src).toMatch(new RegExp(`ux-finale-20261008/${id}\\.webp`));
      expect(assetLoader.isAvailable(id)).toBe(true);
    }
    expect(uxFinaleA4AssetPath('IMG_A4_FINALE_UNKNOWN_001', 'IMG_A4_FINALE_UNKNOWN_001.webp')).toBeNull();
    expect(uxFinaleA4AssetPath(ids[0], 'different.webp')).toBeNull();
  });
});

describe('UX investigation artwork paths', () => {
  it('maps only the frozen investigation IDs to the isolated WebP directory', () => {
    const schoolIds = [
      'IMG_A2_SCHOOL_MAP_001', 'IMG_A2_SCHOOL_BUILDING_001', 'IMG_A2_SCHOOL_GATE_001', 'IMG_A2_SCHOOL_CORRIDOR_001',
      'IMG_A2_SCHOOL_XIAOA_001', 'IMG_A2_SCHOOL_XIAOYUE_001', 'IMG_A2_SCHOOL_RESTROOM_001',
      'IMG_A2_SCHOOL_HONOR_001', 'IMG_A2_SCHOOL_OFFICE_001', 'IMG_A2_SCHOOL_NOTICE_001',
      'IMG_A2_SCHOOL_DORM_001', 'IMG_A2_SCHOOL_PLAYGROUND_001', 'IMG_A2_SCHOOL_COURTYARD_001',
      'IMG_A2_SCHOOL_NOTE_001', 'IMG_A2_SCHOOL_NOTE_DETAIL_001', 'IMG_A2_SCHOOL_RANK_PAPER_001',
    ];
    const clueIds = (['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'] as AuthoredAct3Stage[]).flatMap(act3StageClueIds);
    const ids = [
      ...schoolIds,
      'IMG_A2_T07_TRAIL_WALK_001', 'IMG_A3_SIGN_FULL_001', 'IMG_A3_BOARD_FULL_001',
      ...clueIds.map((id) => `IMG_A3_DETAIL_${id.slice('CLUE_A3_'.length)}`),
      'IMG_A3_COMPARE_STATUE_DETAIL_001', ...act4IllustrationZoomDetailAssetIds,
    ];
    expect(ids).toHaveLength(112);
    expect(new Set(ids).size).toBe(112);
    for (const id of ids) expect(uxInvestigationAssetPath(id, `${id}.webp`)).toBe(`../assets/ux-investigation-20261014/${id}.webp`);
    expect(uxInvestigationAssetPath('IMG_A3_DETAIL_UNKNOWN', 'IMG_A3_DETAIL_UNKNOWN.webp')).toBeNull();
    expect(uxInvestigationAssetPath(ids[0], 'wrong.png')).toBeNull();
  });
});

describe('second act art registration', () => {
  it('resolves every supplied or generated second-act image locally', () => {
    for (const id of ['IMG_A2_T02_001', 'IMG_A2_T03_001', ...Array.from({ length: 11 }, (_, index) => `IMG_A2_T05_${String(index + 1).padStart(3, '0')}`), 'IMG_A2_T03_002', 'IMG_A2_T03_003', 'IMG_A2_T05_012']) {
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
    expect(assetLoader.get('IMG_A3_T06_009')?.id).toBe('IMG_A3_T06_009');
    expect(assetLoader.isAvailable('IMG_A3_T06_009')).toBe(true);
  });
});
