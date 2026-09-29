import images from '../../data/images.json';

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

const photoFiles = import.meta.glob<string>('../Photo_src/*.png', { eager: true, query: '?url&no-inline', import: 'default' });
const act2Files = import.meta.glob<string>('../第二幕/*.jpg', { eager: true, query: '?url&no-inline', import: 'default' });
const act3JpgFiles = import.meta.glob<string>('../第三幕/IMG_A3_*.jpg', { eager: true, query: '?url&no-inline', import: 'default' });
const act3PngFiles = import.meta.glob<string>('../第三幕/IMG_A3_*.png', { eager: true, query: '?url&no-inline', import: 'default' });
const act4PngFiles = import.meta.glob<string>('../第四幕/T*/*.png', { eager: true, query: '?url&no-inline', import: 'default' });
const imageRecords = images.items as { id: string; file?: string }[];
export const act4AssetPath = (id: string, file: string): string | null => {
  const match = /^IMG_A4_(T(?:01|05|06|07|08|09|10))_\d{3}$/.exec(id);
  return match && file === `${id}.png` ? `../第四幕/${match[1]}/${file}` : null;
};
export const assetLoader = new AssetLoader(Object.fromEntries(imageRecords.filter((image) => image.file).map((image) => [image.id, {
  id: image.id, type: 'image', src: photoFiles[`../Photo_src/${image.file}`] ?? act2Files[`../第二幕/${image.file}`]
    ?? act3JpgFiles[`../第三幕/${image.file}`] ?? act3PngFiles[`../第三幕/${image.file}`]
    ?? act4PngFiles[act4AssetPath(image.id, image.file!) ?? ''],
}])));
