import { getAvatarSprite, sprites, type SpriteName } from '../data/spriteData';

type SpriteIconProps = { name: SpriteName; className?: string };
type AvatarSpriteProps = { assetId: string; className?: string };
const SpriteImage = ({ source, x, y, width, height, imageWidth, imageHeight, className }: { source: string; x: number; y: number; width: number; height: number; imageWidth: number; imageHeight: number; className?: string }) => <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false"><image href={source} x={-x} y={-y} width={imageWidth} height={imageHeight} /></svg>;

export function SpriteIcon({ name, className }: SpriteIconProps) { return <SpriteImage {...sprites[name]} className={`sprite-icon${className ? ` ${className}` : ''}`} />; }
export function AvatarSprite({ assetId, className }: AvatarSpriteProps) {
  const sprite = getAvatarSprite(assetId);
  return sprite ? <SpriteImage {...sprite} className={`avatar-sprite${className ? ` ${className}` : ''}`} /> : null;
}
