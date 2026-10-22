import { describe, expect, it } from 'vitest';
import { act3StageDoc, type AuthoredAct3Stage } from './act3Data';
import { act3PhotoLayout } from './act3PhotoLayout';

const stages: AuthoredAct3Stage[] = ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'];

describe('Act 3 photo-only hotspot layout', () => {
  it('keeps an independently reviewed image region for every authored hotspot', () => {
    const authored = stages.flatMap((stage) => act3StageDoc(stage).lenses.flatMap((lens) =>
      lens.hotspots.map((hotspot) => ({ lens, hotspot }))));
    const configured = Object.entries(act3PhotoLayout).flatMap(([lensId, points]) =>
      Object.entries(points).map(([clueId, point]) => ({ lensId, clueId, point })));

    expect(authored).toHaveLength(59);
    expect(configured).toHaveLength(59);
    for (const { lens, hotspot } of authored) {
      const point = act3PhotoLayout[lens.id]?.[hotspot.clueId];
      expect(point, `${lens.id} / ${hotspot.clueId}`).toBeDefined();
      expect(point?.region, `${lens.id} / ${hotspot.clueId} region`).toBeDefined();
      expect(point?.x).toBeGreaterThanOrEqual(0);
      expect(point?.x).toBeLessThanOrEqual(1);
      expect(point?.y).toBeGreaterThanOrEqual(0);
      expect(point?.y).toBeLessThanOrEqual(1);
      expect(point!.region!.width).toBeGreaterThan(0);
      expect(point!.region!.width).toBeLessThanOrEqual(1);
      expect(point!.region!.height).toBeGreaterThan(0);
      expect(point!.region!.height).toBeLessThanOrEqual(1);
      expect(point!.x - point!.region!.width / 2).toBeGreaterThanOrEqual(0);
      expect(point!.x + point!.region!.width / 2).toBeLessThanOrEqual(1);
      expect(point!.y - point!.region!.height / 2).toBeGreaterThanOrEqual(0);
      expect(point!.y + point!.region!.height / 2).toBeLessThanOrEqual(1);
    }
    expect(configured.every(({ lensId, clueId }) =>
      authored.some(({ lens, hotspot }) => lens.id === lensId && hotspot.clueId === clueId))).toBe(true);
  });

  it('keeps same-photo hotspots on separate visual targets', () => {
    for (const [lensId, points] of Object.entries(act3PhotoLayout)) {
      const entries = Object.entries(points);
      for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
          const [leftId, left] = entries[leftIndex]!;
          const [rightId, right] = entries[rightIndex]!;
          const leftRegion = left.region!;
          const rightRegion = right.region!;
          const overlapX = Math.min(left.x + leftRegion.width / 2, right.x + rightRegion.width / 2)
            - Math.max(left.x - leftRegion.width / 2, right.x - rightRegion.width / 2);
          const overlapY = Math.min(left.y + leftRegion.height / 2, right.y + rightRegion.height / 2)
            - Math.max(left.y - leftRegion.height / 2, right.y - rightRegion.height / 2);
          expect(overlapX > 0 && overlapY > 0, `${lensId}: ${leftId} / ${rightId}`).toBe(false);
        }
      }
    }
  });

  it('keeps the T02 speaker target under the photo toolbar while covering the speaker and plate', () => {
    const speaker = act3PhotoLayout.LENS_A3_T02_005?.CLUE_A3_T02_SLOGAN_SPEAKER;
    expect(speaker).toMatchObject({ x: 0.8, y: 0.18, region: { width: 0.27, height: 0.35 } });
    expect(speaker!.y - speaker!.region!.height / 2).toBeCloseTo(0.005, 6);
  });
});
