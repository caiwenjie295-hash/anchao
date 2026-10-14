import { describe, expect, it } from 'vitest';
import imageDocument from '../../data/images.json';
import { ACT3_DETAIL_IMAGE_ID_BY_CLUE, ACT3_REQUIRED_EVIDENCE, act3DetailImageIdForClue, act3FirstLensId, act3RequiredClueIds, act3StageClueIds, act3StageDoc, type AuthoredAct3Stage } from './act3Data';

describe('third-act authored lens graph', () => {
  it('keeps each stage navigable with registered resource IDs and unique clues', () => {
    const imageIds = new Set([...imageDocument.items.map((image) => image.id), 'IMG_A3_SIGN_FULL_001', 'IMG_A3_BOARD_FULL_001']);
    for (const stage of ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'] as AuthoredAct3Stage[]) {
      const doc = act3StageDoc(stage);
      const lensIds = new Set(doc.lenses.map((lens) => lens.id));
      expect(doc.stage).toBe(stage);
      expect(lensIds.size).toBe(doc.lenses.length);
      expect(lensIds.has(act3FirstLensId(stage))).toBe(true);
      expect(act3StageClueIds(stage).length).toBeGreaterThan(0);
      for (const lens of doc.lenses) {
        expect(imageIds.has(lens.assetId), lens.id).toBe(true);
        for (const route of lens.routes) {
          expect(lensIds.has(route.target), `${lens.id} → ${route.target}`).toBe(true);
          expect(route.actionId).toMatch(/^A3_ROUTE_/);
          expect(route.label.trim().length).toBeGreaterThan(0);
          expect(['move', 'return']).toContain(route.kind);
        }
        expect(lens.links).toEqual(lens.routes.map((route) => route.target));
        for (const clueId of lens.requiresClueIds ?? []) expect(act3StageClueIds(stage)).toContain(clueId);
      }
    }
  });

  it('maps every clue to one distinct authored detail image ID', () => {
    const clueIds = (['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'] as AuthoredAct3Stage[]).flatMap(act3StageClueIds);
    const imageIds = clueIds.map((clueId) => act3DetailImageIdForClue(clueId));
    expect(clueIds).toHaveLength(59);
    expect(imageIds).toHaveLength(59);
    expect(new Set(imageIds).size).toBe(59);
    expect(Object.keys(ACT3_DETAIL_IMAGE_ID_BY_CLUE)).toHaveLength(59);
    for (const clueId of clueIds) expect(act3DetailImageIdForClue(clueId)).toBe(`IMG_A3_DETAIL_${clueId.slice('CLUE_A3_'.length)}`);
  });

  it('declares a small, reasoned core evidence set for every stage', () => {
    for (const stage of ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'] as AuthoredAct3Stage[]) {
      expect(ACT3_REQUIRED_EVIDENCE[stage].length).toBeGreaterThan(0);
      expect(act3RequiredClueIds(stage)).toEqual(ACT3_REQUIRED_EVIDENCE[stage].map(({ clueId }) => clueId));
      for (const item of ACT3_REQUIRED_EVIDENCE[stage]) {
        expect(act3StageClueIds(stage)).toContain(item.clueId);
        expect(item.reason.trim().length).toBeGreaterThan(8);
      }
      expect(act3RequiredClueIds(stage).length).toBeLessThan(act3StageClueIds(stage).length);
    }
  });

  it('keeps the archive paper words exact and locked behind the crouched view', () => {
    const doc = act3StageDoc('T04');
    const paper = doc.lenses.find((lens) => lens.id === 'LENS_A3_T04_005')!;
    expect(paper.requiresClueIds).toEqual(['CLUE_A3_T04_PAPER_EDGE']);
    expect(paper.description).toContain('VVaKe');
    for (const word of ['蜘蛛', '雨伞', '白走廊', '台灯', '风车', '曼陀罗']) expect(paper.description).toContain(word);
    expect(doc.lenses.slice(0, 4).some((lens) => lens.description.includes('VVaKe'))).toBe(false);
  });

  it('keeps the broadcast paper words exact and locked behind the low view', () => {
    const doc = act3StageDoc('T05');
    const paper = doc.lenses.find((lens) => lens.id === 'LENS_A3_T05_005')!;
    expect(paper.requiresClueIds).toEqual(['CLUE_A3_T05_PAPER_EDGE']);
    expect(paper.description).toContain('13aCK');
    for (const word of ['老鼠', '血', '草垛', '木房子', '玫瑰', '表']) expect(paper.description).toContain(word);
    expect(doc.lenses.slice(0, 4).some((lens) => lens.description.includes('13aCK'))).toBe(false);
  });

  it('gates the upstairs shrine comparison on inspected kitchen evidence', () => {
    const doc = act3StageDoc('T06');
    const compare = doc.lenses.find((lens) => lens.id === 'LENS_A3_T06_008')!;
    expect(compare.requiresClueIds).toEqual(['CLUE_A3_T06_SHRINE', 'CLUE_A3_T06_EMPTY_BASE']);
    expect(compare.description).toContain('破庙');
    expect(compare.description).toContain('仍是当时的联想');
    expect(compare.description).toContain('塑像的去向没有答案');
    expect(compare.description).not.toContain('塑像的去向已经确认');
  });

  it('reveals the notebook only after Xiaoyue’s hint and crouched inspection', () => {
    const doc = act3StageDoc('T07');
    expect(doc.lenses.find((lens) => lens.id === 'LENS_A3_T07_005')?.requiresClueIds).toEqual(['CLUE_A3_T07_XIAOYUE_MEMORY']);
    expect(doc.lenses.find((lens) => lens.id === 'LENS_A3_T07_006')?.requiresClueIds).toEqual(['CLUE_A3_T07_BACK_GAP']);
    expect(doc.lenses.find((lens) => lens.id === 'LENS_A3_T07_007')?.requiresClueIds).toEqual(['CLUE_A3_T07_NOTEBOOK_PICKUP']);
    expect(doc.lenses[6].description).toContain('A.W');
    expect(doc.lenses[2].description).not.toContain('包裹');
  });
});
