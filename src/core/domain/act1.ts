import { hotspotById, hotspotsBySceneId, sceneById, act1Scenes } from '../../data/sceneData';
import { isSymbolVisible } from '../../data/photoData';
import type { AppState } from '../types';
import { domainChange, noDomainChange, type DomainTransition } from './transitions';
import { setFlag } from './applications';

export function startJourney(state: AppState, sceneId: string): DomainTransition {
  if (state.game.phase !== 'F' || state.modules.scene.journeyStarted || sceneId !== act1Scenes[0]?.id) return noDomainChange(state);
  const scene = state.modules.scene;
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, scene: { ...scene, journeyStarted: true, currentSceneId: sceneId, visitedSceneIds: [...new Set([...scene.visitedSceneIds, sceneId])] } },
  }, [{ type: 'journey:started', payload: { sceneId } }]);
}

export function enterScene(state: AppState, sceneId: string): DomainTransition {
  const scene = state.modules.scene;
  const current = scene.currentSceneId ? sceneById.get(scene.currentSceneId) : null;
  if (!scene.journeyStarted || !current || current.nextSceneId !== sceneId || !current.requiredFlagIds.every((flagId) => state.game.flags[flagId] === true)) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, scene: { ...scene, currentSceneId: sceneId, visitedSceneIds: [...new Set([...scene.visitedSceneIds, sceneId])] } },
  }, [{ type: 'scene:entered', payload: { sceneId } }]);
}

export function inspectSceneHotspot(state: AppState, hotspotId: string): DomainTransition {
  const scene = state.modules.scene;
  const hotspot = hotspotById.get(hotspotId);
  if (!scene.journeyStarted || hotspot?.sceneId !== scene.currentSceneId || scene.inspectedHotspotIds.includes(hotspotId)) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, scene: { ...scene, inspectedHotspotIds: [...scene.inspectedHotspotIds, hotspotId] } },
  }, [{ type: 'scene:hotspot-inspected', payload: { hotspotId } }]);
}

export function captureScenePhoto(state: AppState, sceneId: string, photoId: string): DomainTransition {
  const scene = state.modules.scene;
  const current = sceneById.get(sceneId);
  const triggerFlags = [...new Set((hotspotsBySceneId.get(sceneId) ?? []).flatMap((hotspot) => hotspot.triggerFlags))];
  if (!scene.journeyStarted || scene.currentSceneId !== sceneId || current?.capturePhotoId !== photoId
    || !triggerFlags.every((flagId) => state.game.flags[flagId] === true) || scene.capturedPhotoIds.includes(photoId)) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, scene: { ...scene, capturedPhotoIds: [...scene.capturedPhotoIds, photoId] } },
  }, [{ type: 'scene:photo-captured', payload: { sceneId, photoId } }]);
}

export function finishJourney(state: AppState, lastSceneId: string): DomainTransition {
  const scene = state.modules.scene;
  const current = sceneById.get(lastSceneId);
  if (!scene.journeyStarted || scene.currentSceneId !== lastSceneId || current?.nextSceneId !== null
    || !current.requiredFlagIds.every((flagId) => state.game.flags[flagId] === true)) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, scene: { ...scene, journeyStarted: false, currentSceneId: null } },
  }, [{ type: 'journey:finished', payload: { lastSceneId } }]);
}

export function openPhotoEditor(state: AppState, photoId: string): DomainTransition {
  if (!state.modules.scene.capturedPhotoIds.includes(photoId)) return noDomainChange(state);
  const photos = state.modules.photos;
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, photos: { ...photos, activePhotoId: photoId, openedPhotoIds: [...new Set([...photos.openedPhotoIds, photoId])] } },
  }, [{ type: 'photo:editor-opened', payload: { photoId } }]);
}

export function setPhotoAdjustment(state: AppState, photoId: string, adjustment: 'exposure' | 'shadows' | 'contrast', value: number): DomainTransition {
  if (!state.modules.scene.capturedPhotoIds.includes(photoId) || !Number.isFinite(value)) return noDomainChange(state);
  const photos = state.modules.photos;
  const current = photos.adjustments[photoId] ?? { exposure: 0, shadows: 0, contrast: 0 };
  const nextValue = Math.max(-100, Math.min(100, Math.round(value)));
  if (current[adjustment] === nextValue) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, photos: { ...photos, adjustments: { ...photos.adjustments, [photoId]: { ...current, [adjustment]: nextValue } } } },
  }, [{ type: 'photo:adjusted', payload: { photoId } }], undefined, 'deferred');
}

export function inspectPhotoSymbol(state: AppState, photoId: string): DomainTransition {
  const adjustment = state.modules.photos.adjustments[photoId] ?? { exposure: 0, shadows: 0, contrast: 0 };
  if (photoId !== 'IMG_A1_H_003' || !state.modules.scene.capturedPhotoIds.includes(photoId)
    || !isSymbolVisible(adjustment) || state.modules.photos.inspectedSymbolPhotoIds.includes(photoId)) return noDomainChange(state);
  const photos = state.modules.photos;
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, photos: { ...photos, inspectedSymbolPhotoIds: [...photos.inspectedSymbolPhotoIds, photoId] } },
  }, [{ type: 'photo:symbol-inspected', payload: { photoId } }]);
}

export function setPhotoZoom(state: AppState, photoId: string, zoom: number): DomainTransition {
  if (!state.modules.scene.capturedPhotoIds.includes(photoId) || !Number.isFinite(zoom)) return noDomainChange(state);
  const photos = state.modules.photos;
  const nextZoom = Math.max(1, Math.min(2.5, Math.round(zoom * 10) / 10));
  if (photos.zoomByPhotoId[photoId] === nextZoom) return noDomainChange(state);
  return domainChange(state, {
    ...state,
    modules: { ...state.modules, photos: { ...photos, zoomByPhotoId: { ...photos.zoomByPhotoId, [photoId]: nextZoom } } },
  }, [], undefined, 'deferred');
}

export function finishFirstAct(state: AppState): DomainTransition {
  if (state.game.phase !== 'K' || state.game.flags.FLAG_A1_SS_CLUE_RECORDED !== true) return noDomainChange(state);
  return setFlag(state, 'FLAG_A1_COMPLETE', true);
}
