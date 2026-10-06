import { useState } from 'react';
import { AvatarSprite } from './SpriteIcon';
import { visualIdentityImageSources, type VisualIdentityImageId } from '../data/visualIdentityData';
import { VisualIcon, type VisualIconName } from './VisualIcon';

export function VisualAvatar({
  className,
  fallbackIcon,
  imageId,
  spriteAssetId,
  tone = 0,
}: {
  className?: string;
  fallbackIcon: VisualIconName;
  imageId?: VisualIdentityImageId;
  spriteAssetId?: 'IMG_A1_B_010';
  tone?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = imageId ? visualIdentityImageSources[imageId] : undefined;
  return <span
    className={`visual-avatar visual-avatar--tone-${tone % 6}${className ? ` ${className}` : ''}`}
    aria-hidden="true"
  >
    <VisualIcon name={fallbackIcon} className="visual-avatar__fallback" />
    {imageSrc && !imageFailed && <img className="visual-avatar__image" src={imageSrc} alt="" draggable={false} onError={() => setImageFailed(true)} />}
    {spriteAssetId && <AvatarSprite assetId={spriteAssetId} className="visual-avatar__sprite" />}
  </span>;
}
