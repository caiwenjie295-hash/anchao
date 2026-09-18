import { describe, expect, it } from 'vitest';
import { act1SceneHotspots, act1Scenes, hotspotsBySceneId, sceneById, validateSceneData } from './sceneData';

describe('scene data', () => {
  it('keeps the five-stop route and validated references intact', () => {
    expect(() => validateSceneData()).not.toThrow();
    expect(act1Scenes.map((scene) => scene.id)).toEqual(['SCENE_A1_G_001', 'SCENE_A1_G_002', 'SCENE_A1_G_003', 'SCENE_A1_H_001', 'SCENE_A1_I_001']);
    expect(sceneById.get('SCENE_A1_H_001')?.capturePhotoId).toBe('IMG_A1_H_003');
    expect(sceneById.get('SCENE_A1_I_001')?.capturePhotoId).toBe('IMG_A1_I_004');
  });

  it('keeps ordinary hotspots flag-free and key wall marks unique', () => {
    expect(act1SceneHotspots.filter((hotspot) => ['environment', 'graffiti', 'temple-object'].includes(hotspot.hotspotKind)).every((hotspot) => hotspot.triggerFlags.length === 0)).toBe(true);
    const cave = hotspotsBySceneId.get('SCENE_A1_H_001') ?? [];
    const temple = hotspotsBySceneId.get('SCENE_A1_I_001') ?? [];
    expect(cave.filter((hotspot) => hotspot.hotspotKind === 'graffiti' || hotspot.hotspotKind === 'aw-mark')).toHaveLength(14);
    expect(cave.filter((hotspot) => hotspot.hotspotKind === 'aw-mark')).toHaveLength(1);
    expect(temple.filter((hotspot) => hotspot.hotspotKind === 'bu-mark')).toHaveLength(1);
  });
});
