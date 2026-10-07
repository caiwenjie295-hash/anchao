import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import type { Act3Hotspot, Act3Lens } from '../../core/types';
import { cropOffsetPercent, SceneObservationCrop, resolveSceneObservationCrop } from './SceneObservationCrop';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('scene observation close crops', () => {
  it('maps the drain + to its mother photograph and a crop around the lower concrete channel', () => {
    const lens = { id: 'LENS_A3_T00_010', title: '拨泥见沟', assetId: 'IMG_A3_T00_010' } as Act3Lens;
    const hotspot = { clueId: 'CLUE_A3_T00_DRAIN_DISCOVERED', label: '记下排水沟在此' } as Act3Hotspot;
    expect(resolveSceneObservationCrop(lens, hotspot)).toEqual({ assetId: 'IMG_A3_T00_010', focusX: 0.38, focusY: 0.67, zoom: 2.5 });

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      act(() => root.render(<SceneObservationCrop source={resolveSceneObservationCrop(lens, hotspot)!} alt="排水沟局部" />));
      const crop = host.querySelector<HTMLElement>('.scene-polish-observation-crop')!;
      expect(crop.dataset.assetId).toBe('IMG_A3_T00_010');
      expect(crop.dataset.cropCenter).toBe('0.38,0.67');
      expect(crop.dataset.cropRange).toBe('40%');
      expect(host.querySelector('img')?.style.left).toBe('-45%');
      expect(host.querySelector('img')?.style.top).toBe('-117.5%');
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });

  it('uses the active mother image coordinates for other clues with a registered photo marker', () => {
    const lens = { id: 'LENS_A3_T00_009', title: '山下水痕', assetId: 'IMG_A3_T00_009' } as Act3Lens;
    const hotspot = { clueId: 'CLUE_A3_T00_WATER_ODDITY', label: '水痕' } as Act3Hotspot;
    expect(resolveSceneObservationCrop(lens, hotspot)).toEqual({ assetId: 'IMG_A3_T00_009', focusX: 0.57, focusY: 0.54, zoom: 2.4 });
  });

  it('clamps edge-hotspot crops to the source photo bounds without changing their centers', () => {
    const breaker = resolveSceneObservationCrop(
      { id: 'LENS_A3_T01_006', assetId: 'IMG_A3_T01_006' } as Act3Lens,
      { clueId: 'CLUE_A3_T01_BREAKER_OPTIONAL' } as Act3Hotspot,
    )!;
    const caveTalk = resolveSceneObservationCrop(
      { id: 'LENS_A3_T00_007', assetId: 'IMG_A3_T00_007' } as Act3Lens,
      { clueId: 'CLUE_A3_T00_CAVE_TALK' } as Act3Hotspot,
    )!;
    expect(cropOffsetPercent(breaker.focusX, breaker.zoom)).toBe(-140);
    expect(cropOffsetPercent(caveTalk.focusX, caveTalk.zoom)).toBe(0);
    expect(cropOffsetPercent(0.38, 2.5)).toBe(-45);
    expect(cropOffsetPercent(0.67, 2.5)).toBe(-117.5);
  });
});
