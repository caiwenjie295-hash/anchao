import { assetLoader } from '../../core/assetLoader';

export function Act4SceneImage({ assetId, alt }: { assetId: string; alt: string }) {
  const src = assetLoader.get(assetId)?.src;
  return src ? <img className="a4-scene__image" src={src} alt={alt} /> : null;
}
