import ui1 from '../UI_src/UI1.png?url&no-inline';
import ui2 from '../UI_src/UI2.png?url&no-inline';
import ui3 from '../UI_src/UI3.png?url&no-inline';
import ui4 from '../UI_src/UI4.png?url&no-inline';
import wechat1 from '../Wechat_src/Wechat1.png?url&no-inline';
import wechat2 from '../Wechat_src/Wechat2.png?url&no-inline';

export type SpriteName = 'app-wechat' | 'app-mail' | 'app-browser' | 'app-explorer' | 'app-notepad' | 'app-photos' | 'window-minimize' | 'window-maximize' | 'window-restore' | 'window-close' | 'file-image' | 'file-document' | 'attachment';
type Sprite = { source: string; x: number; y: number; width: number; height: number; imageWidth: number; imageHeight: number };

const ui1Icon = (x: number, y: number, width: number, height: number): Sprite => ({ source: ui1, x, y, width, height, imageWidth: 1254, imageHeight: 1254 });
const ui2Icon = (x: number, y: number, width: number, height: number): Sprite => ({ source: ui2, x, y, width, height, imageWidth: 1254, imageHeight: 1254 });
const ui3Icon = (x: number): Sprite => ({ source: ui3, x, y: 195, width: 225, height: 235, imageWidth: 1254, imageHeight: 1254 });

export const sprites: Record<SpriteName, Sprite> = {
  'app-wechat': ui2Icon(35, 710, 300, 270), 'app-mail': ui1Icon(32, 540, 290, 285), 'app-browser': ui1Icon(640, 193, 290, 300),
  'app-explorer': ui1Icon(930, 550, 300, 280), 'app-notepad': ui1Icon(640, 530, 280, 300), 'app-photos': ui1Icon(330, 548, 290, 280),
  'window-minimize': ui3Icon(35), 'window-maximize': ui3Icon(276), 'window-restore': ui3Icon(517), 'window-close': ui3Icon(991),
  'file-image': { source: ui4, x: 30, y: 900, width: 230, height: 250, imageWidth: 1254, imageHeight: 1254 },
  'file-document': { source: ui4, x: 290, y: 890, width: 230, height: 260, imageWidth: 1254, imageHeight: 1254 },
  attachment: { source: ui4, x: 1030, y: 665, width: 185, height: 180, imageWidth: 1254, imageHeight: 1254 },
};

export type AvatarAssetId = `IMG_A1_B_${string}`;
const avatarCells: Record<AvatarAssetId, Sprite> = {
  IMG_A1_B_001: { source: wechat1, x: 217, y: 675, width: 320, height: 320, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_002: { source: wechat1, x: 1000, y: 10, width: 320, height: 320, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_003: { source: wechat2, x: 1035, y: 20, width: 310, height: 310, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_004: { source: wechat1, x: 610, y: 675, width: 320, height: 320, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_005: { source: wechat2, x: 181, y: 20, width: 310, height: 310, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_006: { source: wechat2, x: 1035, y: 689, width: 310, height: 310, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_007: { source: ui2, x: 35, y: 710, width: 300, height: 270, imageWidth: 1254, imageHeight: 1254 },
  IMG_A1_B_008: { source: wechat1, x: 610, y: 10, width: 320, height: 320, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_009: { source: wechat1, x: 1000, y: 675, width: 320, height: 320, imageWidth: 1536, imageHeight: 1024 },
  IMG_A1_B_010: { source: wechat2, x: 611, y: 20, width: 310, height: 310, imageWidth: 1536, imageHeight: 1024 },
};

export const getAvatarSprite = (assetId: string): Sprite | undefined => avatarCells[assetId as AvatarAssetId];
