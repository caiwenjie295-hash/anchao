import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { hotspotsBySceneId, sceneById } from '../../data/sceneData';
import { optionalEnvironmentHint, scenePhotoGuidance } from './act1InteractionGuidance';

describe('Act 1 scene interaction guidance', () => {
  it('marks trailhead, forest and creek environment observations as optional', () => {
    for (const sceneId of ['SCENE_A1_G_001', 'SCENE_A1_G_002', 'SCENE_A1_G_003']) {
      const hotspots = hotspotsBySceneId.get(sceneId)!;
      expect(optionalEnvironmentHint(hotspots)).toContain('可选');
      expect(scenePhotoGuidance(sceneById.get(sceneId)!, hotspots, createDefaultState())).toBeNull();
    }
  });

  it('names the one missing required observation, then confirms a saved photo', () => {
    const state = createDefaultState();
    const scene = sceneById.get('SCENE_A1_H_001')!;
    const hotspots = hotspotsBySceneId.get(scene.id)!;

    const blocked = scenePhotoGuidance(scene, hotspots, state)!;
    expect(blocked.canCapture).toBe(false);
    expect(blocked.reason).toContain('A.W');
    expect(blocked.continueReason).not.toContain('A.W');
    expect(blocked.continueReason).toBe('保存现场照片后才能继续前行。');

    state.game.flags.FLAG_A1_AW_FOUND = true;
    const ready = scenePhotoGuidance(scene, hotspots, state)!;
    expect(ready.canCapture).toBe(true);
    expect(ready.reason).toContain('可以保存');
    expect(ready.continueReason).toBe('保存现场照片后才能继续前行。');

    state.modules.scene.capturedPhotoIds.push(scene.capturePhotoId!);
    state.game.flags.FLAG_A1_AW_PHOTO_TAKEN = true;
    const saved = scenePhotoGuidance(scene, hotspots, state)!;
    expect(saved.captured).toBe(true);
    expect(saved.buttonLabel).toBe('照片已保存');
    expect(saved.canCapture).toBe(false);
    expect(saved.continueReason).toBe('');
  });
});
