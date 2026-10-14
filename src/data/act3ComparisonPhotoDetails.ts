const act3ComparisonPhotoDetailsBySource = {
  IMG_A1_I_003: 'IMG_A3_COMPARE_STATUE_DETAIL_001',
  IMG_A3_T06_007: 'IMG_A3_DETAIL_T06_EMPTY_BASE',
} as const;

const detailAssetIds = new Map<string, string>(Object.entries(act3ComparisonPhotoDetailsBySource));

export const act3ComparisonPhotoDetailAssetId = (sourceAssetId: string): string | undefined =>
  detailAssetIds.get(sourceAssetId);
