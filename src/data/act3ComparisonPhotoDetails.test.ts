import { describe, expect, it } from 'vitest';
import { act3ComparisonPhotoDetailAssetId } from './act3ComparisonPhotoDetails';

describe('third-act comparison photo details', () => {
  it('opens each panorama in its separately registered close-up', () => {
    expect(act3ComparisonPhotoDetailAssetId('IMG_A1_I_003')).toBe('IMG_A3_COMPARE_STATUE_DETAIL_001');
    expect(act3ComparisonPhotoDetailAssetId('IMG_A3_T06_007')).toBe('IMG_A3_DETAIL_T06_EMPTY_BASE');
    expect(act3ComparisonPhotoDetailAssetId('IMG_A3_T06_006')).toBeUndefined();
  });
});
