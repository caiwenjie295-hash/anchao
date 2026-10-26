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

  it('aligns the ruined temple photo with both original scene records before descent', () => {
    const state = createDefaultState();
    const scene = sceneById.get('SCENE_A1_I_001')!;
    const hotspots = hotspotsBySceneId.get(scene.id)!;

    const noneFound = scenePhotoGuidance(scene, hotspots, state)!;
    expect(noneFound.canCapture).toBe(false);
    expect(noneFound.reason).toContain('到达“山腰破庙”');
    expect(noneFound.reason).toContain('“补”');
    expect(noneFound.continueReason).toBe('保存现场照片后才能下山。');

    state.game.flags.FLAG_A1_TEMPLE_FOUND = true;
    const arrivalOnly = scenePhotoGuidance(scene, hotspots, state)!;
    expect(arrivalOnly.canCapture).toBe(false);
    expect(arrivalOnly.reason).toContain('“补”');
    expect(arrivalOnly.reason).not.toContain('到达');
    expect(arrivalOnly.continueReason).toBe('保存现场照片后才能下山。');

    state.game.flags.FLAG_A1_TEMPLE_FOUND = false;
    state.game.flags.FLAG_A1_BU_FOUND = true;
    const buOnly = scenePhotoGuidance(scene, hotspots, state)!;
    expect(buOnly.canCapture).toBe(false);
    expect(buOnly.reason).toContain('到达“山腰破庙”');
    expect(buOnly.reason).not.toContain('“补”');
    expect(buOnly.continueReason).toBe('保存现场照片后才能下山。');

    state.game.flags.FLAG_A1_TEMPLE_FOUND = true;
    const ready = scenePhotoGuidance(scene, hotspots, state)!;
    expect(ready.canCapture).toBe(true);
    expect(ready.reason).toContain('可以保存');
    expect(ready.continueReason).toBe('保存现场照片后才能下山。');

    state.modules.scene.capturedPhotoIds.push(scene.capturePhotoId!);
    state.game.flags.FLAG_A1_TEMPLE_PHOTO_TAKEN = true;
    const saved = scenePhotoGuidance(scene, hotspots, state)!;
    expect(saved.captured).toBe(true);
    expect(saved.canCapture).toBe(false);
    expect(saved.buttonLabel).toBe('照片已保存');
    expect(saved.continueReason).toBe('');
  });

  it('does not make an environment hotspot a photo or descent requirement', () => {
    const state = createDefaultState();
    state.game.flags.FLAG_A1_TEMPLE_FOUND = true;
    state.game.flags.FLAG_A1_BU_FOUND = true;
    const scene = sceneById.get('SCENE_A1_I_001')!;
    const hotspots = hotspotsBySceneId.get(scene.id)!;
    const environmentHotspot = {
      ...hotspots[0],
      id: 'TEST_A1_I_OPTIONAL_ENVIRONMENT',
      hotspotKind: 'environment' as const,
      triggerFlags: ['FLAG_A1_OPTIONAL_ENVIRONMENT_TEST'],
    };

    const guidance = scenePhotoGuidance(scene, [...hotspots, environmentHotspot], state)!;
    expect(guidance.canCapture).toBe(true);
    expect(guidance.reason).toContain('可以保存');
    expect(guidance.continueReason).toBe('保存现场照片后才能下山。');
  });
});
