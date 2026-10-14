export const act4IllustrationDetailsBySource = {
  IMG_A4_T05_001: 'IMG_A4_ZOOM_T05_001',
  IMG_A4_T05_002: 'IMG_A4_ZOOM_T05_002',
  IMG_A4_T05_003: 'IMG_A4_ZOOM_T05_003',
  IMG_A4_T05_005: 'IMG_A4_ZOOM_T05_005',
  IMG_A4_T05_006: 'IMG_A4_ZOOM_T05_006',
  IMG_A4_T06_002: 'IMG_A4_ZOOM_T06_002',
  IMG_A4_T06_004: 'IMG_A4_ZOOM_T06_004',
  IMG_A4_T06_005: 'IMG_A4_ZOOM_T06_005',
  IMG_A4_T06_007: 'IMG_A4_ZOOM_T06_007',
  IMG_A4_T07_001: 'IMG_A4_ZOOM_T07_001',
  IMG_A4_T07_004: 'IMG_A4_ZOOM_T07_004',
  IMG_A4_T07_005: 'IMG_A4_ZOOM_T07_005',
  IMG_A4_T08_001: 'IMG_A4_ZOOM_T08_001',
  IMG_A4_T08_002: 'IMG_A4_ZOOM_T08_002',
  IMG_A4_T08_011: 'IMG_A4_ZOOM_T08_011',
  IMG_A4_T08_003: 'IMG_A4_ZOOM_T08_003',
  IMG_A4_T08_004: 'IMG_A4_ZOOM_T08_004',
  IMG_A4_T08_006: 'IMG_A4_ZOOM_T08_006',
  IMG_A4_T08_005: 'IMG_A4_ZOOM_T08_005',
  IMG_A4_T08_007: 'IMG_A4_ZOOM_T08_007',
  IMG_A4_T08_008: 'IMG_A4_ZOOM_T08_008',
  IMG_A4_READING_DETAIL_001: 'IMG_A4_ZOOM_READING_DETAIL_001',
  IMG_A4_T08_010: 'IMG_A4_ZOOM_T08_010',
  IMG_A4_FINALE_FEAR_001: 'IMG_A4_ZOOM_FINALE_FEAR_001',
  IMG_A4_T08_012: 'IMG_A4_ZOOM_T08_012',
  IMG_A4_T09_002: 'IMG_A4_ZOOM_T09_002',
  IMG_A4_T09_003: 'IMG_A4_ZOOM_T09_003',
  IMG_A4_T09_001: 'IMG_A4_ZOOM_T09_001',
  IMG_A4_T09_004: 'IMG_A4_ZOOM_T09_004',
  IMG_A4_T09_005: 'IMG_A4_ZOOM_T09_005',
  IMG_A4_FINAL_READING_001: 'IMG_A4_ZOOM_FINAL_READING_001',
  IMG_A4_T01_001: 'IMG_A4_ZOOM_T01_001',
  IMG_A4_T10_003: 'IMG_A4_ZOOM_T10_003',
} as const;

const act4ZoomDetailAssetIds = Object.values(act4IllustrationDetailsBySource);
const act4ZoomDetailsBySource = new Map<string, string>(Object.entries(act4IllustrationDetailsBySource));
const act4ZoomDetailAssetIdSet: ReadonlySet<string> = new Set(act4ZoomDetailAssetIds);

export const act4IllustrationZoomDetailAssetIds: readonly string[] = act4ZoomDetailAssetIds;

export const act4IllustrationDetailAssetIdForSource = (sourceAssetId: string): string | undefined =>
  act4ZoomDetailsBySource.get(sourceAssetId);

export const isAct4IllustrationZoomDetailAssetId = (assetId: string): boolean =>
  act4ZoomDetailAssetIdSet.has(assetId);
