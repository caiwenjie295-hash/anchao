import { describe, expect, it } from 'vitest';
import { act3T00, act3T01, act3T02, act3T03, act3T04, act3T05, act3T06, act3T07 } from './act3Data';
import { act3PhotoLayout } from './act3PhotoLayout';

describe('third-act photo layout', () => {
  it('places every authored clue within the photograph', () => {
    const lenses = [act3T00, act3T01, act3T02, act3T03, act3T04, act3T05, act3T06, act3T07].flatMap(doc => doc.lenses);
    const clues = lenses.flatMap(lens => lens.hotspots.map(hotspot => ({ lens, hotspot })));
    expect(clues).toHaveLength(59);
    for (const { lens, hotspot } of clues) {
      const point = act3PhotoLayout[lens.id]?.[hotspot.clueId];
      expect(point, hotspot.clueId).toBeDefined();
      expect(point.x).toBeGreaterThanOrEqual(0.05);
      expect(point.x).toBeLessThanOrEqual(0.95);
      expect(point.y).toBeGreaterThanOrEqual(0.05);
      expect(point.y).toBeLessThanOrEqual(0.95);
    }
  });
});
