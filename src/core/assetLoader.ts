import images from '../../data/images.json';
import compressedAssetMap from '../assets/compressed/asset-map.json';
import { isAct4IllustrationZoomDetailAssetId } from '../data/narrative/act4IllustrationDetails';

export interface AssetReference {
  id: string;
  type: 'image' | 'icon';
  src?: string;
}

/** Resource IDs remain stable when supplied art replaces a registered placeholder. */
export class AssetLoader {
  constructor(private readonly manifest: Record<string, AssetReference> = {}) {}

  get(assetId: string): AssetReference | null {
    return this.manifest[assetId] ?? null;
  }

  isAvailable(assetId: string): boolean {
    return Boolean(this.get(assetId)?.src);
  }
}

const compressedFiles = import.meta.glob<string>('../assets/compressed/**/*.{webp,png,jpg,jpeg}', { eager: true, query: '?url&no-inline', import: 'default' });
const uxFinaleFiles = import.meta.glob<string>('../assets/ux-finale-20261008/*.webp', { eager: true, query: '?url&no-inline', import: 'default' });
const uxInvestigationFiles = import.meta.glob<string>('../assets/ux-investigation-20261014/*.webp', { eager: true, query: '?url&no-inline', import: 'default' });
const uiFieldFiles = import.meta.glob<string>('../assets/ui-field-20261019/*.webp', { eager: true, query: '?url&no-inline', import: 'default' });
const t07RefFiles = import.meta.glob<string>('../assets/t07-ref-20261020/*.webp', { eager: true, query: '?url&no-inline', import: 'default' });
const compressedEntries = compressedAssetMap.entries as Record<string, string>;
const compressedSource = (sourcePath: string | null): string | undefined => {
  if (!sourcePath) return undefined;
  const outputPath = compressedEntries[sourcePath];
  return outputPath ? compressedFiles[`../assets/compressed/${outputPath}`] : undefined;
};
const imageRecords = images.items as { id: string; file?: string }[];
export const act4AssetPath = (id: string, file: string): string | null => {
  const match = /^IMG_A4_(T(?:01|05|06|07|08|09|10))_\d{3}$/.exec(id);
  return match && file === `${id}.png` ? `../第四幕/${match[1]}/${file}` : null;
};
const uxRhythmA4ImageIds = new Set([
  'IMG_A4_BLOG_WINDOW_001',
  'IMG_A4_FINAL_READING_001',
  'IMG_A4_READING_DETAIL_001',
]);
export const uxRhythmA4AssetPath = (id: string, file: string): string | null =>
  uxRhythmA4ImageIds.has(id) && file === `${id}.png` ? `../第四幕/UX-RHYTHM/${file}` : null;
const uxFinaleA4ImageIds = [
  'IMG_A4_FINALE_FEAR_001',
  'IMG_A4_FINALE_RETREAT_001',
  'IMG_A4_FINALE_DOOR_001',
  'IMG_A4_FINALE_DOOR_002',
  'IMG_A4_FINALE_SURROUND_001',
] as const;
export const uxFinaleA4AssetPath = (id: string, file: string): string | null =>
  uxFinaleA4ImageIds.includes(id as typeof uxFinaleA4ImageIds[number]) && file === `${id}.webp`
    ? `../assets/ux-finale-20261008/${file}`
    : null;
const isUxInvestigationAssetId = (id: string): boolean =>
  /^IMG_A2_SCHOOL_(?:MAP|BUILDING|GATE|CORRIDOR|XIAOA|XIAOYUE|RESTROOM|HONOR|OFFICE|NOTICE|NOTE|NOTE_DETAIL|RANK_PAPER|COURTYARD|PLAYGROUND|DORM)_001$/.test(id)
  || id === 'IMG_A2_T07_TRAIL_WALK_001'
  || id === 'IMG_A3_SIGN_FULL_001'
  || id === 'IMG_A3_BOARD_FULL_001'
  || id === 'IMG_A3_COMPARE_STATUE_DETAIL_001'
  || isAct4IllustrationZoomDetailAssetId(id)
  || /^IMG_A3_DETAIL_T0[0-7]_[A-Z0-9_]+$/.test(id);
export const uxInvestigationAssetPath = (id: string, file: string): string | null =>
  isUxInvestigationAssetId(id) && file === `${id}.webp`
    ? `../assets/ux-investigation-20261014/${file}`
    : null;
const isUiFieldAssetId = (id: string): boolean =>
  id === 'IMG_A2_SCHOOL_RANK_RECORD_001' || id === 'IMG_A2_SCHOOL_QIMING_THANKS_001';
export const uiFieldAssetPath = (id: string, file: string): string | null =>
  isUiFieldAssetId(id) && file === `${id}.webp`
    ? `../assets/ui-field-20261019/${file}`
    : null;
export const t07RefAssetPath = (id: string, file: string): string | null =>
  id === 'IMG_A2_T07_TRAIL_REFERENCE_001' && file === `${id}.webp`
    ? `../assets/t07-ref-20261020/${file}`
    : null;
const existingAssets = imageRecords.filter((image) => image.file).map((image) => [image.id, {
  id: image.id, type: 'image', src: compressedSource(`../Photo_src/${image.file}`) ?? compressedSource(`../第二幕/${image.file}`)
    ?? compressedSource(`../第三幕/${image.file}`) ?? compressedSource(act4AssetPath(image.id, image.file!))
    ?? compressedSource(uxRhythmA4AssetPath(image.id, image.file!)),
}]);
const uxFinaleAssets = uxFinaleA4ImageIds.map((id) => [id, {
  id, type: 'image' as const, src: uxFinaleFiles[`../assets/ux-finale-20261008/${id}.webp`],
}]);
const uxInvestigationAssets = imageRecords.flatMap((image) => {
  if (!image.file) return [];
  const path = uxInvestigationAssetPath(image.id, image.file);
  return path ? [[image.id, { id: image.id, type: 'image' as const, src: uxInvestigationFiles[path] }] as const] : [];
});
const uiFieldAssets = imageRecords.flatMap((image) => {
  if (!image.file) return [];
  const path = uiFieldAssetPath(image.id, image.file);
  return path ? [[image.id, { id: image.id, type: 'image' as const, src: uiFieldFiles[path] }] as const] : [];
});
const t07RefAssets = imageRecords.flatMap((image) => {
  if (!image.file) return [];
  const path = t07RefAssetPath(image.id, image.file);
  return path ? [[image.id, { id: image.id, type: 'image' as const, src: t07RefFiles[path] }] as const] : [];
});
export const assetLoader = new AssetLoader(Object.fromEntries([...existingAssets, ...uxFinaleAssets, ...uxInvestigationAssets, ...uiFieldAssets, ...t07RefAssets]));
