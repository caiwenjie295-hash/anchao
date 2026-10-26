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

export function scenePhotoGuidance(
  scene: SceneRecord,
  hotspots: readonly SceneHotspot[],
  state: AppState,
): Act1PhotoGuidance | null {
  if (!scene.capturePhotoId) return null;
  const captured = state.modules.scene.capturedPhotoIds.includes(scene.capturePhotoId);
  const requiredHotspots = hotspots.filter((hotspot) => hotspot.hotspotKind !== 'environment' && hotspot.triggerFlags.length > 0);
  const missingHotspots = requiredHotspots.filter((hotspot) => hotspot.triggerFlags.some((flagId) => state.game.flags[flagId] !== true));
  const canCapture = !captured && missingHotspots.length === 0;
  const reason = captured
    ? `“${scene.title}”照片已保存。`
    : missingHotspots.length > 0
      ? `先查看${missingHotspots.map((hotspot) => `“${hotspot.label}”`).join('、')}，再拍摄这张照片。`
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
