import imagesDocument from '../../data/images.json';
import flagsDocument from '../../data/flags.json';
import scenesDocument from '../../data/scene_act1.json';
import hotspotsDocument from '../../data/scene_hotspots.json';

export type TraceableRecord = { id: string; title: string; act: number; phase: string; source: string; purpose: string; unlockCondition: string[]; relatedFlags: string[]; notes: string };
export type SceneKind = 'trail' | 'cave' | 'temple';
export type VisualVariant = 'trailhead' | 'forest-road' | 'creek' | 'cave-wall' | 'ruined-temple';
export type HotspotKind = 'environment' | 'graffiti' | 'aw-mark' | 'temple-object' | 'bu-mark';
export type SceneRecord = TraceableRecord & { sceneKind: SceneKind; backgroundAssetId: string; description: string; ambience: string; visualVariant: VisualVariant; nextSceneId: string | null; requiredFlagIds: string[]; capturePhotoId: string | null; continueLabel: string; blockedObservation: string | null; journeyIntro?: string };
export type SceneHotspot = TraceableRecord & { sceneId: string; hotspotKind: HotspotKind; label: string; observation: string; position: { x: number; y: number; width: number; height: number }; triggerFlags: string[]; imageAssetId?: string };
type Collection<T> = { schemaVersion: number; items: T[] };

const asItems = <T>(document: unknown, name: string): T[] => {
  if (typeof document !== 'object' || document === null || !Array.isArray((document as Collection<T>).items)) throw new Error(`${name} 必须包含 items 数组。`);
  return (document as Collection<T>).items;
};

export const act1Scenes = asItems<SceneRecord>(scenesDocument, 'scene_act1.json');
export const act1SceneHotspots = asItems<SceneHotspot>(hotspotsDocument, 'scene_hotspots.json');
const images = asItems<{ id: string; assetType?: string }>(imagesDocument, 'images.json');
const flags = asItems<{ id: string }>(flagsDocument, 'flags.json');
export const sceneById = new Map(act1Scenes.map((scene) => [scene.id, scene]));
export const hotspotById = new Map(act1SceneHotspots.map((hotspot) => [hotspot.id, hotspot]));
export const hotspotsBySceneId = new Map(act1Scenes.map((scene) => [scene.id, act1SceneHotspots.filter((hotspot) => hotspot.sceneId === scene.id)]));

const traceable = (record: TraceableRecord): boolean => Boolean(record.id && record.title && record.act === 1 && record.phase && record.source && record.purpose && record.notes && Array.isArray(record.unlockCondition) && Array.isArray(record.relatedFlags));
const includesRegisteredFlags = (flagIds: string[]) => flagIds.every((flagId) => flags.some((flag) => flag.id === flagId));
const validPosition = ({ x, y, width, height }: SceneHotspot['position']): boolean => [x, y, width, height].every(Number.isFinite) && x >= 0 && y >= 0 && x < 100 && y < 100 && width > 0 && height > 0 && x + width <= 100 && y + height <= 100;

export function validateSceneData(): void {
  if (act1Scenes.length !== 5 || new Set(act1Scenes.map((scene) => scene.id)).size !== act1Scenes.length) throw new Error('第一幕场景数量或 ID 无效。');
  const orderedIds = ['SCENE_A1_G_001', 'SCENE_A1_G_002', 'SCENE_A1_G_003', 'SCENE_A1_H_001', 'SCENE_A1_I_001'];
  if (act1Scenes.map((scene) => scene.id).join('|') !== orderedIds.join('|')) throw new Error('第一幕场景顺序必须保持冻结路线。');
  for (const scene of act1Scenes) {
    if (!traceable(scene) || !['trail', 'cave', 'temple'].includes(scene.sceneKind) || !['trailhead', 'forest-road', 'creek', 'cave-wall', 'ruined-temple'].includes(scene.visualVariant) || !scene.description || !scene.ambience || !scene.continueLabel || (scene.blockedObservation !== null && !scene.blockedObservation)) throw new Error(`场景字段无效：${scene.id}`);
    if (!images.some((image) => image.id === scene.backgroundAssetId)) throw new Error(`${scene.id} 背景资源未登记。`);
    if (scene.nextSceneId !== null && !sceneById.has(scene.nextSceneId)) throw new Error(`${scene.id} 指向未知的下一场景。`);
    if (!includesRegisteredFlags([...scene.relatedFlags, ...scene.requiredFlagIds])) throw new Error(`${scene.id} 引用了未登记 Flag。`);
    if (scene.capturePhotoId !== null && !images.some((image) => image.id === scene.capturePhotoId)) throw new Error(`${scene.id} 拍摄资源未登记。`);
    if ((scene.sceneKind === 'cave' || scene.sceneKind === 'temple') && scene.capturePhotoId === null) throw new Error(`${scene.id} 必须包含照片占位。`);
  }
  if (!['IMG_A1_G_001', 'IMG_A1_G_002', 'IMG_A1_G_003', 'IMG_A1_H_001', 'IMG_A1_H_002', 'IMG_A1_H_003', 'IMG_A1_I_001', 'IMG_A1_I_002', 'IMG_A1_I_003', 'IMG_A1_I_004'].every((id) => images.some((image) => image.id === id))) throw new Error('第一幕图片登记不完整。');
  const hotspotIds = new Set<string>();
  for (const hotspot of act1SceneHotspots) {
    if (!traceable(hotspot) || hotspotIds.has(hotspot.id) || !sceneById.has(hotspot.sceneId) || !['environment', 'graffiti', 'aw-mark', 'temple-object', 'bu-mark'].includes(hotspot.hotspotKind) || !hotspot.label || !hotspot.observation || !validPosition(hotspot.position) || !includesRegisteredFlags([...hotspot.relatedFlags, ...hotspot.triggerFlags])) throw new Error(`热点字段无效：${hotspot.id}`);
    hotspotIds.add(hotspot.id);
    if (hotspot.imageAssetId && !images.some((image) => image.id === hotspot.imageAssetId)) throw new Error(`${hotspot.id} 特写资源未登记。`);
    if ((hotspot.hotspotKind === 'environment' || hotspot.hotspotKind === 'graffiti' || hotspot.hotspotKind === 'temple-object') && hotspot.triggerFlags.length !== 0) throw new Error(`普通热点不得写入 Flag：${hotspot.id}`);
  }
  for (const scene of act1Scenes) if ((hotspotsBySceneId.get(scene.id)?.length ?? 0) < 3) throw new Error(`${scene.id} 至少需要三个热点。`);
  const caveHotspots = hotspotsBySceneId.get('SCENE_A1_H_001') ?? [];
  if (caveHotspots.filter((hotspot) => hotspot.hotspotKind === 'graffiti' || hotspot.hotspotKind === 'aw-mark').length < 12 || caveHotspots.filter((hotspot) => hotspot.hotspotKind === 'aw-mark').length !== 1) throw new Error('山洞留言墙数量或 A.W 标记无效。');
  const templeHotspots = hotspotsBySceneId.get('SCENE_A1_I_001') ?? [];
  if (templeHotspots.filter((hotspot) => hotspot.hotspotKind === 'bu-mark').length !== 1) throw new Error('破庙必须只有一个“补”字热点。');
}

validateSceneData();
