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

const photoFiles = import.meta.glob<string>('../Photo_src/*.png', { eager: true, query: '?url', import: 'default' });
const imageRecords = images.items as { id: string; file?: string }[];
export const assetLoader = new AssetLoader(Object.fromEntries(imageRecords.filter((image) => image.file).map((image) => [image.id, {
  id: image.id, type: 'image', src: photoFiles[`../Photo_src/${image.file}`],
}])));
