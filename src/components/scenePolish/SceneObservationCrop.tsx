import { useState } from 'react';
import type { Act3Hotspot, Act3Lens } from '../../core/types';
import { assetLoader } from '../../core/assetLoader';
import { act3PhotoLayout } from '../../data/act3PhotoLayout';

export interface SceneObservationCropSource {
  assetId: string;
  focusX: number;
  focusY: number;
  zoom: number;
}

export function cropOffsetPercent(focus: number, zoom: number): number {
  const offset = (0.5 - focus * zoom) * 100;
  return Number(Math.max(100 - zoom * 100, Math.min(0, offset)).toFixed(3));
}

/** Focuses a close crop on the real photograph coordinates already used by the + marker. */
export function resolveSceneObservationCrop(lens: Act3Lens, hotspot: Act3Hotspot): SceneObservationCropSource | null {
  if (hotspot.clueId === 'CLUE_A3_T00_DRAIN_DISCOVERED') {
    return { assetId: 'IMG_A3_T00_010', focusX: 0.38, focusY: 0.67, zoom: 2.5 };
  }
  const point = act3PhotoLayout[lens.id]?.[hotspot.clueId];
  return point ? { assetId: lens.assetId, focusX: point.x, focusY: point.y, zoom: 2.4 } : null;
}

export function SceneObservationCrop({ source, alt }: { source: SceneObservationCropSource; alt: string }) {
  const [failed, setFailed] = useState(false);
  const image = assetLoader.get(source.assetId)?.src;
  const left = cropOffsetPercent(source.focusX, source.zoom);
  const top = cropOffsetPercent(source.focusY, source.zoom);
  return <figure
    className="scene-polish-observation-crop"
    data-asset-id={source.assetId}
    data-crop-center={`${source.focusX},${source.focusY}`}
    data-crop-range={`${Math.round(100 / source.zoom)}%`}
    data-crop-zoom={source.zoom}
  >
    {image && !failed
      ? <div className="scene-polish-observation-crop__frame"><img
        src={image}
        alt={alt}
        onError={() => setFailed(true)}
        style={{ left: `${left}%`, top: `${top}%`, width: `${source.zoom * 100}%`, height: `${source.zoom * 100}%` }}
      /></div>
      : <div className="scene-polish-observation-crop__fallback" role="status">照片暂时无法显示，观察记录仍保留。</div>}
    <figcaption>{alt}</figcaption>
  </figure>;
}
