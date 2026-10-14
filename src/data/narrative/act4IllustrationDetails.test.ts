import { describe, expect, it } from 'vitest';
import { act4IllustrationDetailAssetIdForSource, act4IllustrationDetailsBySource } from './act4IllustrationDetails';

describe('fourth-act illustration close-ups', () => {
  it('maps all 33 existing zoom entrances to their dedicated registered details', () => {
    const expectedSources = [
      'IMG_A4_T05_001', 'IMG_A4_T05_002', 'IMG_A4_T05_003', 'IMG_A4_T05_005', 'IMG_A4_T05_006',
      'IMG_A4_T06_002', 'IMG_A4_T06_004', 'IMG_A4_T06_005', 'IMG_A4_T06_007',
      'IMG_A4_T07_001', 'IMG_A4_T07_004', 'IMG_A4_T07_005',
      'IMG_A4_T08_001', 'IMG_A4_T08_002', 'IMG_A4_T08_011', 'IMG_A4_T08_003', 'IMG_A4_T08_004',
      'IMG_A4_T08_006', 'IMG_A4_T08_005', 'IMG_A4_T08_007', 'IMG_A4_T08_008', 'IMG_A4_T08_010', 'IMG_A4_T08_012',
      'IMG_A4_READING_DETAIL_001', 'IMG_A4_FINALE_FEAR_001',
      'IMG_A4_T09_002', 'IMG_A4_T09_003', 'IMG_A4_T09_001', 'IMG_A4_T09_004', 'IMG_A4_T09_005',
      'IMG_A4_FINAL_READING_001', 'IMG_A4_T01_001', 'IMG_A4_T10_003',
    ];
    expect(Object.keys(act4IllustrationDetailsBySource).sort()).toEqual(expectedSources.sort());
    for (const [sourceAssetId, detailAssetId] of Object.entries(act4IllustrationDetailsBySource)) {
      expect(act4IllustrationDetailAssetIdForSource(sourceAssetId)).toBe(detailAssetId);
      expect(detailAssetId).toBe(`IMG_A4_ZOOM_${sourceAssetId.slice('IMG_A4_'.length)}`);
    }
    expect(act4IllustrationDetailAssetIdForSource('IMG_A4_UNREGISTERED_001')).toBeUndefined();
  });
});
