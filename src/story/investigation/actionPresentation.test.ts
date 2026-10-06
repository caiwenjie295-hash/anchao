import { describe, expect, it } from 'vitest';
import type { Act3ActiveStage } from '../../core/types';
import { act3StageDoc } from '../../data/act3Data';
import { act3HotspotActionLabel, act3RouteActionLabel, act3StageActionLabel } from './actionPresentation';

describe('third-act action labels', () => {
  it('keeps observation markers distinct from movement across every stage', () => {
    const stages: Act3ActiveStage[] = ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'];
    for (const stage of stages) {
      for (const lens of act3StageDoc(stage).lenses) {
        for (const hotspot of lens.hotspots) {
          const label = act3HotspotActionLabel(stage, hotspot.clueId, hotspot.label, []);
          expect(label).not.toMatch(/^(?:前往|进入|走进|跟着.+进入|穿过|与小月一起离开|继续向|走向)/);
        }
        for (const route of lens.routes) {
          const label = act3RouteActionLabel(route.kind);
          const targetTitle = act3StageDoc(stage).lenses.find((target) => target.id === route.target)?.title;
          expect(label).toBe(route.kind === 'return' ? '沿原路返回' : '继续探索');
          if (targetTitle) expect(label).not.toContain(targetTitle);
        }
      }
    }
  });

  it('keeps the archive-room hotspot as an observation and stage closure as its own action', () => {
    expect(act3HotspotActionLabel('T04', 'CLUE_A3_T04_EMPTY_ROOM', '走进空档案室', [])).toBe('看看屋内');
    expect(act3RouteActionLabel('move')).toBe('继续探索');
    expect(act3RouteActionLabel('return')).toBe('沿原路返回');
    expect(act3StageActionLabel()).toBe('离开这里，继续探索');
  });
});
