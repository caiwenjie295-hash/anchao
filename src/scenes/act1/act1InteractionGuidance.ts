import type { AppState } from '../../core/types';
import type { SceneHotspot, SceneRecord } from '../../data/sceneData';

export interface Act1PhotoGuidance {
  canCapture: boolean;
  captured: boolean;
  buttonLabel: string;
  reason: string;
  continueReason: string;
}

export function optionalEnvironmentHint(hotspots: readonly SceneHotspot[]): string | null {
  const optionalCount = hotspots.filter((hotspot) => hotspot.hotspotKind === 'environment').length;
  return optionalCount > 0
    ? '环境观察是可选的；它不会成为拍照或继续前行的条件。'
    : null;
}

function requiredSceneFlagAction(scene: SceneRecord, flagId: string): string {
  if (flagId === 'FLAG_A1_TEMPLE_FOUND') return `确认已到达“${scene.title}”`;
  return '完成现场记录';
}

export function scenePhotoGuidance(
  scene: SceneRecord,
  hotspots: readonly SceneHotspot[],
  state: AppState,
): Act1PhotoGuidance | null {
  if (!scene.capturePhotoId) return null;
  const captured = state.modules.scene.capturedPhotoIds.includes(scene.capturePhotoId);
  const requiredHotspots = hotspots.filter((hotspot) => hotspot.hotspotKind !== 'environment' && hotspot.triggerFlags.length > 0);
  const requiredHotspotFlags = new Set(requiredHotspots.flatMap((hotspot) => hotspot.triggerFlags));
  const photoTakenFlags = new Set(scene.requiredFlagIds.filter((flagId) => flagId.endsWith('_PHOTO_TAKEN')));
  const requiredObservationFlags = new Set([
    ...requiredHotspotFlags,
    ...scene.requiredFlagIds.filter((flagId) => !photoTakenFlags.has(flagId)),
  ]);
  const missingObservationFlags = [...requiredObservationFlags].filter((flagId) => state.game.flags[flagId] !== true);
  const missingHotspots = requiredHotspots.filter((hotspot) => hotspot.triggerFlags.some((flagId) => missingObservationFlags.includes(flagId)));
  const hotspotFlags = new Set(requiredHotspots.flatMap((hotspot) => hotspot.triggerFlags));
  const missingSceneFlags = scene.requiredFlagIds.filter((flagId) =>
    !photoTakenFlags.has(flagId) && !hotspotFlags.has(flagId) && state.game.flags[flagId] !== true,
  );
  const canCapture = !captured && missingObservationFlags.length === 0;
  const missingActions = [
    ...missingSceneFlags.map((flagId) => requiredSceneFlagAction(scene, flagId)),
    ...missingHotspots.map((hotspot) => `查看“${hotspot.label}”`),
  ];
  const reason = captured
    ? `“${scene.title}”照片已保存。`
    : missingActions.length > 0
      ? `先${missingActions.join('、')}，再拍摄这张照片。`
      : `可以保存“${scene.title}”的现场照片。`;

  const missingRequiredFlags = scene.requiredFlagIds.filter((flagId) => state.game.flags[flagId] !== true);
  const requiredPhotoMissing = missingRequiredFlags.length > 0 && !captured;
  const continueReason = missingRequiredFlags.length === 0
    ? ''
    : requiredPhotoMissing && scene.capturePhotoId
      ? `保存现场照片后才能${scene.continueLabel}。`
      : '还有一项现场记录未完成，完成后才能继续。';

  return {
    canCapture,
    captured,
    buttonLabel: captured ? '照片已保存' : '拍一张',
    reason,
    continueReason,
  };
}
