import { describe, expect, it } from 'vitest';
import { birthdayImageSlots } from './assets';
import { laterScenes } from './laterContent';
import { act4PhotoLayout } from './act4PhotoLayout';

describe('fourth act photographic navigation', () => {
  it('covers each fixed image slot with independent, reachable markers', () => {
    const ids = ['IMG_A4_T01_001', ...birthdayImageSlots.map(slot => slot.assetId), ...laterScenes.map(scene => scene.assetId)];
    expect(ids).toHaveLength(40);
    expect(new Set(ids).size).toBe(40);
    expect(Object.keys(act4PhotoLayout).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const { focus, route, details } = act4PhotoLayout[id];
      for (const marker of [focus, route, ...(details ?? [])]) {
        expect(marker.label.length).toBeGreaterThan(0);
        expect(marker.x).toBeGreaterThanOrEqual(.1);
        expect(marker.x).toBeLessThanOrEqual(.92);
        expect(marker.y).toBeGreaterThanOrEqual(.1);
        expect(marker.y).toBeLessThanOrEqual(.9);
      }
      expect(new Set([focus.label, route.label, ...(details ?? []).map(point => point.label)]).size).toBe(2 + (details?.length ?? 0));
    }
    for (const id of ['IMG_A4_T01_001', 'IMG_A4_T05_006', 'IMG_A4_T06_002', 'IMG_A4_T06_004', 'IMG_A4_T08_008', 'IMG_A4_T08_009', 'IMG_A4_T08_010', 'IMG_A4_T09_002', 'IMG_A4_T10_002', 'IMG_A4_T10_005']) {
      expect(act4PhotoLayout[id].details?.length).toBeGreaterThan(0);
      expect(act4PhotoLayout[id].details?.every(point => point.note)).toBe(true);
    }
  });
});
